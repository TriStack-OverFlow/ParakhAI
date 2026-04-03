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


# ---------------------------------------------------------------------------
# TestSubclassAwarePatchCore
# ---------------------------------------------------------------------------

class TestSubclassAwarePatchCore:
    """Tests for SubclassAwarePatchCore multi-subclass routing and training."""

    @staticmethod
    def _make_bgr_images(n: int, value: int = 128) -> list:
        """Return n synthetic BGR uint8 images of 64x64."""
        return [np.ones((64, 64, 3), dtype=np.uint8) * value for _ in range(n)]

    def test_fit_two_subclasses(self, tmp_path):
        """Fitting with two subclasses should create two PatchCore instances."""
        from parakh_ai.core.patchcore import SubclassAwarePatchCore
        import unittest.mock as mock

        model = SubclassAwarePatchCore(coreset_ratio=0.5)

        # Mock _embed_image so tests don't need DINOv2 downloaded
        model._embed_image = mock.Mock(return_value=np.array([1.0, 0.0]))

        images_a = self._make_bgr_images(5, value=100)
        images_b = self._make_bgr_images(5, value=200)

        model.fit({"classA": images_a, "classB": images_b})

        assert len(model.subclass_models) == 2
        assert "classA" in model.subclass_models
        assert "classB" in model.subclass_models
        assert model._is_fitted

    def test_routing_correct_subclass(self):
        """Router should select the subclass whose embedding is closest to the query."""
        from parakh_ai.core.patchcore import SubclassAwarePatchCore
        import unittest.mock as mock

        model = SubclassAwarePatchCore(coreset_ratio=0.5)
        model._embed_image = mock.Mock(return_value=np.array([1.0, 0.0]))  # will match classA

        images_a = self._make_bgr_images(5, value=100)
        images_b = self._make_bgr_images(5, value=200)
        model.fit({"classA": images_a, "classB": images_b})

        # Override embeddings so classA is clearly closer to [1, 0]
        model.subclass_embeddings["classA"] = np.array([1.0, 0.0])
        model.subclass_embeddings["classB"] = np.array([0.0, 1.0])

        # Make _embed_image return classA-like vector for the test image
        model._embed_image = mock.Mock(return_value=np.array([0.99, 0.01]))

        test_img = self._make_bgr_images(1)[0]
        selected = model._route(test_img)
        assert selected == "classA"

    def test_single_subclass_backward_compat(self):
        """Single-subclass usage must behave identically to plain PatchCore."""
        from parakh_ai.core.patchcore import SubclassAwarePatchCore
        import unittest.mock as mock

        model = SubclassAwarePatchCore(coreset_ratio=0.5)
        model._embed_image = mock.Mock(return_value=np.array([1.0, 0.0]))

        images = self._make_bgr_images(5)
        model.fit({"only_class": images})

        assert len(model.subclass_models) == 1

        # _route should return the single label without computing cosine sim
        test_img = self._make_bgr_images(1)[0]
        label = model._route(test_img)
        assert label == "only_class"
        # _embed_image should NOT have been called for routing (1 subclass shortcut)
        # embed_image is called during fit; call count must be exactly 5 (one per image)
        assert model._embed_image.call_count == 5
