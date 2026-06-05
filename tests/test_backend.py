import pytest
import json
from server import app

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json["status"] == "ok"

def test_analyze_missing_url(client):
    res = client.post("/analyze", json={})
    assert res.status_code == 400

def test_analyze_invalid_url(client):
    res = client.post("/analyze", json={"repo_url": "https://notgithub.com/foo"})
    assert res.status_code == 400

def test_analyze_valid_url(client):
    # reset rate limiter before testing valid url so we don't get 429
    import utils.rate_limiter as rl
    if hasattr(rl, '_hits'):
        rl._hits.clear()
        
    res = client.post("/analyze", json={"repo_url": "https://github.com/pallets/flask"})
    assert res.status_code == 202
    assert "session_id" in res.json

def test_stream_unknown_session(client):
    res = client.get("/stream/unknown")
    assert res.status_code == 200
    data = res.get_data(as_text=True)
    assert 'session not found' in data

def test_sessions_list(client):
    res = client.get("/sessions")
    assert res.status_code == 200
    assert isinstance(res.json, list)

def test_rate_limit(client):
    import utils.rate_limiter as rl
    if hasattr(rl, '_hits'):
        rl._hits.clear()

    # The request limit is 10 max
    for _ in range(10):
        client.post("/analyze", json={"repo_url": "https://github.com/pallets/flask"})
        
    res = client.post("/analyze", json={"repo_url": "https://github.com/pallets/flask"})
    assert res.status_code == 429

def test_export_missing(client):
    res = client.get("/export/nosuchsession")
    assert res.status_code == 404
