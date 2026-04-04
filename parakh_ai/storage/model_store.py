import json
import pickle
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Any, Optional

from parakh_ai.core.patchcore import PatchCore
from parakh_ai.core.padim import PaDiM
from parakh_ai.core.exceptions import SessionNotFoundError

class SessionMetadata:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)
        # Ensure backward compatibility — old saved sessions won't have this field
        if not hasattr(self, "subclass_labels"):
            self.subclass_labels: Optional[List[str]] = None
            
    def to_dict(self):
        return self.__dict__

class ModelStore:
    """
    Persistent storage for calibrated model sessions.
    """
    def __init__(self, storage_dir: str = "data/models/"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
    def save_session(self, session_id: str, model, metadata: SessionMetadata) -> Path:
        session_dir = self.storage_dir / session_id
        session_dir.mkdir(parents=True, exist_ok=True)
        
        # Save model dependent files (e.g. FAISS index or padim state)
        model.save(session_dir)
        
        # Save metadata
        metadata.updated_at = datetime.utcnow().isoformat()
        with open(session_dir / "metadata.json", "w") as f:
            json.dump(metadata.to_dict(), f, indent=4)
            
        return session_dir

    def load_session(self, session_id: str) -> Tuple[Any, SessionMetadata]: # Returns BaseAnomalyModel
        session_dir = self.storage_dir / session_id
        if not session_dir.exists():
            raise SessionNotFoundError(f"Session {session_id} not found in {self.storage_dir}")
            
        with open(session_dir / "metadata.json", "r") as f:
            meta_dict = json.load(f)
            
        metadata = SessionMetadata(**meta_dict)
        
        if metadata.model_type.lower() == 'patchcore':
            model = PatchCore(backbone=metadata.backbone) # assuming device handled downstream
            model.load(session_dir)
        elif metadata.model_type.lower() == 'padim':
            model = PaDiM(backbone=metadata.backbone)
            model.load(session_dir)
        else:
            raise ValueError(f"Unknown model type: {metadata.model_type}")
            
        return model, metadata

    def list_sessions(self) -> List[SessionMetadata]:
        sessions = []
        for p in self.storage_dir.iterdir():
            if p.is_dir() and (p / "metadata.json").exists():
                with open(p / "metadata.json", "r") as f:
                    try:
                        sessions.append(SessionMetadata(**json.load(f)))
                    except Exception:
                        pass
        return sessions

    def delete_session(self, session_id: str) -> None:
        session_dir = self.storage_dir / session_id
        if session_dir.exists():
            import shutil
            shutil.rmtree(session_dir)

    def export_session(self, session_id: str, export_path: str) -> None:
        session_dir = self.storage_dir / session_id
        if not session_dir.exists():
            raise SessionNotFoundError(f"Session {session_id} not found.")
        import shutil
        shutil.make_archive(export_path.replace(".zip", ""), 'zip', session_dir)
