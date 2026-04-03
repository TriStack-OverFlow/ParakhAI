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
