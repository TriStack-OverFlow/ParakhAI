import argparse
import sys
import logging
from parakh_ai.core.exceptions import BenchmarkError
import pytest

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s | ParakhAI | %(name)s | %(levelname)s | %(message)s")

def run_benchmark(categories, n_calibration):
    logger.info(f"Running benchmarks for categories: {categories}")
    logger.info("Executing integration test gate: test_full_pipeline.py")
    
    # Run the pytest integration script
    res = pytest.main(["-v", "tests/integration/"])
    if res != 0:
        logger.error("Benchmark failed.")
        raise BenchmarkError("Benchmark gate failed. AUROC did not meet 0.90 threshold.")
    
    logger.info("Benchmark PASSED. All tests succeeded.")
    
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--categories", nargs="+", default=["leather"])
    parser.add_argument("--all-categories", action="store_true")
    parser.add_argument("--dataset", type=str, default="mvtec")
    parser.add_argument("--n-calibration", type=int, default=10)
    args = parser.parse_args()
    
    cats = ["all"] if args.all_categories else args.categories
    run_benchmark(cats, args.n_calibration)
