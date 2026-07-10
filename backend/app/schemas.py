"""Pydantic models for the multi-document AI chat (PL-6).

The product supports every agreement in ``catalog.json``. Rather than a bespoke
schema per document, a document in progress is represented generically: a chosen
``documentType`` (a catalog filename) plus a flat list of collected fields. The
AI decides which fields a given document needs (seeded from the template's
Variables) and fills them in through conversation.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class CatalogDocument(BaseModel):
    """A supported document, as advertised to the frontend and the model."""

    name: str
    filename: str
    description: str


class DocField(BaseModel):
    """A single cover-page value collected from the user."""

    label: str
    value: str = ""


class DocumentState(BaseModel):
    """A document in progress: which type, and the fields gathered so far.

    ``documentType`` is a catalog filename (e.g. ``"CSA.md"``) once the user has
    settled on a document, or ``None`` while that is still being decided.
    """

    documentType: str | None = None
    fields: list[DocField] = Field(default_factory=list)


class ChatMessage(BaseModel):
    """A single turn in the conversation transcript."""

    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    """Client payload: the transcript so far plus the current document state."""

    messages: list[ChatMessage]
    doc: DocumentState = Field(default_factory=DocumentState)


class AssistantTurn(BaseModel):
    """Structured output returned by the LLM for one assistant turn.

    ``reply`` is the natural-language message shown in the chat; ``doc`` is the
    full, updated document state reflecting everything gathered so far.
    """

    reply: str
    doc: DocumentState


class ChatResponse(BaseModel):
    """API response: the assistant's reply and the updated document state."""

    reply: str
    doc: DocumentState
