import logging
import cv2
import numpy as np
import torch
from pathlib import Path
from typing import List, Callable, Optional, Dict, Tuple
from PIL import Image
import imagehash

from parakh_ai.pipeline.preprocessing import (
    Preprocessor,
    IlluminationNormaliser,
    DINOv2ROIExtractor,
    build_calibration_augmentation,
)
from parakh_ai.core.patchcore import PatchCore
from parakh_ai.core.padim import PaDiM
from parakh_ai.core.exceptions import CalibrationError
from parakh_ai.storage.model_store import ModelStore, SessionMetadata

logger = logging.getLogger(__name__)

class CalibrationSession:
    def __init__(self, session_id: str, result, model):
        self.session_id = session_id
        self.result = result
        self.model = model

class CalibrationPipeline:
    def __init__(
        self,
        store: Optional[ModelStore] = None,
        illum_norm_method: str = "none",
        illum_norm_clip_limit: float = 1.2,
        illum_norm_tile_grid: Tuple[int, int] = (8, 8),
        augmentation_enabled: bool = True,
        augmentation_multiplier: int = 4,
        enforce_roi_alignment: bool = False,
        normality_buffer_size: int = 50,
    ):
        self.store = store or ModelStore()

        # Illumination normaliser — stateless, thread-safe
        self.illum_normaliser = IlluminationNormaliser(
            method=illum_norm_method,
            clip_limit=illum_norm_clip_limit,
            tile_grid=tuple(illum_norm_tile_grid),  # type: ignore[arg-type]
        )

        # DINOv2 ROI extractor — singleton, loads once on first use
        self.roi_extractor = DINOv2ROIExtractor() if enforce_roi_alignment else None
        self.normality_buffer_size = normality_buffer_size

        # Calibration augmentation pipeline
        self.augmentation = build_calibration_augmentation(enable=augmentation_enabled)
        self.augmentation_multiplier = augmentation_multiplier if augmentation_enabled else 1
        self.augmentation_enabled = augmentation_enabled

        logger.info(
            "CalibrationPipeline: illum=%s, roi=%s, aug=%s (x%d), normality_buffer=%d",
            illum_norm_method,
            "DINOv2" if enforce_roi_alignment else "off",
            augmentation_enabled,
            self.augmentation_multiplier,
            normality_buffer_size,
        )

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

        # ── Build tensors: ROI Guard → Illumination → Tensor (± Augmentation) ───
        all_tensors: List[torch.Tensor] = []

        for img in images:
            result = Preprocessor.preprocess_for_model(
                img,
                roi_extractor=self.roi_extractor,
                illum_normaliser=self.illum_normaliser,
                augmentation=self.augmentation if self.augmentation_enabled else None,
                augmentation_multiplier=self.augmentation_multiplier,
            )
            if isinstance(result, list):
                all_tensors.extend(result)
            else:
                all_tensors.append(result)

        batch_tensor = torch.stack(all_tensors)
        logger.info(
            "Calibration batch: %d source images → %d tensors after augmentation.",
            len(images),
            len(all_tensors),
        )
        
        report(0.60, f"Initializing {model_type} model...")
        if model_type.lower() == 'patchcore':
            model = PatchCore(coreset_ratio=coreset_ratio)
        elif model_type.lower() == 'padim':
            model = PaDiM()
        else:
            raise CalibrationError(f"Unsupported model type: {model_type}")
            
        report(0.80, "Fitting model to features...")
        session_id = session_name
        calib_result = model.fit(
            batch_tensor,
            session_id=session_id,
            normality_buffer_size=self.normality_buffer_size,
        )
        
        report(0.95, "Threshold calibrated. Model is ready.")
        
        from datetime import datetime
        meta = SessionMetadata(
            session_id=session_id,
            model_type=model_type,
            backbone="wideresnet50",
            coreset_ratio=coreset_ratio,
            threshold=float(model.threshold) if hasattr(model, 'threshold') else 0.0,
            score_p50=float(model.score_p50) if hasattr(model, 'score_p50') else 0.0,
            score_p99=float(model.score_p99) if hasattr(model, 'score_p99') else 0.0,
            created_at=datetime.utcnow().isoformat()
        )
        self.store.save_session(session_id, model, meta)
        
        report(1.00, "Calibration session saved successfully.")
        
        return CalibrationSession(session_id=session_id, result=calib_result, model=model)
