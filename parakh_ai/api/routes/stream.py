import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from parakh_ai.pipeline.streaming import StreamingInferencePipeline
from parakh_ai.pipeline.inference import InferencePipeline
from parakh_ai.storage.model_store import ModelStore
from parakh_ai.storage.defect_log import DefectLog

router = APIRouter()

store = ModelStore()
log = DefectLog()
inference_pipeline = InferencePipeline(store, log)

@router.websocket("/ws/{session_id}")
async def websocket_stream(websocket: WebSocket, session_id: str):
    await websocket.accept()
    # Simplified structure: client sends frames, server relies
    # Usually streaming pipeline handles the camera, 
    # but over WS the client is the camera.
    
    try:
        while True:
            data = await websocket.receive_bytes()
            # In a real impl, decode frame, run inference and send back json
            await websocket.send_text(json.dumps({"status": "received"}))
    except WebSocketDisconnect:
        pass

@router.get("/webcam/{session_id}")
async def webcam_stream(session_id: str):
    # Server-side webcam streaming
    pass # Implementation requires active while loop with yield
