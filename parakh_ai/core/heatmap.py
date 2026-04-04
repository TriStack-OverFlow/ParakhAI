import logging
import cv2
import numpy as np
from dataclasses import dataclass
from typing import List, Literal, Tuple
from scipy.ndimage import gaussian_filter

logger = logging.getLogger(__name__)

@dataclass
class BBox:
    x: int
    y: int
    w: int
    h: int
    score: float
    area_px: int

@dataclass
class HeatmapResult:
    overlay_image: np.ndarray # BGR
    defect_bboxes: List[BBox]
    severity: Literal['PASS', 'WARN', 'FAIL']
    max_anomaly_score: float
    defect_coverage_pct: float

def generate_heatmap(
    original_image: np.ndarray, 
    anomaly_map: np.ndarray, 
    threshold: float = 1.0, 
    colormap: int = cv2.COLORMAP_JET, 
    alpha: float = 0.4, 
    blur_sigma: float = 2.0, 
    min_contour_area: int = 50,
    warn_threshold: float = 0.5,
    fail_threshold: float = 0.75
) -> HeatmapResult:
    """
    Generate heatmap overlay with bounding boxes and severity labels.
    original_image: (H, W, 3) BGR uint8
    anomaly_map: (H', W') float32. Pre-normalized where max(anomaly_map) corresponds to max_anomaly_score.
    """
    img_h, img_w = original_image.shape[:2]
    
    # 1. Upsample to original resolution
    if anomaly_map.shape[:2] != (img_h, img_w):
        anomaly_map_resized = cv2.resize(anomaly_map, (img_w, img_h), interpolation=cv2.INTER_LINEAR)
    else:
        anomaly_map_resized = anomaly_map.copy()
        
    # 2. Gaussian Blur
    anomaly_map_smoothed = gaussian_filter(anomaly_map_resized, sigma=blur_sigma)
    
    # 2.5 Suppress Edge/Background Bloom (Hackathon Fix)
    # The anomaly map is often stretched over the full webcam frame causing the
    # background/edges to artificially glow. We enforce a strict 15% zero-margin.
    margin_y = int(img_h * 0.15)
    margin_x = int(img_w * 0.15)
    if margin_y > 0 and margin_x > 0:
        anomaly_map_smoothed[:margin_y, :] = 0
        anomaly_map_smoothed[-margin_y:, :] = 0
        anomaly_map_smoothed[:, :margin_x] = 0
        anomaly_map_smoothed[:, -margin_x:] = 0

    
    # 3. Scale dynamically to standard thresholds instead of image p99 noise
    # Any Z-score above 1.5x fail_threshold will be saturated 100% RED.
    # A Z-score of 0 is 0% RED (Blue). This stops clean images from turning Red.
    max_val = max(fail_threshold * 1.5, 1e-5)
    normalized_map = np.clip(anomaly_map_smoothed / max_val, 0.0, 1.0)
    
    # Mild gamma to slightly lift mid-range anomalies (1.4 instead of 2.0)
    # so crumple texture at Z ≈ 1.5 is visible as light orange, not dark blue.
    normalized_map = np.power(normalized_map, 1.4)
    
    uint_map = (normalized_map * 255).astype(np.uint8)
    
    # 4. Colormap
    colored_heatmap = cv2.applyColorMap(uint_map, colormap)
    
    # 5. Blend
    overlay = cv2.addWeighted(colored_heatmap, alpha, original_image, 1 - alpha, 0)
    
    # 6. Find High-Anomaly Regions
    max_anomaly_score = float(np.max(anomaly_map_smoothed))
    
    # Threshold for contours (e.g. 80th percentile of map or absolute scalar? Spec says 80th percentile of map)
    # Actually if map is mostly 0, 80th percentile is 0. We should filter absolutely or just use 80th %ile of >0?
    # Better: contour threshold is warn_threshold
    contour_mask = (anomaly_map_smoothed > warn_threshold).astype(np.uint8) * 255
    contours, _ = cv2.findContours(contour_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    defect_bboxes = []
    defect_area_total = 0
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area >= min_contour_area:
            x, y, w, h = cv2.boundingRect(cnt)
            score = float(np.max(anomaly_map_smoothed[y:y+h, x:x+w]))
            defect_bboxes.append(BBox(x=x, y=y, w=w, h=h, score=score, area_px=int(area)))
            defect_area_total += area
            
            # Draw box on overlay
            color = (0, 0, 255) if score >= fail_threshold else (0, 255, 255)
            cv2.rectangle(overlay, (x, y), (x+w, y+h), color, 2)
            # Label
            cv2.putText(overlay, f"{score:.2f}", (x, y-5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

    defect_coverage_pct = (defect_area_total / (img_h * img_w)) * 100.0
    
    # 7. Severity
    if max_anomaly_score >= fail_threshold:
        severity = 'FAIL'
    elif max_anomaly_score >= warn_threshold:
        severity = 'WARN'
    else:
        severity = 'PASS'
        
    # Draw badge
    badge_colors = {
        'FAIL': (0, 0, 255),
        'WARN': (0, 255, 255),
        'PASS': (0, 255, 0)
    }
    cv2.putText(overlay, severity, (img_w - 80, 30), cv2.FONT_HERSHEY_SIMPLEX, 1.0, badge_colors[severity], 2)
    
    return HeatmapResult(
        overlay_image=overlay,
        defect_bboxes=defect_bboxes,
        severity=severity,
        max_anomaly_score=max_anomaly_score,
        defect_coverage_pct=defect_coverage_pct
    )
