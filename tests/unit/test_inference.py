import pytest
import numpy as np
from pathlib import Path
from parakh_ai.pipeline.inference import InferencePipeline
from parakh_ai.storage.model_store import ModelStore, SessionMetadata
from parakh_ai.storage.defect_log import DefectLog
from parakh_ai.core.patchcore import PatchCore

def test_model_store_and_inference(tmp_path: Path):
    store = ModelStore(storage_dir=str(tmp_path / "models"))
    log = DefectLog(db_path=str(tmp_path / "parakh.db"))
    pipeline = InferencePipeline(model_store=store, defect_log=log)
    
    # 1. Create a dummy session
    import torch
    model = PatchCore()
    images = torch.ones(5, 3, 224, 224)
    model.fit(images, session_id="test1")
    
    meta = SessionMetadata(model_type="patchcore", backbone="wideresnet50")
    store.save_session("test1", model, metadata=meta)
    
    # 2. Run inference
    dummy_img = np.ones((224, 224, 3), dtype=np.uint8)
    res = pipeline.infer_single(dummy_img, "test1")
    
    assert res.session_id == "test1"
    assert res.heatmap_b64 is not None
    assert not res.is_defective
    
    # 3. Check defect log
    rate = log.get_defect_rate("test1")
    assert rate == 0.0
