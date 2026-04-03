import pytest
import numpy as np

from parakh_ai.core.scoring import (
    compute_auroc, 
    compute_aupro, 
    find_optimal_threshold, 
    normalize_scores, 
    compute_f1_at_threshold,
    compute_precision_recall_curve
)

def test_compute_auroc():
    normal = [0.1, 0.2, 0.3]
    defect = [0.8, 0.9]
    auroc = compute_auroc(normal, defect)
    assert auroc == 1.0
    
    # Overlap
    auroc_bad = compute_auroc([0.5, 0.6], [0.4, 0.7])
    assert auroc_bad < 1.0

def test_find_optimal_threshold():
    scores = list(np.linspace(0, 100, 101)) # 0 to 100
    thresh = find_optimal_threshold(scores, percentile=99.0)
    assert np.isclose(thresh, 99.0)

def test_normalize_scores():
    scores = np.array([0.0, 0.5, 1.0])
    normalized = normalize_scores(scores, ref_min=0.0, ref_max=1.0)
    np.testing.assert_array_almost_equal(normalized, [0.0, 0.5, 1.0])

def test_compute_f1():
    scores = [0.1, 0.2, 0.8, 0.9]
    labels = [0, 0, 1, 1]
    f1 = compute_f1_at_threshold(scores, labels, threshold=0.5)
    assert f1 == 1.0

def test_compute_aupro():
    # 10x10 zero mask
    gt_mask1 = np.zeros((10, 10), dtype=np.uint8)
    gt_mask2 = np.zeros((10, 10), dtype=np.uint8)
    
    # Add defect
    gt_mask2[4:6, 4:6] = 255
    
    # Predictions exactly match gt loosely
    pred_map1 = np.zeros((10, 10), dtype=np.float32)
    pred_map2 = np.zeros((10, 10), dtype=np.float32)
    pred_map2[4:6, 4:6] = 1.0
    
    aupro = compute_aupro([pred_map1, pred_map2], [gt_mask1, gt_mask2], num_thresholds=10)
    # Perfect prediction will yield very high AUPRO up to any FPR.
    assert aupro > 0.9

def test_precision_recall():
    scores = [0.1, 0.2, 0.8, 0.9]
    labels = [0, 0, 1, 1]
    p, r, t = compute_precision_recall_curve(scores, labels)
    assert len(p) > 0
