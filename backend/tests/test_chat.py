"""Tests for the /api/chat endpoint (multi-document, PL-6).

The LLM call is replaced with a fake via FastAPI's dependency overrides, so
these run deterministically with no network access or API key.
"""

from fastapi.testclient import TestClient

from app.main import create_app, get_turn_generator
from app.schemas import AssistantTurn, ChatMessage, DocField, DocumentState


def _client_with_fake(fake) -> TestClient:
    app = create_app(static_dir=None)
    app.dependency_overrides[get_turn_generator] = lambda: fake
    return TestClient(app)


def test_chat_selects_document_and_collects_fields():
    def fake(messages: list[ChatMessage], doc: DocumentState) -> AssistantTurn:
        assert messages[-1].content == "I need a cloud service agreement."
        return AssistantTurn(
            reply="Great — a Cloud Service Agreement. Who is the provider?",
            doc=DocumentState(
                documentType="CSA.md",
                fields=[DocField(label="Governing Law", value="Delaware")],
            ),
        )

    with _client_with_fake(fake) as client:
        resp = client.post(
            "/api/chat",
            json={
                "messages": [
                    {"role": "user", "content": "I need a cloud service agreement."}
                ],
                "doc": {"documentType": None, "fields": []},
            },
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["reply"].startswith("Great")
    assert body["doc"]["documentType"] == "CSA.md"
    assert body["doc"]["fields"] == [{"label": "Governing Law", "value": "Delaware"}]


def test_chat_preserves_existing_document_state():
    def fake(messages, doc):
        return AssistantTurn(reply="Anything else?", doc=doc)

    with _client_with_fake(fake) as client:
        resp = client.post(
            "/api/chat",
            json={
                "messages": [{"role": "user", "content": "hi"}],
                "doc": {
                    "documentType": "Mutual-NDA.md",
                    "fields": [{"label": "Purpose", "value": "Evaluate a deal"}],
                },
            },
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["doc"]["documentType"] == "Mutual-NDA.md"
    assert body["doc"]["fields"][0]["value"] == "Evaluate a deal"


def test_chat_defaults_to_empty_document_when_omitted():
    captured: dict = {}

    def fake(messages, doc):
        captured["doc"] = doc
        return AssistantTurn(reply="Which document would you like?", doc=doc)

    with _client_with_fake(fake) as client:
        resp = client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "hello"}]},
        )

    assert resp.status_code == 200
    assert captured["doc"].documentType is None
    assert captured["doc"].fields == []


def test_chat_maps_llm_failure_to_502():
    def fake(messages, doc):
        raise RuntimeError("openrouter exploded")

    with _client_with_fake(fake) as client:
        resp = client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "hi"}], "doc": {}},
        )

    assert resp.status_code == 502
    assert "temporarily unavailable" in resp.json()["detail"]
