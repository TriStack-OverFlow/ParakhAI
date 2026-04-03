import os
import urllib.request
import tarfile
import argparse
import logging
from pathlib import Path
from tqdm import tqdm

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

MVTEC_URL_TEMPLATE = "https://www.mydrive.ch/shares/38536/3830184030e49fe74747669442f0f282/download/420938113-1629952094/{category}.tar.xz"

class DownloadProgressBar(tqdm):
    def update_to(self, b=1, bsize=1, tsize=None):
        if tsize is not None:
            self.total = tsize
        self.update(b * bsize - self.n)

def download_and_extract(category: str, data_dir: str = "data/mvtec"):
    url = MVTEC_URL_TEMPLATE.format(category=category)
    if category == "all":
        url = "https://www.mydrive.ch/shares/38536/3830184030e49fe74747669442f0f282/download/420938113-1629952094/mvtec_anomaly_detection.tar.xz"
        
    out_dir = Path(data_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    
    tar_path = out_dir / f"{category}.tar.xz"
    
    if not tar_path.exists():
        logger.info(f"Downloading {category} from {url}...")
        try:
            with DownloadProgressBar(unit='B', unit_scale=True, miniters=1, desc=category) as t:
                urllib.request.urlretrieve(url, filename=tar_path, reporthook=t.update_to)
        except Exception as e:
            logger.error(f"Failed to download {category}: {e}")
            return
            
    logger.info(f"Extracting {tar_path}...")
    try:
        with tarfile.open(tar_path) as tar:
            tar.extractall(path=out_dir)
            logger.info("Extraction complete.")
    except Exception as e:
        logger.error(f"Failed to extract {tar_path}: {e}")
        
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--categories", nargs="+", default=["leather"])
    parser.add_argument("--all", action="store_true")
    args = parser.parse_args()
    
    if args.all:
        download_and_extract("all")
    else:
        for cat in args.categories:
            download_and_extract(cat)
