import cv2
import numpy as np
from typing import List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from sse_starlette.sse import EventSourceResponse
import asyncio

from parakh_ai.pipeline.calibration import CalibrationPipeline
from parakh_ai.api.schemas import CalibrationResponseModel

router = APIRouter()
pipeline = CalibrationPipeline()

# In memory progress tracking
_progress = {}

async def run_calibration_task(task_id: str, images: List[np.ndarray], session_name: str, model_type: str, coreset_ratio: float):
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
        _progress[task_id] = {"progress": 1.0, "message": str(e), "status": "error"}

@router.post("", response_model=dict)
async def calibrate(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    session_name: str = Form(...),
    model_type: str = Form("patchcore"),
    coreset_ratio: float = Form(0.01)
):
    images = []
    for f in files:
        contents = await f.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is not None:
            images.append(img)
            
    if len(images) < 5:
        raise HTTPException(status_code=400, detail="Minimum 5 valid images required.")
        
    import uuid
    task_id = str(uuid.uuid4())
    _progress[task_id] = {"progress": 0.0, "message": "Queued", "status": "running"}
    
    background_tasks.add_task(run_calibration_task, task_id, images, session_name, model_type, coreset_ratio)
    
    return {"task_id": task_id}

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
