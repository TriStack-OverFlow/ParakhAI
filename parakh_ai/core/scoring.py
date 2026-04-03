import logging
import numpy as np
from sklearn.metrics import roc_auc_score, f1_score, precision_recall_curve, auc
from scipy.ndimage import label
from typing import List, Tuple

logger = logging.getLogger(__name__)

def compute_auroc(normal_scores: List[float], defect_scores: List[float]) -> float:
    y_true = [0] * len(normal_scores) + [1] * len(defect_scores)
    y_scores = normal_scores + defect_scores
    if len(np.unique(y_true)) < 2:
        return float('nan')
    return float(roc_auc_score(y_true, y_scores))

def compute_aupro(anomaly_maps: List[np.ndarray], ground_truth_masks: List[np.ndarray], max_fpr: float = 0.3, num_thresholds: int = 100) -> float:
    """
    Pixel-level AUPRO using connected component analysis on GT masks.
    """
    if not anomaly_maps or not ground_truth_masks:
        return 0.0
        
    flat_maps = np.concatenate([m.flatten() for m in anomaly_maps])
    flat_gts = np.concatenate([m.flatten() for m in ground_truth_masks])
    
    # Ground truth backgrounds
    total_negative_pixels = float(np.sum(flat_gts == 0))
    if total_negative_pixels == 0:
        return 0.0
        
    thresholds = np.linspace(np.min(flat_maps), np.max(flat_maps), num_thresholds)
    fprs = []
    pros = []
    
    for t in thresholds:
        fpr = np.sum((flat_maps >= t) & (flat_gts == 0)) / total_negative_pixels
        
        pro_scores = []
        for amap, gt in zip(anomaly_maps, ground_truth_masks):
            pred_mask = (amap >= t)
            # Find connected components in GT
            labeled_gt, num_features = label(gt > 0)
            if num_features == 0:
                continue
                
            for i in range(1, num_features + 1):
                component_mask = (labeled_gt == i)
                component_size = np.sum(component_mask)
                overlap = np.sum(component_mask & pred_mask)
                pro_scores.append(overlap / float(component_size))
                
        mean_pro = np.mean(pro_scores) if pro_scores else 1.0
        
        fprs.append(fpr)
        pros.append(mean_pro)
        
    fprs = np.array(fprs)
    pros = np.array(pros)
    
    # Filter by max_fpr
    valid_idx = fprs <= max_fpr
    fprs_valid = fprs[valid_idx]
    pros_valid = pros[valid_idx]
    
    # Need to sort fprs in ascending order for auc
    sort_idx = np.argsort(fprs_valid)
    fprs_valid = fprs_valid[sort_idx]
    pros_valid = pros_valid[sort_idx]
    
    if len(fprs_valid) < 2:
        return 0.0
        
    # Normalize AUC to [0, 1] by dividing by max_fpr
    aupro = auc(fprs_valid, pros_valid) / max_fpr
    return float(aupro)

def find_optimal_threshold(normal_scores: List[float], percentile: float = 99.0) -> float:
    if not normal_scores:
        return 0.0
    return float(np.percentile(normal_scores, percentile))

def normalize_scores(scores: np.ndarray, ref_min: float, ref_max: float) -> np.ndarray:
    range_val = ref_max - ref_min
    if range_val <= 0:
        range_val = 1e-5
    normalized = (scores - ref_min) / range_val
    return np.clip(normalized, 0.0, 1.0)

def compute_f1_at_threshold(scores: List[float], labels: List[int], threshold: float) -> float:
    preds = [1 if s >= threshold else 0 for s in scores]
    return float(f1_score(labels, preds, zero_division=0))

def compute_precision_recall_curve(scores: List[float], labels: List[int]) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    precision, recall, thresholds = precision_recall_curve(labels, scores)
    return precision, recall, thresholds
