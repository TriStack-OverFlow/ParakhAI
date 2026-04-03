import pytest
import torch
import numpy as np
from pathlib import Path

from parakh_ai.core.padim import PaDiM
from parakh_ai.core.exceptions import ParakhAIError

def test_padim_fit_predict(tmp_path: Path):
    torch.manual_seed(42)
    np.random.seed(42)
    
    # 5 dummy images, 3 channels, 224x224
    images = torch.ones(5, 3, 224, 224)
    images += torch.randn_like(images) * 0.01

    model = PaDiM(backbone='wideresnet50', d_reduced=50) # Set lower d for faster test
    
    with pytest.raises(ParakhAIError):
        model.predict(images[0:1])
        
    result = model.fit(images, session_id="test_sess_padim")
    
    assert result.n_images_used == 5
    assert result.threshold > 0.0
    
    # Predict normal
    pred_normal = model.predict(images[0:1])
    assert not pred_normal.is_defective
    
    # Create defective image
    defective_image = torch.ones(1, 3, 224, 224)
    defective_image[0, :, 50:100, 50:100] += 5.0
    
    pred_defect = model.predict(defective_image)
    
    assert pred_defect.anomaly_score > pred_normal.anomaly_score
    
    # Test save load
    model.save(tmp_path)
    
    new_model = PaDiM(backbone='wideresnet50', d_reduced=50)
    new_model.load(tmp_path)
    
    pred_defect_new = new_model.predict(defective_image)
    assert np.isclose(pred_defect.anomaly_score, pred_defect_new.anomaly_score, atol=1e-5)

def test_toy_mahalanobis():
    # Test computation on toy gaussian
    model = PaDiM(backbone='wideresnet50', d_reduced=2, epsilon=0.0)
    
    model.idx_selected = np.array([0, 1])
    # 2x2 grid
    model.means = torch.zeros(2, 2, 2)
    model.precisions = torch.eye(2).unsqueeze(0).unsqueeze(0).repeat(2, 2, 1, 1) # (2,2,2,2) with eyes
    model._is_fitted = True
    model.threshold = 5.0
    model.score_p50 = 1.0
    
    # Feature for dist compute
    features = torch.tensor([[[[3.0, 4.0], [0.0, 0.0]], [[0.0, 0.0], [0.0, 0.0]]]]) # (1, 2, 2, 2)
    score, amap = model._compute_distance(features)
    
    # Dist of [3,4] is 5
    assert np.isclose(score, 5.0)
    assert np.isclose(amap[0,0], 5.0)
