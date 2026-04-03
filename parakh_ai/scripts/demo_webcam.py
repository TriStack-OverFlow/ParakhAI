import os
import cv2
import asyncio
import logging
import argparse
from parakh_ai.pipeline.inference import InferencePipeline
from parakh_ai.storage.model_store import ModelStore
from parakh_ai.storage.defect_log import DefectLog

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

async def run_webcam(session_id: str, camera_index: int):
    store = ModelStore()
    log = DefectLog()
    pipeline = InferencePipeline(store, log)
    
    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        logger.error(f"Cannot open camera {camera_index}")
        return
        
    logger.info("Starting webcam inference. Press 'q' to quit.")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        try:
            # Synchronous inference inside loop for simple demo
            res = pipeline.infer_single(frame, session_id, generate_heatmap_img=True)
            
            # Display
            if res.heatmap_b64:
                import base64
                import numpy as np
                img_data = base64.b64decode(res.heatmap_b64)
                nparr = np.frombuffer(img_data, np.uint8)
                overlay = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                cv2.imshow("ParakhAI Anomaly Detection", overlay)
            else:
                cv2.imshow("ParakhAI Anomaly Detection", frame)
                
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        except Exception as e:
            logger.error(f"Inference error: {e}")
            break
            
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--session-id", required=True, help="Session ID to use for inference")
    parser.add_argument("--camera", type=int, default=0, help="Camera index")
    args = parser.parse_args()
    
    asyncio.run(run_webcam(args.session_id, args.camera))
