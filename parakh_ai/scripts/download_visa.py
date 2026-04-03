import os
import argparse
import logging
from pathlib import Path

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

def download_and_extract(category: str, data_dir: str = "data/visa"):
    out_dir = Path(data_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    logger.info(f"Downloading VisA category: {category} (Mock implementation)")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--categories", nargs="+", default=["capsules"])
    parser.add_argument("--all", action="store_true")
    args = parser.parse_args()
    
    if args.all:
        download_and_extract("all")
    else:
        for cat in args.categories:
            download_and_extract(cat)
