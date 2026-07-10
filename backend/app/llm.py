"""LLM integration for the multi-document AI chat (PL-6).

Uses LiteLLM via OpenRouter with Cerebras as the inference provider, and
Structured Outputs so the model returns both its natural-language reply and the
fully-updated document state in one validated object.

The single public entry point is :func:`generate_turn`. It is deliberately a
plain function so the ``/api/chat`` route can depend on it and tests can swap in
a fake without any network calls or API key.
"""

from __future__ import annotations

import re

from litellm import completion

from . import documents
from .schemas import AssistantTurn, ChatMessage, DocumentState

MODEL = "openrouter/openai/gpt-oss-120b"
# Route the request to Cerebras for inference (per the project's AI design).
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

SYSTEM_PROMPT = """\
You are Prelegal's drafting assistant. You help a user create ONE legal \
document, chosen from a fixed catalog of supported documents (listed below). \
You produce two separate things each turn — `reply` (the chat message the user \
reads) and `doc` (the machine-readable document state) — and keep them strictly \
separate.

Your job has two phases:

1. Choosing the document. Early in the conversation, work out which supported \
document the user needs. If the user asks for a document that is NOT in the \
supported catalog (e.g. an employment contract, a will, a lease), do not refuse \
flatly: briefly explain that Prelegal can't generate that one, then recommend \
the closest supported document from the catalog and ask if they'd like to use \
it. Only set `doc.documentType` once the user has settled on a supported \
document, and set it to that document's EXACT `filename` from the catalog.

2. Filling it in. Once a document is chosen, gather the information it needs \
through friendly conversation. Every agreement identifies the two parties \
(their company names, the signatory's name and title, and a notice address) and \
usually a governing law — collect those. Also collect the document-specific \
fields; when a document is selected you will be given the list of that \
template's fill-in Variables to guide what to ask. Ask about one or two related \
things at a time. Infer sensible values when clearly implied, but never invent \
party names, emails, or dates the user hasn't given. When everything is filled \
in as well as it can be, say so and invite the user to download the PDF.

Rules for `reply` (the ONLY thing the user sees):
- Short, warm, plain-language prose. Never put JSON, code blocks, backticks, or \
a dump of the fields into `reply`; the document is shown to the user separately. \
Confirm what you captured in prose, not as a data structure.

Rules for `doc` (machine-readable; the user never sees it as raw text):
- Return the COMPLETE, updated state every turn — `documentType` plus every \
field gathered so far. Never drop a field the user already provided.
- `documentType` is either null (still deciding) or the exact catalog filename.
- `fields` is a list of {label, value} pairs. Use clear, human-readable labels \
(e.g. "Governing Law", "Provider Company", "Party 1 Signatory"). Leave a \
value as an empty string until you learn it. Do not duplicate labels.
"""


def _catalog_block() -> str:
    """A compact, model-readable listing of the supported documents."""
    lines = [
        f"- {d.name} — filename: {d.filename} — {d.description}"
        for d in documents.list_documents()
    ]
    return "Supported documents (use the exact filename as documentType):\n" + "\n".join(
        lines
    )


def _variables_block(filename: str) -> str | None:
    """Guidance listing a chosen template's fill-in Variables, if any."""
    variables = documents.get_variables(filename)
    if not variables:
        return None
    doc = documents.get_document(filename)
    return (
        f'The selected document is "{doc.name}" ({filename}). Its template '
        "references these fill-in Variables — collect a value for each that "
        "applies, in addition to the party and signature details:\n"
        + ", ".join(variables)
    )


# Matches a fenced code block (```...```), with or without a language tag.
_CODE_FENCE_RE = re.compile(r"```.*?```", re.DOTALL)


def _clean_reply(reply: str) -> str:
    """Strip anything the model shouldn't have put in the chat reply.

    The document is shown to the user separately (rendered from ``doc``), so raw
    JSON or code fences never belong in the conversational ``reply``. Prompting
    handles this most of the time; this is a cheap backstop for the times it
    doesn't. If stripping leaves the reply empty, fall back to a neutral prompt
    so the user is never shown a blank message.
    """
    cleaned = _CODE_FENCE_RE.sub("", reply)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    return cleaned or "Got it. What would you like to add or change next?"


def _to_openai_messages(
    history: list[ChatMessage], doc: DocumentState
) -> list[dict[str, str]]:
    """Build the message list sent to the model.

    The system prompt is followed by the catalog, an optional block naming the
    selected template's Variables, a snapshot of the current document state, and
    then the conversation so far.
    """
    system_blocks = [SYSTEM_PROMPT, _catalog_block()]
    if doc.documentType and documents.is_supported(doc.documentType):
        variables = _variables_block(doc.documentType)
        if variables:
            system_blocks.append(variables)
    system_blocks.append("Current document state:\n" + doc.model_dump_json(indent=2))

    return [
        *({"role": "system", "content": block} for block in system_blocks),
        *({"role": m.role, "content": m.content} for m in history),
    ]


def generate_turn(history: list[ChatMessage], doc: DocumentState) -> AssistantTurn:
    """Call the LLM and return the next assistant turn as a validated object."""
    response = completion(
        model=MODEL,
        messages=_to_openai_messages(history, doc),
        response_format=AssistantTurn,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    turn = AssistantTurn.model_validate_json(response.choices[0].message.content)
    turn.reply = _clean_reply(turn.reply)
    # Guard against the model naming a document that isn't actually supported.
    if turn.doc.documentType and not documents.is_supported(turn.doc.documentType):
        turn.doc.documentType = None
    return turn
