"""Tests for the /api/chat endpoint.

The LLM call is replaced with a fake via FastAPI's dependency overrides, so
these run deterministically with no network access or API key. The real LLM
integration in ``app.llm`` is intentionally not exercised here.
"""

from fastapi.testclient import TestClient

from app.main import create_app, get_turn_generator
from app.schemas import AssistantTurn, ChatMessage, NdaData


def _client_with_fake(fake) -> TestClient:
    app = create_app(static_dir=None)
    app.dependency_overrides[get_turn_generator] = lambda: fake
    return TestClient(app)


def test_chat_returns_reply_and_updated_data():
    # The fake echoes a reply and fills in a couple of fields, standing in for
    # what the model would extract from the conversation.
    def fake(messages: list[ChatMessage], data: NdaData) -> AssistantTurn:
        assert messages[-1].content == "We are Acme and Globex."
        updated = data.model_copy(deep=True)
        updated.partyOne.company = "Acme, Inc."
        updated.partyTwo.company = "Globex LLC"
        return AssistantTurn(reply="Got it — what's the purpose?", data=updated)

    with _client_with_fake(fake) as client:
        resp = client.post(
            "/api/chat",
            json={
                "messages": [
                    {"role": "assistant", "content": "Who are the parties?"},
                    {"role": "user", "content": "We are Acme and Globex."},
                ],
                "data": {},
            },
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["reply"] == "Got it — what's the purpose?"
    assert body["data"]["partyOne"]["company"] == "Acme, Inc."
    assert body["data"]["partyTwo"]["company"] == "Globex LLC"


def test_chat_preserves_existing_data_defaults():
    # When the fake returns the data untouched, the endpoint should echo it back
    # verbatim, including the fields the client supplied.
    def fake(messages: list[ChatMessage], data: NdaData) -> AssistantTurn:
        return AssistantTurn(reply="Anything else?", data=data)

    with _client_with_fake(fake) as client:
        resp = client.post(
            "/api/chat",
            json={
                "messages": [{"role": "user", "content": "Governing law is Delaware"}],
                "data": {"governingLaw": "Delaware", "termYears": 3},
            },
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["governingLaw"] == "Delaware"
    assert body["data"]["termYears"] == 3
    # Untouched fields keep their schema defaults.
    assert body["data"]["termKind"] == "expires"
    assert body["data"]["confidentialityKind"] == "years"


def test_chat_rejects_malformed_request():
    # A bad role should fail request validation before any LLM call.
    def fake(messages, data):  # pragma: no cover - must not be reached
        raise AssertionError("generator should not run on invalid input")

    with _client_with_fake(fake) as client:
        resp = client.post(
            "/api/chat",
            json={"messages": [{"role": "system", "content": "hi"}], "data": {}},
        )

    assert resp.status_code == 422
