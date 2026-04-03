import pytest
import torch
import numpy as np
from pathlib import Path

from parakh_ai.core.patchcore import PatchCore
from parakh_ai.core.exceptions import ParakhAIError

def test_patchcore_fit_predict(tmp_path: Path):
    torch.manual_seed(42)
    np.random.seed(42)
    
    # 5 dummy images, 3 channels, 224x224
    images = torch.ones(5, 3, 224, 224)
    # Add slight noise
    images += torch.randn_like(images) * 0.01

    model = PatchCore(backbone='wideresnet50', coreset_ratio=0.1)
    
    with pytest.raises(ParakhAIError):
        model.predict(images[0:1])
        
    result = model.fit(images, session_id="test_sess")
    
    assert result.n_images_used == 5
    assert result.threshold > 0.0
    
    # Predict normal
    pred_normal = model.predict(images[0:1])
    assert not pred_normal.is_defective
    
    # Create defective image
    defective_image = torch.ones(1, 3, 224, 224)
    # Add strong noise in a block
    defective_image[0, :, 50:100, 50:100] += 5.0
    
    pred_defect = model.predict(defective_image)
    
    assert pred_defect.anomaly_score > pred_normal.anomaly_score
    
    # Test save load
    model.save(tmp_path)
    
    new_model = PatchCore(backbone='wideresnet50', coreset_ratio=0.1)
    new_model.load(tmp_path)
    
    pred_defect_new = new_model.predict(defective_image)
    # Tolerance due to FAISS load or fp32 operations
    assert np.isclose(pred_defect.anomaly_score, pred_defect_new.anomaly_score, atol=1e-5)

def test_predict_batch():
    images = torch.ones(3, 3, 224, 224)
    model = PatchCore(backbone='wideresnet50', coreset_ratio=0.1)
    model.fit(images)
    
    results = model.predict_batch(images)
    assert len(results) == 3
