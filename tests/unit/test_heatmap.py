import pytest
import numpy as np
import cv2

from parakh_ai.core.heatmap import generate_heatmap

def test_generate_heatmap():
    # 100x100 white image
    original = np.full((100, 100, 3), 255, dtype=np.uint8)
    
    # 10x10 zero map
    anomaly_map_zero = np.zeros((10, 10), dtype=np.float32)
    
    res_pass = generate_heatmap(original, anomaly_map_zero, fail_threshold=0.75, warn_threshold=0.5)
    
    assert res_pass.overlay_image.shape == (100, 100, 3)
    assert res_pass.severity == 'PASS'
    assert res_pass.defect_coverage_pct == 0.0
    assert len(res_pass.defect_bboxes) == 0
    
    # Center defective
    anomaly_map_defect = np.zeros((10, 10), dtype=np.float32)
    anomaly_map_defect[4:6, 4:6] = 0.9
    
    res_fail = generate_heatmap(original, anomaly_map_defect, fail_threshold=0.75, warn_threshold=0.5, blur_sigma=0.0, min_contour_area=1)
    
    assert res_fail.severity == 'FAIL'
    assert len(res_fail.defect_bboxes) > 0
    assert res_fail.defect_coverage_pct > 0.0

def test_generate_heatmap_warn():
    original = np.full((100, 100, 3), 255, dtype=np.uint8)
    anomaly_map_warn = np.zeros((10, 10), dtype=np.float32)
    anomaly_map_warn[4:6, 4:6] = 0.6
    
    res_warn = generate_heatmap(original, anomaly_map_warn, fail_threshold=0.75, warn_threshold=0.5, blur_sigma=0.0, min_contour_area=1)
    
    assert res_warn.severity == 'WARN'
    assert len(res_warn.defect_bboxes) > 0
