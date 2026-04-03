import logging
import torch
import numpy as np
import time
import pickle
from typing import List, Dict, Optional, Tuple, Any
from pathlib import Path

from parakh_ai.core.backbone import FeatureExtractor
from parakh_ai.core.patchcore import BaseAnomalyModel, CalibrationResult, AnomalyResult
from parakh_ai.core.exceptions import ParakhAIError

logger = logging.getLogger(__name__)

class PaDiM(BaseAnomalyModel):
    """
    PaDiM anomaly detection model using Multivariate Gaussian per patch location.
    """
    def __init__(
        self, 
        backbone: str = 'wideresnet50', 
        d_reduced: int = 100, 
        epsilon: float = 0.01, 
        device: Optional[torch.device] = None, 
        seed: int = 42
    ):
        self.feature_extractor = FeatureExtractor(backbone=backbone, device=device)
        self.device = self.feature_extractor.device
        self.d_reduced = d_reduced
        self.epsilon = epsilon
        self.seed = seed
        
        # State
        self.feature_dim = self.feature_extractor.get_feature_dim()
        self.d_reduced = min(self.d_reduced, self.feature_dim)
        
        # Random dimension selection
        np.random.seed(self.seed)
        self.idx_selected = np.random.choice(self.feature_dim, self.d_reduced, replace=False)
        self.idx_selected.sort()
        
        self.means: Optional[torch.Tensor] = None # (H, W, d_reduced)
        self.precisions: Optional[torch.Tensor] = None # (H, W, d_reduced, d_reduced)
        
        self.threshold = 0.0
        self.score_p50 = 0.0
        self.score_p99 = 0.0
        self.session_id = None
        self._is_fitted = False

    def fit(self, images: torch.Tensor, session_id: str = "default") -> CalibrationResult:
        start_time = time.time()
        self.session_id = session_id
        
        N = images.size(0)
        grid_h, grid_w = self.feature_extractor.get_patch_grid_size(images.size(-1))
        
        logger.info(f"Extracting features for {N} calibration images...")
        features = self.feature_extractor.extract_patches(images) # (N*H*W, feature_dim)
        
        # Reshape to (N, H, W, feature_dim)
        features = features.view(N, grid_h, grid_w, self.feature_dim)
        
        # Subset dimensions
        features = features[:, :, :, self.idx_selected] # (N, H, W, d_reduced)
        
        # We process entirely on CPU to save VRAM for large spatial sizes
        features = features.cpu()
        
        logger.info("Computing mean and covariance matrices...")
        # Means: (H, W, d_reduced)
        self.means = features.mean(dim=0)
        
        # Covariance: (H, W, d_reduced, d_reduced)
        # E.g. for each (h,w), we have N samples of size d_reduced
        # We can compute covariance manually or with torch.cov 
        # torch.cov expects variables on rows, observations on columns. 
        # So we transpose to (H, W, d_reduced, N)
        self.precisions = torch.zeros((grid_h, grid_w, self.d_reduced, self.d_reduced))
        
        I = torch.eye(self.d_reduced) * self.epsilon
        
        for h in range(grid_h):
            for w in range(grid_w):
                # (N, D)
                pts = features[:, h, w, :] 
                cov = torch.cov(pts.T) # (D, D)
                cov += I
                # precision = inv(cov)
                precision = torch.linalg.inv(cov)
                self.precisions[h, w] = precision
                
        self._is_fitted = True
        
        # Find threshold
        normal_scores = []
        for i in range(N):
            raw_score, _ = self._compute_distance(features[i:i+1])
            normal_scores.append(raw_score)
            
        normal_scores = np.array(normal_scores)
        self.score_p50 = np.percentile(normal_scores, 50.0)
        self.score_p99 = np.percentile(normal_scores, 99.0)
        self.threshold = self.score_p99
        
        calib_time = time.time() - start_time
        
        return CalibrationResult(
            session_id=session_id,
            calibration_time_s=calib_time,
            n_images_used=N,
            coreset_size=0, # Not applicable for PaDiM
            threshold=self.threshold,
            score_p50=self.score_p50,
            score_p99=self.score_p99,
            feature_dim=self.d_reduced
        )

    def _compute_distance(self, features_nhwd: torch.Tensor) -> Tuple[float, np.ndarray]:
        """
        features_nhwd: (1, H, W, D) on CPU
        Returns (max_score, anomaly_map)
        """
        H, W = features_nhwd.size(1), features_nhwd.size(2)
        diff = features_nhwd.squeeze(0) - self.means # (H, W, D)
        
        # Mahalanobis dist = sqrt( diff^T @ precision @ diff )
        # diff is (H, W, D). After unsqueeze it's (H, W, 1, D)
        # precision is (H, W, D, D)
        diff_unsqueezed = diff.unsqueeze(2) # (H, W, 1, D)
        
        # (1, D) @ (D, D) -> (1, D)
        left = torch.matmul(diff_unsqueezed, self.precisions) # (H, W, 1, D)
        
        # (1, D) @ (D, 1) -> (1, 1)
        right = diff.unsqueeze(-1) # (H, W, D, 1)
        
        dist_sq = torch.matmul(left, right).squeeze(-1).squeeze(-1) # (H, W)
        dist = torch.sqrt(torch.clamp(dist_sq, min=0.0))
        
        anomaly_map = dist.numpy()
        return float(np.max(anomaly_map)), anomaly_map

    def predict(self, image: torch.Tensor) -> AnomalyResult:
        if not self._is_fitted:
            raise ParakhAIError("Model is not fitted. Call fit() first.")
            
        start_time = time.time()
        
        if image.dim() == 3:
            image = image.unsqueeze(0)
            
        grid_h, grid_w = self.feature_extractor.get_patch_grid_size(image.size(-1))
        
        # Feature shape is (B*H*W, D)
        features = self.feature_extractor.extract_patches(image)
        features = features.view(1, grid_h, grid_w, self.feature_dim)
        features = features[:, :, :, self.idx_selected].cpu()
        
        raw_score, anomaly_map = self._compute_distance(features)
        
        range_val = self.threshold - self.score_p50
        if range_val <= 0:
            range_val = 1e-5
            
        normalized_score = (raw_score - self.score_p50) / range_val
        normalized_score = max(0.0, float(normalized_score))
        
        normalized_map = (anomaly_map - self.score_p50) / range_val
        normalized_map = np.clip(normalized_map, 0.0, None)
        
        is_defective = normalized_score > 1.0
        confidence = normalized_score - 1.0
        
        inf_time = (time.time() - start_time) * 1000.0
        
        return AnomalyResult(
            anomaly_score=normalized_score,
            is_defective=is_defective,
            confidence=confidence,
            anomaly_map=normalized_map,
            patch_scores=normalized_map.copy(),
            inference_time_ms=inf_time,
            threshold_used=1.0
        )

    def save(self, save_dir: Path) -> None:
        save_dir.mkdir(parents=True, exist_ok=True)
        
        state = {
            "threshold": self.threshold,
            "score_p50": self.score_p50,
            "score_p99": self.score_p99,
            "session_id": self.session_id,
            "idx_selected": self.idx_selected,
            "means": self.means,
            "precisions": self.precisions
        }
        with open(save_dir / "padim_state.pkl", "wb") as f:
            pickle.dump(state, f)

    def load(self, save_dir: Path) -> None:
        state_file = save_dir / "padim_state.pkl"
        if not state_file.exists():
            raise ParakhAIError(f"Model state file not found at {state_file}")
            
        with open(state_file, "rb") as f:
            state = pickle.load(f)
            
        self.threshold = state["threshold"]
        self.score_p50 = state["score_p50"]
        self.score_p99 = state["score_p99"]
        self.session_id = state.get("session_id", "default")
        self.idx_selected = state["idx_selected"]
        self.means = state["means"]
        self.precisions = state["precisions"]
        self._is_fitted = True
