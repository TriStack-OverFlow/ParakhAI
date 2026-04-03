import logging
import cv2
import torch
from pathlib import Path
from typing import List, Callable, Optional, Dict
from PIL import Image
import imagehash

from parakh_ai.pipeline.preprocessing import Preprocessor
from parakh_ai.core.patchcore import PatchCore
from parakh_ai.core.padim import PaDiM
from parakh_ai.core.exceptions import CalibrationError

logger = logging.getLogger(__name__)

class CalibrationSession:
    def __init__(self, session_id: str, result, model):
        self.session_id = session_id
        self.result = result
        self.model = model

class CalibrationPipeline:
    def __init__(self, model_store_dir: str = "data/models/"):
        self.model_store_dir = Path(model_store_dir)
        
    def _validate_input(self, images: List[np.ndarray]):
        if len(images) < 5:
            raise CalibrationError(f"Minimum 5 images required, got {len(images)}.")
            
        hashes = [imagehash.phash(Image.fromarray(cv2.cvtColor(i, cv2.COLOR_BGR2RGB))) for i in images]
        
        has_dups = False
        for i in range(len(hashes)):
            for j in range(i+1, len(hashes)):
                if hashes[i] - hashes[j] < 5:
                    has_dups = True
                    break
        if has_dups:
            logger.warning("Near-duplicate images detected. This may reduce coreset effectiveness.")
            
    def run(
        self, 
        images: List[np.ndarray], 
        session_name: str, 
        model_type: str = 'patchcore', 
        coreset_ratio: float = 0.01, 
        roi_mask: Optional[np.ndarray] = None, 
        progress_callback: Optional[Callable[[float, str], None]] = None
    ) -> CalibrationSession:
        
        def report(val, msg):
            logger.info(msg)
            if progress_callback:
                progress_callback(val, msg)
                
        report(0.05, "Validating input images...")
        self._validate_input(images)
        
        report(0.15, "Preprocessing and augmenting images...")
        if roi_mask is not None:
            images = [Preprocessor.apply_roi_mask(img, roi_mask) for img in images]
            
        augmented = Preprocessor.augment_for_calibration(images)
        
        tensors = []
        for img in augmented:
            tensors.append(Preprocessor.preprocess_for_model(img))
            
        batch_tensor = torch.stack(tensors)
        
        report(0.60, f"Initializing {model_type} model...")
        if model_type.lower() == 'patchcore':
            model = PatchCore(coreset_ratio=coreset_ratio)
        elif model_type.lower() == 'padim':
            model = PaDiM()
        else:
            raise CalibrationError(f"Unsupported model type: {model_type}")
            
        report(0.80, "Fitting model to features...")
        session_id = session_name
        calib_result = model.fit(batch_tensor, session_id=session_id)
        
        report(0.95, "Threshold calibrated. Model is ready.")
        
        # Save model (simplified here, full ModelStore in phase 3)
        session_dir = self.model_store_dir / session_id
        model.save(session_dir)
        
        report(1.00, "Calibration session saved successfully.")
        
        return CalibrationSession(session_id=session_id, result=calib_result, model=model)
