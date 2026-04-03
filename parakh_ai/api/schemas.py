from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime

class BBoxResponse(BaseModel):
    x: int
    y: int
    w: int
    h: int
    score: float
    area_px: int

class InferenceResponseModel(BaseModel):
    session_id: str
    timestamp: datetime
    anomaly_score: float
    is_defective: bool
    severity: str
    heatmap_b64: Optional[str] = None
    defect_bboxes: List[BBoxResponse] = []
    inference_time_ms: float
    model_version: str
    drift_status: Optional[str] = 'normal'
    drift_window_mean: Optional[float] = 0.0
    drift_window_std: Optional[float] = 0.0

class CalibrationResponseModel(BaseModel):
    session_id: str
    calibration_time_s: float
    n_images_used: int
    coreset_size: int
    threshold: float

class SessionMetadataResponse(BaseModel):
    session_id: str
    session_name: Optional[str] = None
    product_description: Optional[str] = None
    model_type: str
    backbone: str
    coreset_ratio: float
    n_calibration_images: Optional[int] = None
    calibration_time_s: Optional[float] = None
    threshold: float
    score_p50: float
    score_p99: float
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    # New optional field — None for classic single-class sessions
    subclass_labels: Optional[List[str]] = None

class DefectStatsResponse(BaseModel):
    defect_rate: float
    window_minutes: int
    total_inspected: int
