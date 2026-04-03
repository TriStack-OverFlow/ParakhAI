import cv2
import uuid
import numpy as np
import asyncio
import yaml
from pathlib import Path
from typing import List, Dict, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from sse_starlette.sse import EventSourceResponse

from parakh_ai.pipeline.calibration import CalibrationPipeline
from parakh_ai.api.schemas import CalibrationResponseModel

def _get_pipeline() -> CalibrationPipeline:
    config_path = Path("parakh_ai/config/default.yaml")
    illum_norm_method = "none"
    enforce_roi_alignment = False
    normality_buffer_size = 50
    augmentation_enabled = True

    if config_path.exists():
        try:
            with open(config_path, "r") as f:
                cfg = yaml.safe_load(f)
            infer_cfg = cfg.get("inference", {})
            calib_cfg = cfg.get("calibration", {})

            method_str = infer_cfg.get("illum_norm_method", "none").lower()
            if method_str in ("clahe", "retinex", "clahe+retinex", "none"):
                illum_norm_method = method_str
            elif method_str == "clihe":
                illum_norm_method = "clahe"

            enforce_roi_alignment = infer_cfg.get("enforce_roi_alignment", False)
            normality_buffer_size = calib_cfg.get("normality_buffer_size", 50)
            augmentation_enabled = calib_cfg.get("augmentation_enabled", True)
        except Exception:
            pass

    return CalibrationPipeline(
        illum_norm_method=illum_norm_method,
        enforce_roi_alignment=enforce_roi_alignment,
        normality_buffer_size=normality_buffer_size,
        augmentation_enabled=augmentation_enabled,
        augmentation_multiplier=4,
    )

router = APIRouter()
pipeline = _get_pipeline()

# ── In-memory stores ──────────────────────────────────────────────────────────
# progress: task_id → progress dict
_progress: Dict[str, dict] = {}

# staged: session_name → { subclass_label → [np.ndarray, ...] }
# Used only for multi-subclass (SubclassAwarePatchCore) calibration flow.
_staged: Dict[str, Dict[str, List[np.ndarray]]] = {}


# ── Helper ────────────────────────────────────────────────────────────────────

def _decode_images(raw_files_bytes: List[bytes]) -> List[np.ndarray]:
    """Decode a list of raw file bytes into BGR np.ndarray images."""
    images = []
    for b in raw_files_bytes:
        nparr = np.frombuffer(b, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is not None:
            images.append(img)
    return images


import logging

logger = logging.getLogger(__name__)

async def run_calibration_task(
    task_id: str,
    images: List[np.ndarray],
    session_name: str,
    model_type: str,
    coreset_ratio: float,
):
    def cb(val: float, msg: str):
        _progress[task_id] = {"progress": val, "message": msg, "status": "running"}

    try:
        session = pipeline.run(images, session_name, model_type, coreset_ratio, None, cb)
        _progress[task_id] = {
            "progress": 1.0,
            "message": "Done",
            "status": "done",
            "session_id": session.session_id,
        }
    except Exception as e:
        logger.exception(f"Error during calibration task {task_id}")
        _progress[task_id] = {"progress": 1.0, "message": str(e), "status": "error"}


async def run_subclass_calibration_task(
    task_id: str,
    images_by_subclass: Dict[str, List[np.ndarray]],
    session_name: str,
):
    """Background task for SubclassAwarePatchCore.fit()."""
    from parakh_ai.core.patchcore import SubclassAwarePatchCore
    from parakh_ai.storage.model_store import ModelStore, SessionMetadata
    from datetime import datetime

    _progress[task_id] = {"progress": 0.05, "message": "Fitting subclass models…", "status": "running"}

    try:
        model = SubclassAwarePatchCore()
        model.fit(images_by_subclass, session_id=session_name)

        store = ModelStore()
        meta = SessionMetadata(
            session_id=session_name,
            model_type="subclass_patchcore",
            backbone="wideresnet50",
            coreset_ratio=0.01,
            threshold=0.0,
            score_p50=0.0,
            score_p99=0.0,
            subclass_labels=list(images_by_subclass.keys()),
            created_at=datetime.utcnow().isoformat(),
        )
        store.save_session(session_name, model, meta)

        _progress[task_id] = {
            "progress": 1.0,
            "message": "Done",
            "status": "done",
            "session_id": session_name,
            "subclass_labels": list(images_by_subclass.keys()),
        }
    except Exception as exc:
        logger.exception(f"Error during subclass calibration task {task_id}")
        _progress[task_id] = {"progress": 1.0, "message": str(exc), "status": "error"}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("", response_model=dict)
async def calibrate(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    session_name: str = Form(...),
    model_type: str = Form("patchcore"),
    coreset_ratio: float = Form(0.01),
    subclass_id: Optional[str] = Form(None),
):
    """
    Upload calibration images.

    Single-subclass path (subclass_id omitted / None):
        Immediately queues a background training job and returns a task_id.

    Multi-subclass path (subclass_id provided):
        Stages images in memory under (session_name, subclass_id).
        Returns a confirmation dict.
        Call POST /finalize with the session_name to trigger actual training.
    """
    raw_bytes = [await f.read() for f in files]
    images = _decode_images(raw_bytes)

    # ── Multi-subclass staging ────────────────────────────────────────────────
    if subclass_id is not None:
        if len(images) < 1:
            raise HTTPException(status_code=400, detail="No valid images provided.")

        if session_name not in _staged:
            _staged[session_name] = {}
        existing = _staged[session_name].get(subclass_id, [])
        _staged[session_name][subclass_id] = existing + images

        return {
            "status": "staged",
            "session_name": session_name,
            "subclass_id": subclass_id,
            "images_staged": len(_staged[session_name][subclass_id]),
            "subclasses_so_far": list(_staged[session_name].keys()),
            "message": "Images staged. Call POST /finalize when all subclasses are uploaded.",
        }

    # ── Single-subclass path (original behaviour, unchanged) ─────────────────
    if len(images) < 5:
        raise HTTPException(status_code=400, detail="Minimum 5 valid images required.")

    task_id = str(uuid.uuid4())
    _progress[task_id] = {"progress": 0.0, "message": "Queued", "status": "running"}

    background_tasks.add_task(
        run_calibration_task, task_id, images, session_name, model_type, coreset_ratio
    )

    return {"task_id": task_id}


@router.post("/finalize", response_model=dict)
async def finalize_subclass_calibration(
    background_tasks: BackgroundTasks,
    session_name: str = Form(...),
):
    """
    Trigger SubclassAwarePatchCore training on all staged subclass images.

    Must be called after all subclass batches have been uploaded via
    POST /calibrate with their respective subclass_id values.

    Returns a task_id that can be polled via GET /{task_id}/progress.
    """
    if session_name not in _staged or not _staged[session_name]:
        raise HTTPException(
            status_code=400,
            detail=f"No staged images found for session '{session_name}'. "
                   f"Upload images first via POST /calibrate with subclass_id.",
        )

    images_by_subclass = _staged.pop(session_name)  # consume and remove from staging
    subclass_summary = {k: len(v) for k, v in images_by_subclass.items()}

    task_id = str(uuid.uuid4())
    _progress[task_id] = {"progress": 0.0, "message": "Queued", "status": "running"}

    background_tasks.add_task(
        run_subclass_calibration_task, task_id, images_by_subclass, session_name
    )

    return {
        "task_id": task_id,
        "session_name": session_name,
        "subclasses": subclass_summary,
        "message": "SubclassAwarePatchCore training started.",
    }


@router.get("/{task_id}/progress")
async def get_progress(task_id: str):
    async def event_generator():
        while True:
            if task_id in _progress:
                data = _progress[task_id]
                yield {"data": str(data)}
                if data["status"] in ["done", "error"]:
                    break
            await asyncio.sleep(0.5)
            
    return EventSourceResponse(event_generator())

