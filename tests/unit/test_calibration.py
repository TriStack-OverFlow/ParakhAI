import pytest
import numpy as np
from pathlib import Path
from parakh_ai.pipeline.calibration import CalibrationPipeline, CalibrationError

def test_calibration_pipeline_validation():
    pipeline = CalibrationPipeline(model_store_dir="data/test_models/")
    p1 = np.ones((100, 100, 3), dtype=np.uint8) * 200
    
    # < 5 images -> errors
    with pytest.raises(CalibrationError):
        pipeline._validate_input([p1] * 4)
        
    # Identical images log warning but no exception
    pipeline._validate_input([p1] * 6)

def test_calibration_pipeline_e2e(tmp_path: Path):
    pipeline = CalibrationPipeline(model_store_dir=str(tmp_path))
    
    images = [
        np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8) for _ in range(5)
    ]
    
    progress_updates = []
    def cb(val, msg):
        progress_updates.append(val)
        
    session = pipeline.run(images, session_name="test_sess", progress_callback=cb)
    
    assert session.session_id == "test_sess"
    assert session.result.threshold > 0.0
    
    assert len(progress_updates) >= 5
    assert progress_updates[-1] == 1.0

    assert (tmp_path / "test_sess").exists()
