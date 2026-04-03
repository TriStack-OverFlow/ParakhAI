from fastapi.testclient import TestClient
from parakh_ai.api.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_list_sessions():
    response = client.get("/api/v1/sessions")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_nonexistent_session():
    response = client.get("/api/v1/sessions/invalid_session_id")
    assert response.status_code == 404
