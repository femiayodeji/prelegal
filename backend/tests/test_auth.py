"""Tests for authentication: password hashing and the auth API."""

from fastapi.testclient import TestClient

from app import auth
from app.main import create_app


def test_password_hash_roundtrip_and_uniqueness():
    h1 = auth.hash_password("correct horse")
    h2 = auth.hash_password("correct horse")
    assert h1 != h2  # random salt → different encodings
    assert auth.verify_password("correct horse", h1)
    assert not auth.verify_password("wrong", h1)
    assert not auth.verify_password("correct horse", "not$a$valid$hash")


def test_signup_logs_in_and_normalizes_email():
    with TestClient(create_app(static_dir=None)) as client:
        resp = client.post(
            "/api/auth/signup",
            json={"email": "Ada@Example.com", "password": "password123", "displayName": "Ada"},
        )
        assert resp.status_code == 200
        assert resp.json() == {"email": "ada@example.com", "displayName": "Ada"}
        # The session cookie authenticates a follow-up request.
        assert client.get("/api/auth/me").json()["email"] == "ada@example.com"


def test_duplicate_email_is_rejected():
    with TestClient(create_app(static_dir=None)) as client:
        client.post(
            "/api/auth/signup", json={"email": "dup@example.com", "password": "password123"}
        )
        resp = client.post(
            "/api/auth/signup", json={"email": "dup@example.com", "password": "password123"}
        )
        assert resp.status_code == 409


def test_short_password_is_rejected():
    with TestClient(create_app(static_dir=None)) as client:
        resp = client.post(
            "/api/auth/signup", json={"email": "x@example.com", "password": "short"}
        )
        assert resp.status_code == 422


def test_login_requires_correct_password():
    with TestClient(create_app(static_dir=None)) as client:
        client.post(
            "/api/auth/signup", json={"email": "log@example.com", "password": "password123"}
        )
        client.post("/api/auth/logout")
        bad = client.post(
            "/api/auth/login", json={"email": "log@example.com", "password": "nope"}
        )
        assert bad.status_code == 401
        good = client.post(
            "/api/auth/login", json={"email": "log@example.com", "password": "password123"}
        )
        assert good.status_code == 200


def test_me_requires_authentication():
    with TestClient(create_app(static_dir=None)) as client:
        assert client.get("/api/auth/me").status_code == 401


def test_logout_clears_the_session():
    with TestClient(create_app(static_dir=None)) as client:
        client.post(
            "/api/auth/signup", json={"email": "out@example.com", "password": "password123"}
        )
        assert client.get("/api/auth/me").status_code == 200
        client.post("/api/auth/logout")
        assert client.get("/api/auth/me").status_code == 401
