import argparse
import logging
from pathlib import Path
from parakh_ai.storage.model_store import ModelStore

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

def export(session_id: str, out_path: str):
    store = ModelStore()
    try:
        store.export_session(session_id, out_path)
        logger.info(f"Successfully exported {session_id} to {out_path}")
    except Exception as e:
        logger.error(f"Failed to export: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--session-id", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    export(args.session_id, args.out)
