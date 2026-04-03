import logging
import cv2
import numpy as np
import base64
from datetime import datetime
from typing import List, Optional, Literal
from dataclasses import dataclass
import torch

from parakh_ai.pipeline.preprocessing import Preprocessor
from parakh_ai.core.heatmap import generate_heatmap, BBox
from parakh_ai.storage.model_store import ModelStore
from parakh_ai.storage.defect_log import DefectLog
from parakh_ai.core.exceptions import InferenceError

logger = logging.getLogger(__name__)

@dataclass
class InferenceResponse:
    session_id: str
    timestamp: datetime
    anomaly_score: float
    is_defective: bool
    severity: Literal['PASS', 'WARN', 'FAIL']
    heatmap_b64: Optional[str]
    defect_bboxes: List[BBox]
    inference_time_ms: float
    model_version: str

class InferencePipeline:
    def __init__(self, model_store: ModelStore, defect_log: DefectLog):
        self.model_store = model_store
        self.defect_log = defect_log

    def infer_single(
        self, 
        image: np.ndarray, 
        session_id: str, 
        generate_heatmap_img: bool = True, 
        log_result: bool = True
    ) -> InferenceResponse:
        
        try:
            model, metadata = self.model_store.load_session(session_id)
        except Exception as e:
            raise InferenceError(f"Failed to load session {session_id}: {str(e)}")
            
        from parakh_ai.pipeline.preprocessing import IlluminationNormaliser, DINOv2ROIExtractor
        import yaml
        from pathlib import Path

        # ── Load config ────────────────────────────────────────────────────
        illum_method = "none"
        enforce_roi = False
        z_score_threshold = 3.0
        config_path = Path("parakh_ai/config/default.yaml")
        if config_path.exists():
            try:
                with open(config_path, "r") as f:
                    cfg = yaml.safe_load(f)
                infer_cfg = cfg.get("inference", {})
                method_str = infer_cfg.get("illum_norm_method", "none").lower()
                if method_str in ("clahe", "retinex", "clahe+retinex", "none"):
                    illum_method = method_str
                elif method_str == "clihe":
                    illum_method = "clahe"
                enforce_roi     = infer_cfg.get("enforce_roi_alignment", False)
                z_score_threshold = infer_cfg.get("z_score_threshold", 3.0)
            except Exception:
                pass

        illum_normaliser = IlluminationNormaliser(method=illum_method) if illum_method != "none" else None
        roi_extractor    = DINOv2ROIExtractor() if enforce_roi else None

        tensor = Preprocessor.preprocess_for_model(
            image,
            roi_extractor=roi_extractor,
            illum_normaliser=illum_normaliser,
        )

        try:
            result = model.predict(tensor)
        except Exception as e:
            raise InferenceError(f"Inference failed: {str(e)}")

        heatmap_b64 = None
        defect_bboxes = []
        severity = 'PASS'

        if generate_heatmap_img:
            # threshold in heatmap is now expressed in z-score units
            hm_res = generate_heatmap(image, result.anomaly_map,
                                      warn_threshold=z_score_threshold * 0.5,
                                      fail_threshold=z_score_threshold)

            severity = hm_res.severity
            defect_bboxes = hm_res.defect_bboxes
            
            # encode to b64
            _, buffer = cv2.imencode('.png', hm_res.overlay_image)
            heatmap_b64 = base64.b64encode(buffer).decode('utf-8')
        else:
            # Decide severity based on score generically
            warn_th, fail_th = 0.5, 0.75
            if result.anomaly_score >= fail_th:
                severity = 'FAIL'
            elif result.anomaly_score >= warn_th:
                severity = 'WARN'
        
        response = InferenceResponse(
            session_id=session_id,
            timestamp=datetime.utcnow(),
            anomaly_score=result.anomaly_score,
            is_defective=result.is_defective,
            severity=severity,
            heatmap_b64=heatmap_b64,
            defect_bboxes=defect_bboxes,
            inference_time_ms=result.inference_time_ms,
            model_version=metadata.model_type
        )
        
        if log_result:
            self.defect_log.log_inspection(response)
            
        return response

    def infer_batch(self, images: List[np.ndarray], session_id: str, batch_size: int = 8) -> List[InferenceResponse]:
        results = []
        for img in images:
            # Simplistic sequential iteration for now, batch support upstream can optimize this
            results.append(self.infer_single(img, session_id))
        return results
