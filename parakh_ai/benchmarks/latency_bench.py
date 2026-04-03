import time
import torch
import logging
from parakh_ai.core.patchcore import PatchCore

logger = logging.getLogger(__name__)

def profile_inference_latency(model, n_warmup=10, n_runs=100):
    images = torch.ones(1, 3, 224, 224)
    logger.info(f"Warming up for {n_warmup} runs...")
    for _ in range(n_warmup):
        model.predict(images)
        
    logger.info(f"Profiling over {n_runs} runs...")
    times = []
    for _ in range(n_runs):
        start = time.time()
        model.predict(images)
        times.append(time.time() - start)
        
    times_ms = [t * 1000 for t in times]
    import numpy as np
    
    report = {
        "P50 latency ms": np.percentile(times_ms, 50),
        "P95 latency ms": np.percentile(times_ms, 95),
        "P99 latency ms": np.percentile(times_ms, 99)
    }
    logger.info(f"Latency Report: {report}")
    return report

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    model = PatchCore(coreset_ratio=0.01)
    # mock fit
    model.fit(torch.ones(5, 3, 224, 224))
    profile_inference_latency(model)
