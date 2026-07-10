"""Unit tests for the LLM message assembly and reply cleaning (no network)."""

from app.llm import SYSTEM_PROMPT, _clean_reply, _to_openai_messages
from app.schemas import ChatMessage, DocField, DocumentState


def test_messages_include_catalog_before_a_document_is_chosen():
    history = [ChatMessage(role="user", content="I need an NDA")]
    messages = _to_openai_messages(history, DocumentState())

    assert messages[0] == {"role": "system", "content": SYSTEM_PROMPT}
    catalog = messages[1]["content"]
    assert "Supported documents" in catalog
    assert "Mutual-NDA.md" in catalog
    # No document chosen yet → no Variables block; last message is the transcript.
    assert messages[-1] == {"role": "user", "content": "I need an NDA"}


def test_messages_include_variables_once_a_document_is_selected():
    doc = DocumentState(
        documentType="Mutual-NDA.md",
        fields=[DocField(label="Governing Law", value="Delaware")],
    )
    messages = _to_openai_messages([ChatMessage(role="user", content="hi")], doc)

    system_text = "\n".join(m["content"] for m in messages if m["role"] == "system")
    assert "references these fill-in Variables" in system_text  # the Variables block
    assert "Purpose" in system_text  # an NDA Variable
    assert "Delaware" in system_text  # current state snapshot


def test_unknown_document_type_does_not_break_message_assembly():
    doc = DocumentState(documentType="Nope.md", fields=[])
    messages = _to_openai_messages([ChatMessage(role="user", content="hi")], doc)
    # Unsupported type is simply skipped for the Variables block.
    system_text = "\n".join(m["content"] for m in messages if m["role"] == "system")
    assert "references these fill-in Variables" not in system_text


def test_clean_reply_strips_leaked_code_block():
    reply = "Here's the doc:\n```json\n{\"documentType\": \"CSA.md\"}\n```\nWhat next?"
    cleaned = _clean_reply(reply)
    assert "```" not in cleaned
    assert "documentType" not in cleaned
    assert cleaned.startswith("Here's the doc:")
    assert cleaned.endswith("What next?")


def test_clean_reply_leaves_prose_untouched_and_falls_back_when_empty():
    prose = "Got it — a Cloud Service Agreement. Who's the provider?"
    assert _clean_reply(prose) == prose
    assert _clean_reply("```json\n{}\n```")  # non-empty fallback
