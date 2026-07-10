"""Unit tests for the LLM message assembly (no network calls)."""

from app.llm import SYSTEM_PROMPT, _clean_reply, _to_openai_messages
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


def test_clean_reply_strips_leaked_json_block():
    reply = (
        "Got it! Here's the updated document so far:\n"
        '```json\n{"partyOne": {"company": "Alterbin"}}\n```\n'
        "We still need a few details."
    )
    cleaned = _clean_reply(reply)

    assert "```" not in cleaned
    assert "partyOne" not in cleaned
    assert cleaned.startswith("Got it!")
    assert cleaned.endswith("We still need a few details.")


def test_clean_reply_leaves_normal_prose_untouched():
    reply = "Got it — Acme Inc and Globex LLC as the two parties. What's the purpose?"
    assert _clean_reply(reply) == reply


def test_clean_reply_falls_back_when_only_a_code_block():
    # If the model returned nothing but a fenced block, show a neutral prompt.
    cleaned = _clean_reply("```json\n{}\n```")
    assert cleaned and "```" not in cleaned
