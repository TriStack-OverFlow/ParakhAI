import pytest
import numpy as np
import torch
from parakh_ai.pipeline.preprocessing import Preprocessor

def test_preprocess_for_model():
    # BGR image of 300x400
    image = np.ones((300, 400, 3), dtype=np.uint8) * 128
    tensor = Preprocessor.preprocess_for_model(image)
    
    assert tensor.shape == (3, 224, 224)
    assert isinstance(tensor, torch.Tensor)
    
def test_apply_roi_mask():
    image = np.ones((100, 100, 3), dtype=np.uint8)
    mask = np.zeros((100, 100), dtype=np.uint8)
    mask[25:75, 25:75] = 1
    
    masked = Preprocessor.apply_roi_mask(image, mask)
    assert masked.shape == (100, 100, 3)
    assert masked[0, 0, 0] == 0
    assert masked[50, 50, 0] == 1

def test_validate_image_quality():
    # Good
    img_good = np.random.randint(100, 150, (100, 100, 3), dtype=np.uint8)
    report_good = Preprocessor.validate_image_quality(img_good)
    
    # Blurry proxy test (random noise has high Laplacian, so we need a smooth image for bad score)
    img_blurry = np.ones((100, 100, 3), dtype=np.uint8) * 128
    report_blurry = Preprocessor.validate_image_quality(img_blurry)
    # Uniform image has 0 variance
    assert any("blurry" in w for w in report_blurry.warnings)

def test_augment_for_calibration():
    images = [np.ones((100, 100, 3), dtype=np.uint8)]
    augmented = Preprocessor.augment_for_calibration(images)
    
    assert len(augmented) == 2
