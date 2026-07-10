"""Tests for the document catalog/template registry and its API endpoints."""

import pytest
from fastapi.testclient import TestClient

from app import documents
from app.main import create_app


def test_list_documents_excludes_the_nda_cover_page():
    filenames = {d.filename for d in documents.list_documents()}
    assert "Mutual-NDA.md" in filenames
    assert "CSA.md" in filenames
    assert "Mutual-NDA-coverpage.md" not in filenames


def test_get_variables_extracts_clean_names():
    variables = documents.get_variables("Mutual-NDA.md")
    assert "Governing Law" in variables
    assert "Purpose" in variables
    # No possessives, markup, or duplicates leak through.
    assert all("<" not in v and "'s" not in v for v in variables)
    assert len(variables) == len(set(variables))


def test_get_markdown_rejects_unknown_and_traversal():
    with pytest.raises(KeyError):
        documents.get_markdown("Mutual-NDA-coverpage.md")  # not selectable
    with pytest.raises(KeyError):
        documents.get_markdown("../catalog.json")  # path traversal


def test_documents_endpoint_lists_catalog():
    with TestClient(create_app(static_dir=None)) as client:
        resp = client.get("/api/documents")
        assert resp.status_code == 200
        body = resp.json()
        assert any(d["filename"] == "CSA.md" for d in body)
        assert all("coverpage" not in d["filename"] for d in body)


def test_document_markdown_endpoint_returns_terms():
    with TestClient(create_app(static_dir=None)) as client:
        resp = client.get("/api/documents/Mutual-NDA.md")
        assert resp.status_code == 200
        body = resp.json()
        assert body["name"].startswith("Mutual Non-Disclosure")
        assert "Confidential Information" in body["markdown"]


def test_document_markdown_endpoint_404s_on_unknown():
    with TestClient(create_app(static_dir=None)) as client:
        assert client.get("/api/documents/Nope.md").status_code == 404
        assert client.get("/api/documents/Mutual-NDA-coverpage.md").status_code == 404
