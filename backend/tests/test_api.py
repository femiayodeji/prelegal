"""Tests for the FastAPI app: health API and static frontend serving."""

from fastapi.testclient import TestClient

from app.main import create_app


def test_health_returns_ok():
    with TestClient(create_app(static_dir=None)) as client:
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}


def test_serves_static_index_at_root(tmp_path):
    (tmp_path / "index.html").write_text("<html><body>home</body></html>")

    with TestClient(create_app(static_dir=tmp_path)) as client:
        resp = client.get("/")
        assert resp.status_code == 200
        assert "home" in resp.text


def test_api_takes_precedence_over_static(tmp_path):
    # A stray file that collides with the API path must not shadow /api/health.
    (tmp_path / "index.html").write_text("home")

    with TestClient(create_app(static_dir=tmp_path)) as client:
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}
