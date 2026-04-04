import logging
from typing import List
from fastapi import APIRouter, HTTPException

from parakh_ai.storage.model_store import ModelStore
from parakh_ai.api.schemas import SessionMetadataResponse

router = APIRouter()
logger = logging.getLogger(__name__)

store = ModelStore()

@router.get("", response_model=List[dict])
def list_sessions():
    try:
        sessions = store.list_sessions()
        return [s.to_dict() for s in sessions]
    except Exception as e:
        import traceback
        return [{"error": str(e), "trace": traceback.format_exc()}]

@router.get("/{session_id}", response_model=SessionMetadataResponse)
def get_session(session_id: str):
    try:
        _, metadata = store.load_session(session_id)
        return metadata.to_dict()
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/{session_id}")
def delete_session(session_id: str):
    store.delete_session(session_id)
    return {"status": "deleted", "session_id": session_id}

@router.get("/{session_id}/export")
def export_session(session_id: str):
    # normally this would return a FileResponse
    return {"status": "not implemented in simple api mock"}
