import logging
import cv2
import asyncio
import numpy as np
from typing import AsyncGenerator, Optional

from parakh_ai.pipeline.inference import InferencePipeline, InferenceResponse
from parakh_ai.core.exceptions import ParakhAIError

logger = logging.getLogger(__name__)

class StreamingInferencePipeline:
    def __init__(
        self, 
        inference_pipeline: InferencePipeline, 
        session_id: str, 
        camera_index: int = 0,
        display_fps: int = 15,
        inference_fps: int = 5,
        motion_threshold: float = 0.02
    ):
        self.inference_pipeline = inference_pipeline
        self.session_id = session_id
        self.camera_index = camera_index
        
        self.display_fps = display_fps
        self.inference_fps = inference_fps
        self.motion_threshold = motion_threshold
        
        self.inference_interval = max(1, display_fps // inference_fps)
        self.cap = None
        self.running = False
        self.last_frame_gray = None
        self.last_result = None

    def start(self):
        self.cap = cv2.VideoCapture(self.camera_index)
        if not self.cap.isOpened():
            raise ParakhAIError(f"Cannot open camera {self.camera_index}")
        self.running = True

    def stop(self):
        self.running = False
        if self.cap:
            self.cap.release()

    def set_session(self, session_id: str):
        self.session_id = session_id
        self.last_result = None # Force new inference

    def _has_motion(self, current_frame_gray: np.ndarray) -> bool:
        if self.last_frame_gray is None:
            return True
            
        diff = cv2.absdiff(self.last_frame_gray, current_frame_gray)
        avg_diff = np.mean(diff) / 255.0
        return float(avg_diff) > self.motion_threshold

    async def stream_frames(self) -> AsyncGenerator[InferenceResponse, None]:
        if not self.running or not self.cap:
            raise ParakhAIError("Stream is not started.")
            
        frame_count = 0
        heartbeat_interval = 30
        
        while self.running:
            ret, frame = self.cap.read()
            if not ret:
                logger.warning("Failed to grab frame")
                await asyncio.sleep(0.1)
                continue
                
            frame_count += 1
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            run_inference = False
            
            if frame_count % self.inference_interval == 0:
                has_motion = self._has_motion(gray)
                if has_motion or (frame_count % heartbeat_interval == 0):
                    run_inference = True
                    self.last_frame_gray = gray
                    
            if run_inference or self.last_result is None:
                # Run inference
                try:
                    # For a real async web app, we'd want this to be run_in_executor
                    # to not block the event loop.
                    loop = asyncio.get_running_loop()
                    result = await loop.run_in_executor(
                        None,
                        self.inference_pipeline.infer_single,
                        frame,
                        self.session_id
                    )
                    self.last_result = result
                except Exception as e:
                    logger.error(f"Inference error: {e}")
                    # Yield None or a dummy to keep stream alive?
                    # Proceed with last result if available
                    pass
                    
            if self.last_result:
                # We yield the latest result
                yield self.last_result
                
            # Adaptive sleep to maintain display FPS
            await asyncio.sleep(1.0 / self.display_fps)
