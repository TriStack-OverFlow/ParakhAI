import cv2
import numpy as np
from typing import List, Annotated
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Body

from parakh_ai.api.schemas import InferenceResponseModel
from parakh_ai.pipeline.inference import InferencePipeline
from parakh_ai.storage.model_store import ModelStore
from parakh_ai.storage.defect_log import DefectLog

router = APIRouter()

store = ModelStore()
log = DefectLog()
pipeline = InferencePipeline(store, log)

@router.post("", response_model=InferenceResponseModel)
async def infer_single(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    generate_heatmap: bool = Form(True)
):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file.")
        
    try:
        res = pipeline.infer_single(img, session_id, generate_heatmap)
        # BBoxes are BBox typed, but Pydantic should auto-marshal them from dict
        # Wait, the InferenceResponse is a raw dataclass from pipeline. We need to 
        # convert it or just return its dict
        
        return res.__dict__
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch", response_model=List[InferenceResponseModel])
async def infer_batch(
    files: List[UploadFile] = File(...),
    session_id: str = Form(...)
):
    images = []
    for f in files:
        c = await f.read()
        i = cv2.imdecode(np.frombuffer(c, np.uint8), cv2.IMREAD_COLOR)
        if i is not None:
            images.append(i)
            
    try:
        results = pipeline.infer_batch(images, session_id)
        return [r.__dict__ for r in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/accept")
async def accept_as_normal(
    file: UploadFile = File(...),
    session_id: str = Form(...),
):
    """
    Twist 1: Accepts a previously flagged image as normal, updating the 
    underlying PatchCore distribution and FAISS index via Welford's algorithm
    without full recalibration.
    """
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image file")

    try:
        model, metadata = pipeline.model_store.load_session(session_id)
        
        # Preprocess the same way inference does
        from parakh_ai.pipeline.preprocessing import Preprocessor, IlluminationNormaliser, DINOv2ROIExtractor
        illum_method = "none"
        enforce_roi = False
        import yaml
        from pathlib import Path
        config_path = Path("parakh_ai/config/default.yaml")
        if config_path.exists():
            try:
                with open(config_path, "r") as f:
                    cfg = yaml.safe_load(f)
                infer_cfg = cfg.get("inference", {})
                method_str = infer_cfg.get("illum_norm_method", "none").lower()
                if method_str in ("clahe", "retinex", "clahe+retinex", "none"):
                    illum_method = method_str
                enforce_roi = infer_cfg.get("enforce_roi_alignment", False)
            except Exception:
                pass
        
        illum_normaliser = IlluminationNormaliser(method=illum_method) if illum_method != "none" else None
        roi_extractor = DINOv2ROIExtractor() if enforce_roi else None
        
        tensor = Preprocessor.preprocess_for_model(
            image, roi_extractor=roi_extractor, illum_normaliser=illum_normaliser
        )

        # Run Accept-as-Normal math
        stats = model.accept_as_normal(tensor)
        
        # Save updated model
        model_dir = pipeline.model_store.storage_dir / session_id
        model.save(model_dir)

        return {"status": "success", "stats": stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
