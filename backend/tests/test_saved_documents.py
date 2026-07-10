"""Tests for the saved-documents API: auth, CRUD, and ownership isolation."""

from fastapi.testclient import TestClient

from app.main import create_app

DOC = {
    "documentType": "CSA.md",
    "title": "CSA for Acme",
    "fields": [{"label": "Governing Law", "value": "Delaware"}],
}


def _signup(client: TestClient, email: str) -> None:
    assert (
        client.post(
            "/api/auth/signup", json={"email": email, "password": "password123"}
        ).status_code
        == 200
    )


def test_saved_documents_require_authentication():
    with TestClient(create_app(static_dir=None)) as client:
        assert client.get("/api/saved-documents").status_code == 401
        assert client.post("/api/saved-documents", json=DOC).status_code == 401


def test_create_list_get_update_delete_flow():
    with TestClient(create_app(static_dir=None)) as client:
        _signup(client, "owner@example.com")

        created = client.post("/api/saved-documents", json=DOC)
        assert created.status_code == 201
        doc_id = created.json()["id"]
        assert created.json()["fields"][0]["value"] == "Delaware"

        listing = client.get("/api/saved-documents").json()
        assert [d["id"] for d in listing] == [doc_id]
        assert "fields" not in listing[0]  # summary only

        fetched = client.get(f"/api/saved-documents/{doc_id}").json()
        assert fetched["title"] == "CSA for Acme"
        assert fetched["fields"][0]["label"] == "Governing Law"

        updated = client.put(
            f"/api/saved-documents/{doc_id}",
            json={**DOC, "title": "CSA for Acme (v2)"},
        )
        assert updated.status_code == 200
        assert updated.json()["title"] == "CSA for Acme (v2)"

        assert client.delete(f"/api/saved-documents/{doc_id}").status_code == 204
        assert client.get(f"/api/saved-documents/{doc_id}").status_code == 404


def test_users_cannot_see_each_others_documents():
    with TestClient(create_app(static_dir=None)) as client:
        _signup(client, "alice@example.com")
        alice_doc = client.post("/api/saved-documents", json=DOC).json()["id"]

        # Signing up Bob switches the session cookie to Bob.
        _signup(client, "bob@example.com")
        assert client.get("/api/saved-documents").json() == []
        assert client.get(f"/api/saved-documents/{alice_doc}").status_code == 404
        assert client.put(
            f"/api/saved-documents/{alice_doc}", json=DOC
        ).status_code == 404
        assert client.delete(f"/api/saved-documents/{alice_doc}").status_code == 404

        # Back to Alice: her document is intact.
        client.post(
            "/api/auth/login",
            json={"email": "alice@example.com", "password": "password123"},
        )
        assert client.get(f"/api/saved-documents/{alice_doc}").status_code == 200
