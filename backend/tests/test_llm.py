"""Unit tests for the LLM message assembly (no network calls)."""

from app.llm import SYSTEM_PROMPT, _to_openai_messages
from app.schemas import ChatMessage, NdaData


def test_to_openai_messages_layout():
    history = [
        ChatMessage(role="assistant", content="Who are the parties?"),
        ChatMessage(role="user", content="Acme and Globex"),
    ]
    data = NdaData(governingLaw="Delaware")

    messages = _to_openai_messages(history, data)

    # System prompt, then a document-state snapshot, then the transcript in order.
    assert messages[0] == {"role": "system", "content": SYSTEM_PROMPT}
    assert messages[1]["role"] == "system"
    assert "Delaware" in messages[1]["content"]
    assert messages[2] == {"role": "assistant", "content": "Who are the parties?"}
    assert messages[3] == {"role": "user", "content": "Acme and Globex"}
