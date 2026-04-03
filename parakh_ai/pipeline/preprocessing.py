import logging
import cv2
import numpy as np
import torch
from dataclasses import dataclass
from typing import Tuple, List, Optional
import albumentations as A
from parakh_ai.core.heatmap import BBox

logger = logging.getLogger(__name__)

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
    def preprocess_for_model(cls, image: np.ndarray) -> torch.Tensor:
        """
        Resize, normalize, convert to tensor.
        image: BGR numpy array
        """
        # Convert to RGB
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Resize
        resized = cv2.resize(rgb, cls.TARGET_SIZE, interpolation=cv2.INTER_LINEAR)
        
        # Normalize
        normalized = resized.astype(np.float32) / 255.0
        normalized = (normalized - cls.IMAGENET_MEAN) / cls.IMAGENET_STD
        
        # HWC to CHW
        chw = np.transpose(normalized, (2, 0, 1))
        
        return torch.from_numpy(chw).float()

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
