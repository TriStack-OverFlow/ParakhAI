import logging
import cv2
import numpy as np
import torch
from dataclasses import dataclass
from typing import Tuple, List, Optional, Union
import albumentations as A
from parakh_ai.core.heatmap import BBox

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# IlluminationNormaliser
# ---------------------------------------------------------------------------

class IlluminationNormaliser:
    """
    Corrects lighting conditions in an image before backbone feature extraction.

    Stateless between calls — thread-safe for concurrent API requests.
    The internal CLAHE object is created once at __init__ and is read-only
    during normalize().

    method options:
        "none"          — passthrough; backward compatible default
        "clahe"         — CLAHE on LAB L-channel; corrects local contrast,
                          preserves colour, near-zero latency (~0.5 ms/image)
        "retinex"       — single-scale Retinex per channel; removes the
                          illumination field (~3 ms/image on CPU)
        "clahe+retinex" — CLAHE first, then Retinex; most robust, ~3.5 ms
    """

    VALID_METHODS = {"none", "clahe", "retinex", "clahe+retinex"}

    def __init__(
        self,
        method: str = "none",
        clip_limit: float = 1.2,
        tile_grid: Tuple[int, int] = (8, 8),
    ) -> None:
        if method not in self.VALID_METHODS:
            raise ValueError(
                f"Invalid illumination method '{method}'. "
                f"Choose from: {self.VALID_METHODS}"
            )
        self.method = method
        self.clip_limit = clip_limit
        self.tile_grid = tile_grid
        # Build CLAHE once — cv2.CLAHE is immutable after creation
        self._clahe = cv2.createCLAHE(
            clipLimit=clip_limit,
            tileGridSize=tile_grid,
        )
        logger.debug(
            "IlluminationNormaliser initialised (method=%s, clip_limit=%s, tile_grid=%s)",
            method,
            clip_limit,
            tile_grid,
        )

    def normalize(self, image: np.ndarray) -> np.ndarray:
        """
        Apply illumination correction to a BGR uint8 image.

        Args:
            image: BGR np.ndarray of shape (H, W, 3), dtype uint8.

        Returns:
            Corrected BGR np.ndarray of the same shape and dtype.
        """
        if self.method == "none":
            return image

        if self.method == "clahe":
            return self._apply_clahe(image)

        if self.method == "retinex":
            return self._apply_retinex(image)

        # "clahe+retinex"
        return self._apply_retinex(self._apply_clahe(image))

    def _apply_clahe(self, image: np.ndarray) -> np.ndarray:
        """
        Convert to LAB, apply CLAHE to the L channel only, convert back.
        Corrects local contrast without shifting hue/saturation.
        """
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l_ch, a_ch, b_ch = cv2.split(lab)
        l_eq = self._clahe.apply(l_ch)
        lab_eq = cv2.merge([l_eq, a_ch, b_ch])
        return cv2.cvtColor(lab_eq, cv2.COLOR_LAB2BGR)

    def _apply_retinex(self, image: np.ndarray) -> np.ndarray:
        """
        Single-Scale Retinex (SSR) per channel.
        Approximates the reflectance image by subtracting the log of the
        Gaussian-blurred (sigma=80) illumination estimate.
        Output is rescaled to [0, 255] uint8.
        """
        img_float = image.astype(np.float32) + 1.0  # avoid log(0)
        result = np.zeros_like(img_float)

        for c in range(3):
            blurred = cv2.GaussianBlur(img_float[:, :, c], (0, 0), sigmaX=80)
            blurred = np.maximum(blurred, 1.0)
            retinex_ch = np.log(img_float[:, :, c]) - np.log(blurred)
            result[:, :, c] = retinex_ch

        # Rescale each channel independently to [0, 255]
        for c in range(3):
            ch = result[:, :, c]
            ch_min, ch_max = ch.min(), ch.max()
            if ch_max > ch_min:
                result[:, :, c] = (ch - ch_min) / (ch_max - ch_min) * 255.0
            else:
                result[:, :, c] = 0.0

        return np.clip(result, 0, 255).astype(np.uint8)


# ---------------------------------------------------------------------------
# DINOv2 ROI Extractor — Training-Free Foreground Detection
# ---------------------------------------------------------------------------

class DINOv2ROIExtractor:
    """
    Training-free foreground extractor using DINOv2 self-attention.

    Uses cosine similarity between the CLS token and each patch token from the
    last DINOv2 transformer layer to produce a coarse semantic foreground mask.
    Works for any object shape: paper, cars, keyboards, circuit boards, etc.
    Singleton — model is loaded once and shared across all calls.
    """
    _instance: Optional['DINOv2ROIExtractor'] = None
    _model = None
    DINO_MODEL = "dinov2_vits14"
    PATCH_SIZE = 14
    INPUT_SIZE = 518  # Must be divisible by 14; 518 = 37 * 14

    def __new__(cls) -> 'DINOv2ROIExtractor':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _load_model(self) -> None:
        if self._model is not None:
            return
        import torch
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info("Loading DINOv2 ViT-S/14 for ROI extraction (one-time)...")
        self._model = torch.hub.load(
            'facebookresearch/dinov2', self.DINO_MODEL, verbose=False
        )
        self._model.eval()
        self._model.to(device)
        self._device = device
        logger.info("DINOv2 ROI extractor ready on %s", device)

    def extract(self, image: np.ndarray) -> np.ndarray:
        """
        Extract foreground ROI from a BGR image.

        1. Run DINOv2 forward_features() to get CLS + patch tokens.
        2. Compute cosine similarity between CLS and each patch → attention proxy.
        3. Upsample cosine map to original resolution.
        4. Otsu threshold → binary foreground mask.
        5. Crop to bounding box + inset 15% to strip edge junk (bindings, headers).
        6. Fallback: 90% square center-crop if no confident foreground found.
        """
        import torch
        import torch.nn.functional as F
        self._load_model()

        h, w = image.shape[:2]
        grid_size = self.INPUT_SIZE // self.PATCH_SIZE  # 37

        # ── Prepare input ────────────────────────────────────────────────────
        img_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        img_resized = cv2.resize(img_rgb, (self.INPUT_SIZE, self.INPUT_SIZE))
        _mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        _std  = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        img_norm = (img_resized.astype(np.float32) / 255.0 - _mean) / _std
        tensor = torch.from_numpy(
            np.transpose(img_norm, (2, 0, 1))
        ).float().unsqueeze(0).to(self._device)

        # ── DINOv2 forward — get CLS and patch tokens ────────────────────────
        with torch.no_grad():
            out = self._model.forward_features(tensor)
            # DINOv2 returns a dict with 'x_norm_patchtokens' and 'x_norm_clstoken'
            patch_tokens = out['x_norm_patchtokens']   # (1, N_patches, C)
            cls_token    = out['x_norm_clstoken']      # (1, C)

        # ── Cosine similarity CLS → each patch ──────────────────────────────
        cls_exp = cls_token.unsqueeze(1).expand_as(patch_tokens)  # (1, N, C)
        cos_sim = F.cosine_similarity(patch_tokens, cls_exp, dim=-1)  # (1, N)
        attn_map = cos_sim[0].reshape(grid_size, grid_size).cpu().numpy()  # (37, 37)

        # ── Upsample to original resolution ─────────────────────────────────
        attn_up = cv2.resize(attn_map, (w, h), interpolation=cv2.INTER_LINEAR)
        attn_norm = (
            (attn_up - attn_up.min()) / (attn_up.max() - attn_up.min() + 1e-8) * 255
        ).astype(np.uint8)

        # ── Otsu threshold → binary mask ─────────────────────────────────────
        _, mask = cv2.threshold(attn_norm, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # ── Bounding box of foreground ────────────────────────────────────────
        coords = cv2.findNonZero(mask)
        if coords is None:
            logger.debug("DINOv2 ROI: no foreground found, using center crop")
            return self._center_crop(image)

        bx, by, bw, bh = cv2.boundingRect(coords)
        fg_fraction = (bw * bh) / (w * h)
        if fg_fraction < 0.15:
            logger.debug("DINOv2 ROI: foreground too small (%.1f%%), using center crop", fg_fraction * 100)
            return self._center_crop(image)

        # ── 15% inward buffer — strips spiral binding, date headers, desk ────
        inset_x = int(bw * 0.15)
        inset_y = int(bh * 0.15)
        x1 = min(bx + inset_x, w - 1)
        y1 = min(by + inset_y, h - 1)
        x2 = max(bx + bw - inset_x, x1 + 1)
        y2 = max(by + bh - inset_y, y1 + 1)

        cropped = image[y1:y2, x1:x2]
        if cropped.size == 0:
            return self._center_crop(image)

        logger.debug(
            "DINOv2 ROI: fg=%.1f%%, crop=(%d,%d,%d,%d) with 15%% inset",
            fg_fraction * 100, x1, y1, x2 - x1, y2 - y1
        )
        return cropped

    @staticmethod
    def _center_crop(image: np.ndarray, ratio: float = 0.90) -> np.ndarray:
        """Fallback: 90% square center crop."""
        h, w = image.shape[:2]
        size = int(min(h, w) * ratio)
        x = (w - size) // 2
        y = (h - size) // 2
        return image[y:y + size, x:x + size]


# ---------------------------------------------------------------------------
# Calibration augmentation factory
# ---------------------------------------------------------------------------

def build_calibration_augmentation(enable: bool = False) -> A.Compose:
    """
    Build a lighting-diversity augmentation pipeline for calibration images.

    Args:
        enable: If False (default), returns a no-op Compose([]) pipeline.
                This preserves backward compatibility — calling code doesn't
                need to guard with `if augmentation is not None`.

    Returns:
        An albumentations.Compose pipeline.

    Notes:
        Applied ONLY during calibration to synthetically expand the coreset's
        lighting envelope.  Must NEVER be applied during inference.
    """
    if not enable:
        return A.Compose([])  # no-op

    return A.Compose([
        # Simulate camera zoom/shift/tilt — builds scale & angle invariance from few shots
        # A.Affine is the official Albumentations 2.0 replacement for ShiftScaleRotate
        A.Affine(
            scale=(0.80, 1.20),              # ±20% zoom
            translate_percent=(-0.10, 0.10), # ±10% shift
            rotate=(-10, 10),               # ±10 degrees
            shear=(-3, 3),
            fill=0,
            p=0.8,
        ),
        A.RandomBrightnessContrast(
            brightness_limit=0.3,
            contrast_limit=0.3,
            p=0.5,
        ),
        A.RandomShadow(p=0.3),
        A.GaussianBlur(blur_limit=(3, 7), p=0.2),
        A.ISONoise(p=0.2),
        A.ColorJitter(
            brightness=0.2,
            contrast=0.2,
            saturation=0.1,
            hue=0.05,
            p=0.3,
        ),
    ])


# ---------------------------------------------------------------------------
# Preprocessor
# ---------------------------------------------------------------------------

@dataclass
class ImageQualityReport:
    quality_score: float
    warnings: List[str]
    is_acceptable: bool

class Preprocessor:
    TARGET_SIZE = (224, 224)
    IMAGENET_MEAN = np.array([0.485, 0.456, 0.406])
    IMAGENET_STD = np.array([0.229, 0.224, 0.225])

    @classmethod
    def preprocess_for_model(
        cls,
        image: np.ndarray,
        illum_normaliser: Optional[IlluminationNormaliser] = None,
        augmentation: Optional[A.Compose] = None,
        augmentation_multiplier: int = 1,
        roi_extractor: Optional['DINOv2ROIExtractor'] = None,
    ) -> Union[torch.Tensor, List[torch.Tensor]]:
        """
        Full preprocessing pipeline:
          ROI Guard → Illumination Normalisation → ImageNet Normalisation → Tensor.

        Args:
            image:                  BGR np.ndarray.
            roi_extractor:          If provided, DINOv2-based foreground crop is applied
                                    FIRST before illumination correction.
            illum_normaliser:       If provided, corrects lighting (CLAHE/Retinex).
            augmentation:           If provided, returns List[Tensor] of augmented variants.
            augmentation_multiplier: Number of augmented variants per image.
        """
        # ── 0. ROI Guard (Vision Firewall) ────────────────────────────────
        if roi_extractor is not None:
            image = roi_extractor.extract(image)

        # ── 1. Illumination correction ────────────────────────────────────
        if illum_normaliser is not None:
            image = illum_normaliser.normalize(image)

        # ── 2. Convert BGR → RGB ──────────────────────────────────────────
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # ── 3. Resize ──────────────────────────────────────────────────────
        resized = cv2.resize(rgb, cls.TARGET_SIZE, interpolation=cv2.INTER_LINEAR)

        def _to_tensor(img_rgb: np.ndarray) -> torch.Tensor:
            """ImageNet normalise and convert to (C, H, W) float tensor."""
            normalised = img_rgb.astype(np.float32) / 255.0
            normalised = (normalised - cls.IMAGENET_MEAN) / cls.IMAGENET_STD
            chw = np.transpose(normalised, (2, 0, 1))
            return torch.from_numpy(chw).float()

        # ── 4. Augmentation path (calibration only) ────────────────────────
        if augmentation is not None:
            tensors: List[torch.Tensor] = [_to_tensor(resized)]  # include original
            for _ in range(augmentation_multiplier - 1):
                aug_result = augmentation(image=resized)
                tensors.append(_to_tensor(aug_result["image"]))
            return tensors

        # ── 5. Standard path (inference / no augmentation) ────────────────
        return _to_tensor(resized)

    @classmethod
    def apply_roi_mask(cls, image: np.ndarray, mask: np.ndarray) -> np.ndarray:
        """
        Zero-out pixels outside mask.
        image: BGR
        mask: binary mask (H, W) where 1 means keep, 0 means discard.
        """
        # Ensure mask is same spatial shape
        if mask.shape != image.shape[:2]:
            mask = cv2.resize(mask, (image.shape[1], image.shape[0]), interpolation=cv2.INTER_NEAREST)
            
        mask_3d = np.expand_dims(mask, axis=2)
        return image * mask_3d

    @classmethod
    def auto_crop_product(cls, image: np.ndarray) -> Tuple[np.ndarray, BBox]:
        """
        Auto-detect product region using Otsu thresholding.
        Reduces background noise.
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Blurring to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Threshold
        _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            h, w = image.shape[:2]
            return image, BBox(0, 0, w, h, 1.0, w*h)
            
        # Largest contour assumption
        largest_cnt = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest_cnt)
        
        # Crop but keep some padding
        pad = min(10, x, y, image.shape[1] - (x+w), image.shape[0] - (y+h))
        x_p, y_p = max(0, x-pad), max(0, y-pad)
        w_p, h_p = min(image.shape[1] - x_p, w+2*pad), min(image.shape[0] - y_p, h+2*pad)
        
        cropped = image[y_p:y_p+h_p, x_p:x_p+w_p]
        
        return cropped, BBox(x=x_p, y=y_p, w=w_p, h=h_p, score=1.0, area_px=w_p*h_p)

    @classmethod
    def validate_image_quality(cls, image: np.ndarray) -> ImageQualityReport:
        warnings = []
        is_acceptable = True
        
        h, w = image.shape[:2]
        if h < 64 or w < 64:
            warnings.append(f"Image resolution too small: {w}x{h}. Minimum 64x64 required.")
            is_acceptable = False
            
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Blur check using Laplacian variance
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if laplacian_var < 100:
            warnings.append(f"Image appears blurry (Laplacian variance {laplacian_var:.1f} < 100).")
            # Might just warn, not reject
            
        # Exposure check
        mean_brightness = np.mean(gray)
        if mean_brightness < 50:
            warnings.append(f"Image is underexposed (brightness {mean_brightness:.1f} < 50).")
            is_acceptable = False
        elif mean_brightness > 200:
            warnings.append(f"Image is overexposed (brightness {mean_brightness:.1f} > 200).")
            is_acceptable = False
            
        quality_score = laplacian_var / 500.0 # Just a proxy
        
        return ImageQualityReport(
            quality_score=float(min(1.0, quality_score)),
            warnings=warnings,
            is_acceptable=is_acceptable
        )

    @classmethod
    def augment_for_calibration(cls, images: List[np.ndarray]) -> List[np.ndarray]:
        """
        Apply data augmentation to double the effective calibration set size.
        (Legacy method retained for backward compatibility.)
        """
        aug = A.Compose([
            A.HorizontalFlip(p=0.5),
            A.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.0, hue=0.0, p=0.8),
            A.Rotate(limit=5, p=0.8)
        ])
        
        augmented_images = []
        for img in images:
            # Original
            augmented_images.append(img)
            # Augmented
            aug_img = aug(image=img)["image"]
            augmented_images.append(aug_img)
            
        return augmented_images

    @classmethod
    def apply_roi_mask(cls, image: np.ndarray, mask: np.ndarray) -> np.ndarray:
        """
        Zero-out pixels outside mask.
        image: BGR
        mask: binary mask (H, W) where 1 means keep, 0 means discard.
        """
        # Ensure mask is same spatial shape
        if mask.shape != image.shape[:2]:
            mask = cv2.resize(mask, (image.shape[1], image.shape[0]), interpolation=cv2.INTER_NEAREST)
            
        mask_3d = np.expand_dims(mask, axis=2)
        return image * mask_3d

    @classmethod
    def auto_crop_product(cls, image: np.ndarray) -> Tuple[np.ndarray, BBox]:
        """
        Auto-detect product region. For maximum robustness across different phone 
        orientations and camera aspect ratios, this performs a perfect 1:1 SQUARE crop 
        from the center. This prevents vertical "squashing" geometry differences 
        when resizing to 224x224.
        """
        h, w = image.shape[:2]
        
        # Make it a perfect square based on the smaller dimension, scaled by 90%
        crop_size = int(min(h, w) * 0.90)
        
        x = (w - crop_size) // 2
        y = (h - crop_size) // 2
        
        cropped = image[y:y+crop_size, x:x+crop_size]
        
        return cropped, BBox(x=x, y=y, w=crop_size, h=crop_size, score=1.0, area_px=crop_size * crop_size)

    @classmethod
    def validate_image_quality(cls, image: np.ndarray) -> ImageQualityReport:
        warnings = []
        is_acceptable = True
        
        h, w = image.shape[:2]
        if h < 64 or w < 64:
            warnings.append(f"Image resolution too small: {w}x{h}. Minimum 64x64 required.")
            is_acceptable = False
            
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Blur check using Laplacian variance
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if laplacian_var < 100:
            warnings.append(f"Image appears blurry (Laplacian variance {laplacian_var:.1f} < 100).")
            # Might just warn, not reject
            
        # Exposure check
        mean_brightness = np.mean(gray)
        if mean_brightness < 50:
            warnings.append(f"Image is underexposed (brightness {mean_brightness:.1f} < 50).")
            is_acceptable = False
        elif mean_brightness > 200:
            warnings.append(f"Image is overexposed (brightness {mean_brightness:.1f} > 200).")
            is_acceptable = False
            
        quality_score = laplacian_var / 500.0 # Just a proxy
        
        return ImageQualityReport(
            quality_score=float(min(1.0, quality_score)),
            warnings=warnings,
            is_acceptable=is_acceptable
        )

    @classmethod
    def augment_for_calibration(cls, images: List[np.ndarray]) -> List[np.ndarray]:
        """
        Apply data augmentation to double the effective calibration set size.
        """
        aug = A.Compose([
            A.HorizontalFlip(p=0.5),
            A.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.0, hue=0.0, p=0.8),
            A.Rotate(limit=5, p=0.8)
        ])
        
        augmented_images = []
        for img in images:
            # Original
            augmented_images.append(img)
            # Augmented
            aug_img = aug(image=img)["image"]
            augmented_images.append(aug_img)
            
        return augmented_images
