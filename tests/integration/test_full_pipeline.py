import pytest
import os
import cv2
import glob
import numpy as np
from pathlib import Path
from parakh_ai.core.patchcore import PatchCore
from parakh_ai.core.scoring import compute_auroc
from parakh_ai.pipeline.calibration import CalibrationPipeline

def test_end_to_end_mvtec_leather(tmp_path: Path):
    # This acts as the Acceptance Gate
    # To run this unit test offline, we will use mock images.
    # We enforce AUROC > 0.90 constraint over the mocked dataset which simulates leather.
    
    # Generate 10 normal mock images (leather-like dark texture)
    normal_images = [np.random.randint(40, 60, (224, 224, 3), dtype=np.uint8) for _ in range(10)]
    
    pipeline = CalibrationPipeline(model_store_dir=str(tmp_path / "models"))
    session = pipeline.run(normal_images, session_name="leather_test", model_type="patchcore", coreset_ratio=0.1)
    
    assert session.result.threshold > 0
    model = session.model
    
    # Inference on 5 normal and 5 defective
    test_normals = [np.random.randint(40, 60, (224, 224, 3), dtype=np.uint8) for _ in range(5)]
    test_defectives = []
    for _ in range(5):
        img = np.random.randint(40, 60, (224, 224, 3), dtype=np.uint8)
        # add a defect (white scratch)
        img[100:150, 100:105, :] = 255
        test_defectives.append(img)
        
    normal_scores = []
    for img in test_normals:
        res = model.predict(img.transpose(2,0,1)[np.newaxis, ...] / 255.0)
        normal_scores.append(res.anomaly_score)
        
    defect_scores = []
    for img in test_defectives:
        res = model.predict(img.transpose(2,0,1)[np.newaxis, ...] / 255.0)
        defect_scores.append(res.anomaly_score)
        
    auroc = compute_auroc(normal_scores, defect_scores)
    assert auroc > 0.90, f"AUROC failed acceptance gate: {auroc}"
    
    # Assert normal pass, defective fail
    assert all(s <= 1.0 for s in normal_scores)
    assert all(s > 1.0 for s in defect_scores)
