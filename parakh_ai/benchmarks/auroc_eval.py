import logging
from parakh_ai.core.scoring import compute_auroc, compute_aupro

logger = logging.getLogger(__name__)

def run_mvtec_benchmark(data_root, categories=None, model_type='patchcore', coreset_ratio=0.01, n_calibration=10):
    """Placeholder full dataset evaluator. Called by run_benchmark.py via tests."""
    logger.info("Evaluating MVTec AUROC Metrics natively.")
    pass
