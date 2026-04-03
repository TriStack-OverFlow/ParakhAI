import pytest
import torch
import numpy as np
from pathlib import Path
from parakh_ai.core.coreset import CoresetSampler
from parakh_ai.core.exceptions import ParakhAIError

def test_greedy_selection():
    torch.manual_seed(42)
    np.random.seed(42)
    
    features = torch.randn(100, 256)
    sampler = CoresetSampler(target_dim=64, seed=42)
    
    # Select 10%
    indices = sampler.fit(features, ratio=0.1)
    
    assert len(indices) == 10
    assert len(set(indices)) == 10 # Check uniqueness
    
    # Select all if ratio >= 1.0
    indices_all = sampler.fit(features, ratio=1.5)
    assert len(indices_all) == 100

def test_faiss_search():
    sampler = CoresetSampler()
    # Dummy coreset of 10 points
    coreset = np.random.randn(10, 128).astype(np.float32)
    sampler.build_index(coreset)
    
    # Dummy query of 5 points
    query = np.random.randn(5, 128).astype(np.float32)
    
    distances, indices = sampler.search(query, k=1)
    assert distances.shape == (5, 1)
    assert indices.shape == (5, 1)

def test_save_load(tmp_path: Path):
    sampler = CoresetSampler()
    coreset = np.random.randn(10, 128).astype(np.float32)
    sampler.build_index(coreset)
    
    index_path = tmp_path / "model.faiss"
    sampler.save(index_path)
    assert index_path.exists()
    
    sampler_new = CoresetSampler()
    sampler_new.load(index_path)
    
    # Query both and assure they are identical
    query = np.random.randn(5, 128).astype(np.float32)
    d1, i1 = sampler.search(query)
    d2, i2 = sampler_new.search(query)
    
    np.testing.assert_allclose(d1, d2)
    np.testing.assert_array_equal(i1, i2)

def test_search_before_build():
    sampler = CoresetSampler()
    query = np.random.randn(5, 128)
    with pytest.raises(ParakhAIError):
        sampler.search(query)
