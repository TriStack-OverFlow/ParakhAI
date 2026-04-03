import logging
import torch
import numpy as np
import time
import abc
import pickle
import json
import cv2
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple, Any
from pathlib import Path
from PIL import Image as PILImage

from parakh_ai.core.backbone import FeatureExtractor
from parakh_ai.core.coreset import CoresetSampler
from parakh_ai.core.exceptions import ParakhAIError, CalibrationError, InferenceError

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

    def fit(self, images: torch.Tensor, session_id: str = "default", normality_buffer_size: int = 50) -> CalibrationResult:
        """
        Two-phase fit:
          Phase 1 — Build FAISS coreset from original images only (precision).
          Phase 2 — Hallucinate synthetic variants, score originals + hallucinations
                     against the coreset, compute μ/σ for Z-Score normalization.
        """
        import albumentations as A
        import cv2 as _cv2
        start_time = time.time()
        self.session_id = session_id

        N = images.size(0)
        logger.info("Phase 1: Extracting features for %d original calibration images...", N)

        # ── Phase 1: Build coreset from originals only ────────────────────────────
        features = self.feature_extractor.extract_patches(images)  # (N*H*W, D)
        logger.info("Phase 1: Subsampling memory bank with ratio %s", self.coreset_ratio)
        coreset_indices = self.coreset_sampler.fit(features, ratio=self.coreset_ratio)
        coreset_features = features[coreset_indices].cpu().numpy()
        self.coreset_sampler.build_index(coreset_features)
        self._is_fitted = True
        logger.info("Phase 1: FAISS index built on %d coreset points.", len(coreset_indices))

        # ── Phase 2: Synthetic Normality Buffer ────────────────────────────────
        # Generates geometric variants of the training images and scores them
        # against the just-built coreset to compute a realistic μ/σ that
        # accounts for real-world camera shake, tilt, and zoom variance.
        logger.info("Phase 2: Generating %d synthetic variants for normality calibration...", normality_buffer_size)

        # Build augmentation for hallucination (tight geometric, no colour)
        hallucination_aug = A.Compose([
            A.Affine(
                scale=(0.90, 1.10),              # ±10% zoom
                translate_percent=(-0.05, 0.05), # ±5% shift
                rotate=(-5, 5),                  # ±5 degrees
                fill=0,
                p=1.0,
            ),
            A.RandomBrightnessContrast(brightness_limit=0.15, contrast_limit=0.15, p=0.5),
        ])

        normal_scores: list = []

        # Score all originals
        grid_h, grid_w = self.feature_extractor.get_patch_grid_size(images.size(-1))
        for i in range(N):
            img_feats = self.feature_extractor.extract_patches(images[i:i+1]).cpu().numpy()
            dists, _ = self.coreset_sampler.search(img_feats, k=1)
            normal_scores.append(float(np.max(dists)))

        # Score synthetic hallucinations
        # Convert tensors back to numpy HWC uint8 for albumentations
        imagenet_mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        imagenet_std  = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        variants_generated = 0
        while variants_generated < normality_buffer_size:
            for i in range(N):
                if variants_generated >= normality_buffer_size:
                    break
                # Denormalize tensor to uint8 RGB
                chw = images[i].cpu().numpy()  # (C, H, W) float
                hwc = np.transpose(chw, (1, 2, 0))  # (H, W, C)
                hwc_uint8 = np.clip((hwc * imagenet_std + imagenet_mean) * 255.0, 0, 255).astype(np.uint8)
                # Hallucinate
                aug_rgb = hallucination_aug(image=hwc_uint8)["image"]
                # Re-normalise to tensor
                aug_norm = (aug_rgb.astype(np.float32) / 255.0 - imagenet_mean) / imagenet_std
                aug_chw = np.transpose(aug_norm, (2, 0, 1))
                aug_tensor = torch.from_numpy(aug_chw).float().unsqueeze(0).to(self.device)
                # Score
                img_feats = self.feature_extractor.extract_patches(aug_tensor).cpu().numpy()
                dists, _ = self.coreset_sampler.search(img_feats, k=1)
                normal_scores.append(float(np.max(dists)))
                variants_generated += 1

        normal_scores_arr = np.array(normal_scores)
        self.score_mean = float(np.mean(normal_scores_arr))
        self.score_std  = float(np.std(normal_scores_arr))
        self.z_threshold = 3.0  # configurable via config, default 3-sigma

        # Keep p50/p99 for backwards compatibility and logging
        self.score_p50 = float(np.percentile(normal_scores_arr, 50))
        self.score_p99 = float(np.percentile(normal_scores_arr, 99))
        self.threshold = self.score_mean + self.z_threshold * (self.score_std + 1e-6)

        logger.info(
            "Normality buffer: N=%d scores, μ=%.4f, σ=%.4f, z_threshold=%.1f, abs_threshold=%.4f",
            len(normal_scores_arr), self.score_mean, self.score_std, self.z_threshold, self.threshold
        )

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
        
        if image.dim() == 3:
            image = image.unsqueeze(0)
            
        img_h, img_w = image.shape[2], image.shape[3]
        
        features = self.feature_extractor.extract_patches(image).cpu().numpy()
        distances, _ = self.coreset_sampler.search(features, k=1)  # (H*W, 1)
        distances = distances.squeeze(-1)  # (H*W,)
        
        grid_h, grid_w = self.feature_extractor.get_patch_grid_size(img_h)
        assert len(distances) == grid_h * grid_w, "Distance array size mismatch with grid"
        
        anomaly_map = distances.reshape((grid_h, grid_w))
        raw_score = float(np.max(anomaly_map))
        
        # ── Z-Score Normalization (Synthetic Normality Buffer) ─────────────────
        # z = (raw - μ) / (σ + ε)
        # z ≈ 0 → indistinguishable from training normality buffer
        # z > 3 → statistically significant anomaly (3σ above normal)
        score_mean = getattr(self, 'score_mean', self.score_p50)
        score_std  = getattr(self, 'score_std',  max(self.score_p99 - self.score_p50, 1e-6))
        z_threshold = getattr(self, 'z_threshold', 3.0)
        
        normalized_score = (raw_score - score_mean) / (score_std + 1e-6)
        normalized_score = max(0.0, float(normalized_score))
        
        # Normalize the map the same way for heatmap
        normalized_map = (anomaly_map - score_mean) / (score_std + 1e-6)
        normalized_map = np.clip(normalized_map, 0.0, None)
        
        is_defective = normalized_score > z_threshold
        confidence = normalized_score - z_threshold
        
        inf_time = (time.time() - start_time) * 1000.0
        
        return AnomalyResult(
            anomaly_score=normalized_score,
            is_defective=is_defective,
            confidence=confidence,
            anomaly_map=normalized_map,
            patch_scores=normalized_map.copy(),
            inference_time_ms=inf_time,
            threshold_used=z_threshold
        )

    def predict_batch(self, images: torch.Tensor) -> List[AnomalyResult]:
        results = []
        for i in range(images.size(0)):
            results.append(self.predict(images[i:i+1]))
        return results

    # ── Twist 1: Bounded Incremental Coreset Merge ────────────────────────
    def accept_as_normal(
        self,
        image: torch.Tensor,
        defect_bboxes: Optional[List[dict]] = None,
        coverage_threshold: float = 0.01,
        max_coreset_size: int = 5000,
    ) -> dict:
        """
        Online learning: extract patches from the flagged region only,
        admit only coverage-gap-filling patches into the coreset,
        evict redundant points if over capacity, rebuild FAISS,
        and recompute the threshold.

        Args:
            image: (C,H,W) or (1,C,H,W) tensor, preprocessed.
            defect_bboxes: list of {x,y,w,h} dicts from inference.
                           If provided, only extract patches from those regions.
            coverage_threshold: min L2 distance for a new patch to be "novel".
            max_coreset_size: hard cap on coreset cardinality.

        Returns:
            dict with merge statistics + new threshold.
        """
        if not self._is_fitted:
            raise ParakhAIError("Model not fitted.")

        if image.dim() == 3:
            image = image.unsqueeze(0)

        img_h, img_w = image.shape[2], image.shape[3]

        # ── 1. Extract ALL patch features ────────────────────────────────
        all_features = self.feature_extractor.extract_patches(image).cpu().numpy()
        grid_h, grid_w = self.feature_extractor.get_patch_grid_size(img_h)

        # ── 2. If bboxes provided, only take patches overlapping them ────
        if defect_bboxes and len(defect_bboxes) > 0:
            # Convert bbox pixel coords to patch-grid coords
            scale_y = grid_h / img_h
            scale_x = grid_w / img_w
            selected_indices = set()
            for bbox in defect_bboxes:
                bx, by, bw, bh = bbox.get('x',0), bbox.get('y',0), bbox.get('w',img_w), bbox.get('h',img_h)
                gy_start = max(0, int(by * scale_y))
                gy_end   = min(grid_h, int((by + bh) * scale_y) + 1)
                gx_start = max(0, int(bx * scale_x))
                gx_end   = min(grid_w, int((bx + bw) * scale_x) + 1)
                for gy in range(gy_start, gy_end):
                    for gx in range(gx_start, gx_end):
                        selected_indices.add(gy * grid_w + gx)
            if selected_indices:
                idx = sorted(selected_indices)
                new_patches = all_features[idx]
            else:
                new_patches = all_features
        else:
            new_patches = all_features

        old_coreset_size = self.coreset_sampler.index.ntotal

        # ── 3. Bounded merge (coverage check + eviction) ─────────────────
        merge_stats = self.coreset_sampler.add_with_coverage_check(
            new_patches,
            coverage_threshold=coverage_threshold,
            max_coreset_size=max_coreset_size,
        )

        # ── 4. Recompute threshold ───────────────────────────────────────
        # Re-score this accepted image against the updated coreset
        dists_new, _ = self.coreset_sampler.search(all_features, k=1)
        new_raw = float(np.max(dists_new.squeeze(-1)))
        new_z = (new_raw - self.score_mean) / (self.score_std + 1e-6)
        new_z = max(0.0, new_z)

        # If the accepted image still scores above threshold after merge,
        # widen the distribution so it passes with 5% margin
        if new_z >= self.z_threshold:
            target_z = self.z_threshold * 0.90  # place it comfortably inside
            target_raw = self.score_mean + target_z * (self.score_std + 1e-6)
            # Widen σ so that new_raw → target_z
            self.score_std = max(self.score_std, (new_raw - self.score_mean) / (target_z + 1e-6))
            self.threshold = self.score_mean + self.z_threshold * (self.score_std + 1e-6)

        # Track feedback count
        self._feedback_count = getattr(self, '_feedback_count', 0) + 1

        logger.info(
            "Accept-as-Normal: offered=%d admitted=%d evicted=%d "
            "coreset=%d→%d new_z=%.3f threshold=%.4f feedback_count=%d",
            merge_stats['patches_offered'], merge_stats['patches_admitted'],
            merge_stats['patches_evicted'], old_coreset_size,
            merge_stats['coreset_size'], new_z, self.threshold,
            self._feedback_count
        )

        return {
            **merge_stats,
            "old_coreset_size": old_coreset_size,
            "new_z_score": round(float(new_z), 4),
            "new_threshold": round(float(self.threshold), 6),
            "new_mean": round(float(self.score_mean), 6),
            "new_std": round(float(self.score_std), 6),
            "feedback_count": self._feedback_count,
        }

    # ── Twist 2: Domain Drift Detection ───────────────────────────────────
    def record_inference(self, z_score: float) -> dict:
        """
        Track Z-scores in a 10-sample sliding window.

        Drift rule: if window_mean > 2.0 AND window_std < 0.5
        for 5+ samples, the product line has changed.
        """
        if not hasattr(self, '_z_window'):
            self._z_window = []

        self._z_window.append(z_score)
        if len(self._z_window) > 10:
            self._z_window = self._z_window[-10:]

        drift_status = "normal"
        w_mean = float(np.mean(self._z_window))
        w_std  = float(np.std(self._z_window))

        if len(self._z_window) >= 5 and w_mean > 2.0 and w_std < 0.5:
            drift_status = "domain_shift"

        return {
            "drift_status": drift_status,
            "window_mean": round(w_mean, 3),
            "window_std": round(w_std, 3),
            "window_size": len(self._z_window),
        }

    def save(self, save_dir: Path) -> None:
        save_dir.mkdir(parents=True, exist_ok=True)
        self.coreset_sampler.save(save_dir / "model.faiss")
        
        state = {
            "threshold":      self.threshold,
            "score_p50":      self.score_p50,
            "score_p99":      self.score_p99,
            "score_mean":     getattr(self, 'score_mean', self.score_p50),
            "score_std":      getattr(self, 'score_std', max(self.score_p99 - self.score_p50, 1e-6)),
            "z_threshold":    getattr(self, 'z_threshold', 3.0),
            "session_id":     self.session_id,
            "feedback_count": getattr(self, '_feedback_count', 0),
            "z_window":       getattr(self, '_z_window', []),
        }
        with open(save_dir / "model_state.pkl", "wb") as f:
            pickle.dump(state, f)

    def load(self, save_dir: Path) -> None:
        if not (save_dir / "model.faiss").exists():
            raise ParakhAIError(f"Model FAISS index not found at {save_dir}")
            
        self.coreset_sampler.load(save_dir / "model.faiss")
        
        with open(save_dir / "model_state.pkl", "rb") as f:
            state = pickle.load(f)
            
        self.threshold       = state["threshold"]
        self.score_p50       = state["score_p50"]
        self.score_p99       = state["score_p99"]
        self.score_mean      = state.get("score_mean",  self.score_p50)
        self.score_std       = state.get("score_std",   max(self.score_p99 - self.score_p50, 1e-6))
        self.z_threshold     = state.get("z_threshold", 3.0)
        self.session_id      = state.get("session_id",  "default")
        self._feedback_count = state.get("feedback_count", 0)
        self._z_window       = state.get("z_window", [])
        self._is_fitted      = True


# ---------------------------------------------------------------------------
# SubclassAwarePatchCore
# ---------------------------------------------------------------------------
class SubclassAwarePatchCore(BaseAnomalyModel):
    """
    Wrapper that maintains one PatchCore instance per product subclass
    (e.g. different car models, keyboard layouts).

    At inference time a lightweight DINOv2 ViT-S/14 CLS-token cosine-similarity
    router selects the correct sub-model in ~2 ms before delegating to it.

    All existing PatchCore behaviour is preserved when only one subclass is used
    (backward compatible with single-class calibration).
    """

    _DINO_MODEL_NAME: str = "dinov2_vits14"
    _DINO_HUB: str = "facebookresearch/dinov2"

    def __init__(
        self,
        backbone: str = "wideresnet50",
        coreset_ratio: float = 0.01,
        device: Optional[torch.device] = None,
        seed: int = 42,
    ) -> None:
        self.backbone = backbone
        self.coreset_ratio = coreset_ratio
        self.device = device
        self.seed = seed

        # One PatchCore per subclass label
        self.subclass_models: Dict[str, PatchCore] = {}
        # Mean DINOv2 CLS token per subclass (shape: 384-d for ViT-S/14)
        self.subclass_embeddings: Dict[str, np.ndarray] = {}

        # Lazy-loaded DINOv2 router; shares the torch.hub cache with backbone.py
        self._dino_model: Optional[torch.nn.Module] = None
        self._dino_transform: Optional[Any] = None
        self._is_fitted: bool = False

        logger.info(
            "SubclassAwarePatchCore initialised (backbone=%s, coreset_ratio=%s)",
            backbone,
            coreset_ratio,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _load_dino(self) -> None:
        """Lazy-load DINOv2 ViT-S/14 for routing. Uses torch.hub cache."""
        if self._dino_model is not None:
            return
        logger.info("Loading DINOv2 router model (%s) via torch.hub…", self._DINO_MODEL_NAME)
        try:
            self._dino_model = torch.hub.load(
                self._DINO_HUB,
                self._DINO_MODEL_NAME,
                pretrained=True,
                verbose=False,
            )
            self._dino_model.eval()
            if self.device is not None:
                self._dino_model = self._dino_model.to(self.device)
        except Exception as exc:
            raise CalibrationError(f"Failed to load DINOv2 router: {exc}") from exc

        from torchvision import transforms
        self._dino_transform = transforms.Compose([
            transforms.Resize(224),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

    def _embed_image(self, image: np.ndarray) -> np.ndarray:
        """
        Extract a 384-d DINOv2 CLS token for one BGR numpy image.
        Returns a unit-norm numpy vector.
        """
        self._load_dino()
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        pil_img = PILImage.fromarray(rgb)
        tensor = self._dino_transform(pil_img).unsqueeze(0)  # (1, 3, 224, 224)
        if self.device is not None:
            tensor = tensor.to(self.device)
        with torch.no_grad():
            cls_token = self._dino_model(tensor)  # (1, 384)
        vec = cls_token.squeeze(0).cpu().numpy()
        norm = np.linalg.norm(vec)
        if norm > 1e-8:
            vec = vec / norm
        return vec

    # ------------------------------------------------------------------
    # BaseAnomalyModel interface
    # ------------------------------------------------------------------

    def fit(  # type: ignore[override]
        self,
        images_by_subclass: Dict[str, List[np.ndarray]],
        session_id: str = "default",
    ) -> None:
        """
        Train one PatchCore per subclass and compute mean DINOv2 embeddings
        for the CLS-token router.

        Args:
            images_by_subclass: Mapping of subclass_label → list of BGR np.ndarray images.
            session_id:         Stored on each sub-model for traceability.
        """
        if not images_by_subclass:
            raise CalibrationError("images_by_subclass must be non-empty.")

        from parakh_ai.pipeline.preprocessing import Preprocessor

        for label, images in images_by_subclass.items():
            if len(images) < 1:
                raise CalibrationError(f"Subclass '{label}' has no images.")

            logger.info(
                "Fitting PatchCore for subclass '%s' with %d images…", label, len(images)
            )

            # ── 1. Preprocess images into a batch tensor ──────────────────
            tensors = [Preprocessor.preprocess_for_model(img) for img in images]
            batch = torch.stack(tensors)  # (N, 3, 224, 224)

            # ── 2. Fit a fresh PatchCore ──────────────────────────────────
            pc = PatchCore(
                backbone=self.backbone,
                coreset_ratio=self.coreset_ratio,
                device=self.device,
                seed=self.seed,
            )
            pc.fit(batch, session_id=f"{session_id}_{label}")
            self.subclass_models[label] = pc

            # ── 3. Compute mean CLS token embedding for routing ───────────
            embeddings = [self._embed_image(img) for img in images]
            self.subclass_embeddings[label] = np.mean(embeddings, axis=0)
            logger.info("Routing embedding computed for subclass '%s'.", label)

        self._is_fitted = True
        logger.info(
            "SubclassAwarePatchCore fitted with %d subclass(es): %s",
            len(self.subclass_models),
            list(self.subclass_models.keys()),
        )

    def _route(self, image: np.ndarray) -> str:
        """
        Select the best-matching subclass for a test image using cosine similarity
        of DINOv2 CLS tokens.

        Falls back gracefully to the first subclass when only one exists
        (maintains backward compatibility with single-subclass usage).
        """
        if len(self.subclass_models) == 1:
            return next(iter(self.subclass_models))

        query_vec = self._embed_image(image)

        best_label: str = ""
        best_sim: float = -2.0  # cosine range is [-1, 1]

        for label, ref_vec in self.subclass_embeddings.items():
            sim = float(np.dot(query_vec, ref_vec))
            if sim > best_sim:
                best_sim = sim
                best_label = label

        logger.debug("Router selected subclass '%s' (cos_sim=%.4f).", best_label, best_sim)
        return best_label

    def predict(  # type: ignore[override]
        self,
        image: torch.Tensor,
        raw_image: Optional[np.ndarray] = None,
    ) -> AnomalyResult:
        """
        Route to the correct sub-model and run anomaly detection.

        Args:
            image:     Pre-processed (C, H, W) or (1, C, H, W) tensor, same as PatchCore.predict().
            raw_image: Optional BGR np.ndarray used by the router. If omitted and there is
                       more than one subclass, InferenceError is raised.
        """
        if not self._is_fitted:
            raise InferenceError("Model is not fitted. Call fit() first.")

        if len(self.subclass_models) > 1:
            if raw_image is None:
                raise InferenceError(
                    "raw_image (BGR np.ndarray) is required for multi-subclass routing."
                )
            label = self._route(raw_image)
        else:
            label = next(iter(self.subclass_models))

        return self.subclass_models[label].predict(image)

    # ------------------------------------------------------------------
    # Persistence — lossless save / load
    # ------------------------------------------------------------------

    def save(self, save_dir: Path) -> None:  # type: ignore[override]
        """
        Serialise all sub-models and the routing embeddings.
        Layout inside save_dir:
            manifest.json          — maps label → subfolder name
            subclass_embeddings.npy — stacked (L, D) array
            subclass_labels.json   — ordered label list matching rows in .npy
            <label>/               — one directory per subclass, saved by PatchCore.save()
        """
        save_dir = Path(save_dir)
        save_dir.mkdir(parents=True, exist_ok=True)

        labels = list(self.subclass_models.keys())
        manifest: Dict[str, str] = {}

        for label in labels:
            subfolder = save_dir / label
            self.subclass_models[label].save(subfolder)
            manifest[label] = label  # folder name == label

        # Save routing embeddings as a single .npy file
        embedding_matrix = np.stack([self.subclass_embeddings[l] for l in labels])
        np.save(save_dir / "subclass_embeddings.npy", embedding_matrix)

        with open(save_dir / "subclass_labels.json", "w") as f:
            json.dump(labels, f)

        with open(save_dir / "manifest.json", "w") as f:
            json.dump(manifest, f, indent=2)

        logger.info("SubclassAwarePatchCore saved to %s (%d subclass(es)).", save_dir, len(labels))

    def load(self, save_dir: Path) -> None:  # type: ignore[override]
        """
        Restore all sub-models and routing embeddings from disk.
        Produces identical FAISS search results as before saving.
        """
        save_dir = Path(save_dir)

        manifest_path = save_dir / "manifest.json"
        if not manifest_path.exists():
            raise ParakhAIError(f"SubclassAwarePatchCore manifest not found at {save_dir}.")

        with open(manifest_path) as f:
            manifest: Dict[str, str] = json.load(f)

        with open(save_dir / "subclass_labels.json") as f:
            labels: List[str] = json.load(f)

        embedding_matrix: np.ndarray = np.load(save_dir / "subclass_embeddings.npy")

        self.subclass_models = {}
        self.subclass_embeddings = {}

        for i, label in enumerate(labels):
            subfolder = save_dir / manifest[label]
            pc = PatchCore(
                backbone=self.backbone,
                coreset_ratio=self.coreset_ratio,
                device=self.device,
                seed=self.seed,
            )
            pc.load(subfolder)
            self.subclass_models[label] = pc
            self.subclass_embeddings[label] = embedding_matrix[i]

        self._is_fitted = True
        logger.info(
            "SubclassAwarePatchCore loaded from %s (%d subclass(es)).",
            save_dir,
            len(labels),
        )
