import pytest
import torch
import numpy as np
from parakh_ai.core.backbone import FeatureExtractor

def test_wideresnet50_initialization():
    extractor = FeatureExtractor(backbone='wideresnet50')
    assert extractor.backbone_name == 'wideresnet50'
    assert extractor.get_feature_dim() == 1536 # layer2 (512) + layer3 (1024)

def test_singleton_behavior():
    ext1 = FeatureExtractor(backbone='wideresnet50')
    ext2 = FeatureExtractor(backbone='wideresnet50')
    assert ext1 is ext2

def test_feature_extraction():
    extractor = FeatureExtractor(backbone='wideresnet50')
    dummy_input = torch.randn(2, 3, 224, 224)
    patches = extractor.extract_patches(dummy_input)
    
    # 2 images * 28 * 28 grid = 1568 patches. Dim = 1536.
    assert patches.shape == (1568, 1536)
    
    # Check L2 normalization
    norms = torch.norm(patches, p=2, dim=1)
    assert torch.allclose(norms, torch.ones_like(norms), atol=1e-5)

def test_dinov2_feature_extraction():
    # Only test if user has network / dinov2 dependency loads properly
    extractor = FeatureExtractor(backbone='dinov2_vits14')
    assert extractor.get_feature_dim() == 384
    dummy_input = torch.randn(1, 3, 224, 224)
    patches = extractor.extract_patches(dummy_input)
    
    # 1 image * 16 * 16 grid = 256
    assert patches.shape == (256, 384)
    norms = torch.norm(patches, p=2, dim=1)
    assert torch.allclose(norms, torch.ones_like(norms), atol=1e-5)
