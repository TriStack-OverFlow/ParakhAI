import logging
import torch
import numpy as np
import time
import abc
import pickle
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple, Any
from pathlib import Path

from parakh_ai.core.backbone import FeatureExtractor
from parakh_ai.core.coreset import CoresetSampler
from parakh_ai.core.exceptions import ParakhAIError

logger = logging.getLogger(__name__)

@dataclass
class CalibrationResult:
    session_id: str
    calibration_time_s: float
    n_images_used: int
    coreset_size: int
    threshold: float
    score_p50: float
    score_p99: float
    feature_dim: int

@dataclass
class AnomalyResult:
    anomaly_score: float
    is_defective: bool
    confidence: float
    anomaly_map: np.ndarray
    heatmap_overlay: Optional[np.ndarray] = None
    patch_scores: Optional[np.ndarray] = None
    inference_time_ms: float = 0.0
    threshold_used: float = 0.0

class BaseAnomalyModel(abc.ABC):
    @abc.abstractmethod
    def fit(self, images: torch.Tensor, session_id: str = "default") -> CalibrationResult:
        pass
        
    @abc.abstractmethod
    def predict(self, image: torch.Tensor) -> AnomalyResult:
        pass

    @abc.abstractmethod
    def save(self, save_dir: Path) -> None:
        pass

    @abc.abstractmethod
    def load(self, save_dir: Path) -> None:
        pass

class PatchCore(BaseAnomalyModel):
    """
    PatchCore anomaly detection model using FAISS memory bank.
    """
    def __init__(self, backbone: str = 'wideresnet50', coreset_ratio: float = 0.01, device: Optional[torch.device] = None, seed: int = 42):
        self.feature_extractor = FeatureExtractor(backbone=backbone, device=device)
        self.device = self.feature_extractor.device
        self.coreset_ratio = coreset_ratio
        self.coreset_sampler = CoresetSampler(target_dim=128, seed=seed)
        
        # State
        self.threshold = 0.0
        self.score_p50 = 0.0
        self.score_p99 = 0.0
        self.feature_dim = self.feature_extractor.get_feature_dim()
        self.session_id = None
        self._is_fitted = False

    def fit(self, images: torch.Tensor, session_id: str = "default") -> CalibrationResult:
        start_time = time.time()
        self.session_id = session_id
        
        N = images.size(0)
        logger.info(f"Extracting features for {N} calibration images...")
        
        # Instead of all at once, do batch processing if memory is a concern.
        # Assuming images is a batch tensor (N, C, H, W)
        features = self.feature_extractor.extract_patches(images) # (N*H*W, D)
        
        logger.info(f"Subsampling memory bank with ratio {self.coreset_ratio}")
        coreset_indices = self.coreset_sampler.fit(features, ratio=self.coreset_ratio)
        
        coreset_features = features[coreset_indices].cpu().numpy()
        self.coreset_sampler.build_index(coreset_features)
        
        self._is_fitted = True
        
        # Compute scores on the calibration set to find the threshold
        # For a truly good threshold, we compute max nearest neighbor distance for each image
        # Batch size for predicting normal
        grid_h, grid_w = self.feature_extractor.get_patch_grid_size(images.size(-1))
        
        normal_scores = []
        for i in range(N):
            img_tensor = images[i:i+1] # (1, C, H, W)
            # Query patches
            img_feats = self.feature_extractor.extract_patches(img_tensor).cpu().numpy()
            dists, _ = self.coreset_sampler.search(img_feats, k=1)
            image_score = np.max(dists)
            normal_scores.append(image_score)
            
        normal_scores = np.array(normal_scores)
        self.score_p50 = np.percentile(normal_scores, 50.0)
        self.score_p99 = np.percentile(normal_scores, 99.0)
        
        # Threshold at 99th percentile of normal scores
        self.threshold = self.score_p99
        
        calib_time = time.time() - start_time
        
        return CalibrationResult(
            session_id=session_id,
            calibration_time_s=calib_time,
            n_images_used=N,
            coreset_size=len(coreset_indices),
            threshold=self.threshold,
            score_p50=self.score_p50,
            score_p99=self.score_p99,
            feature_dim=self.feature_dim
        )

    def predict(self, image: torch.Tensor) -> AnomalyResult:
        if not self._is_fitted:
            raise ParakhAIError("Model is not fitted. Call fit() first.")
            
        start_time = time.time()
        
        # Make sure batch dim exists and is 1 for single prediction
        if image.dim() == 3:
            image = image.unsqueeze(0)
            
        img_h, img_w = image.shape[2], image.shape[3]
        
        features = self.feature_extractor.extract_patches(image).cpu().numpy()
        distances, _ = self.coreset_sampler.search(features, k=1) # (H*W, 1)
        distances = distances.squeeze(-1) # (H*W,)
        
        grid_h, grid_w = self.feature_extractor.get_patch_grid_size(img_h)
        assert len(distances) == grid_h * grid_w, "Distance array size mismatch with grid"
        
        anomaly_map = distances.reshape((grid_h, grid_w))
        raw_score = np.max(anomaly_map)
        
        # Normalize score
        # 0.0 is p50 of normal, 1.0 is the threshold.
        # If score == threshold, normalized = 1.0
        range_val = self.threshold - self.score_p50
        if range_val <= 0:
            range_val = 1e-5
            
        normalized_score = (raw_score - self.score_p50) / range_val
        # Limit to [0, ~] and clamp minimum to 0
        normalized_score = max(0.0, float(normalized_score))
        
        is_defective = normalized_score > 1.0
        confidence = normalized_score - 1.0 # Positive means defective
        
        inf_time = (time.time() - start_time) * 1000.0
        
        return AnomalyResult(
            anomaly_score=normalized_score,
            is_defective=is_defective,
            confidence=confidence,
            anomaly_map=anomaly_map,
            patch_scores=anomaly_map.copy(),
            inference_time_ms=inf_time,
            threshold_used=1.0 # Due to normalization, effective threshold is 1.0
        )

    def predict_batch(self, images: torch.Tensor) -> List[AnomalyResult]:
        results = []
        for i in range(images.size(0)):
            results.append(self.predict(images[i:i+1]))
        return results

    def save(self, save_dir: Path) -> None:
        save_dir.mkdir(parents=True, exist_ok=True)
        self.coreset_sampler.save(save_dir / "model.faiss")
        
        state = {
            "threshold": self.threshold,
            "score_p50": self.score_p50,
            "score_p99": self.score_p99,
            "session_id": self.session_id,
        }
        with open(save_dir / "model_state.pkl", "wb") as f:
            pickle.dump(state, f)

    def load(self, save_dir: Path) -> None:
        if not (save_dir / "model.faiss").exists():
            raise ParakhAIError(f"Model FAISS index not found at {save_dir}")
            
        self.coreset_sampler.load(save_dir / "model.faiss")
        
        with open(save_dir / "model_state.pkl", "rb") as f:
            state = pickle.load(f)
            
        self.threshold = state["threshold"]
        self.score_p50 = state["score_p50"]
        self.score_p99 = state["score_p99"]
        self.session_id = state.get("session_id", "default")
        self._is_fitted = True
