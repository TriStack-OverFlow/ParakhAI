from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging
import cv2
import numpy as np
import json
import base64

from parakh_ai.pipeline.inference import InferencePipeline

router = APIRouter()
logger = logging.getLogger(__name__)

# Re-use existing pipeline singleton conceptually
from parakh_ai.api.dependencies import get_pipeline

@router.websocket("/live")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    pipeline = get_pipeline()
    
    # We require a session_id to be sent first, or we can just expect JSON messages
    session_id = None
    
    try:
        while True:
            text_data = await websocket.receive_text()
            data = json.loads(text_data)
            
            if "session_id" in data and "image_b64" not in data:
                # Initialization metadata
                session_id = data["session_id"]
                await websocket.send_json({"status": "ready"})
                continue
                
            if "image_b64" in data:
                if not session_id:
                    session_id = data.get("session_id", "default_session")
                    
                b64 = data["image_b64"]
                # Decode base64 to image
                if "," in b64:
                    b64 = b64.split(",")[1]
                img_data = base64.b64decode(b64)
                nparr = np.frombuffer(img_data, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if img is None:
                    await websocket.send_json({"error": "Failed to decode image"})
                    continue
                    
                try:
                    # Run inference using the pipeline
                    res = pipeline.infer_single(
                        image=img,
                        session_id=session_id,
                        generate_heatmap_img=True,
                        log_result=False # Don't flood logs on live stream
                    )
                    
                    await websocket.send_json({
                        "anomaly_score": res.anomaly_score,
                        "severity": res.severity,
                        "is_defective": res.is_defective,
                        "heatmap_b64": res.heatmap_b64,
                        "inference_time_ms": res.inference_time_ms,
                        "drift_status": res.drift_status if hasattr(res, 'drift_status') else "normal"
                    })
                except Exception as e:
                    logger.error(f"WS Inference Error: {e}")
                    await websocket.send_json({"error": str(e)})
                    
    except WebSocketDisconnect:
        logger.info("Client disconnected from Live AR stream")
    except Exception as e:
        logger.error(f"Unexpected WebSocket error: {e}")
        try:
            await websocket.close()
        except:
            pass
