"""Pydantic models for the AI chat feature (PL-5).

``NdaData`` mirrors the frontend ``NdaData`` interface in ``frontend/lib/nda.ts``
field-for-field (same names, same defaults) so the object round-trips between the
browser, this API, and the LLM without any translation layer.

The chat is stateless on the server: each request carries the full transcript so
far plus the current document state; the LLM returns an updated document state
and its next reply.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

TermKind = Literal["expires", "untilTerminated"]
ConfidentialityKind = Literal["years", "perpetuity"]


class Party(BaseModel):
    """A signing party on the NDA cover page."""

    company: str = ""
    signatoryName: str = ""
    title: str = ""
    noticeAddress: str = ""


class NdaData(BaseModel):
    """All user-editable Cover Page values (mirror of the frontend type)."""

    partyOne: Party = Field(default_factory=Party)
    partyTwo: Party = Field(default_factory=Party)
    purpose: str = (
        "Evaluating whether to enter into a business relationship with the "
        "other party."
    )
    effectiveDate: str = ""
    termKind: TermKind = "expires"
    termYears: int = 1
    confidentialityKind: ConfidentialityKind = "years"
    confidentialityYears: int = 1
    governingLaw: str = ""
    jurisdiction: str = ""
    modifications: str = ""


class ChatMessage(BaseModel):
    """A single turn in the conversation transcript."""

    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    """Client payload: the transcript so far plus the current document state."""

    messages: list[ChatMessage]
    data: NdaData = Field(default_factory=NdaData)


class AssistantTurn(BaseModel):
    """Structured output returned by the LLM for one assistant turn.

    ``reply`` is the natural-language message shown in the chat; ``data`` is the
    full, updated document state reflecting everything gathered so far.
    """

    reply: str
    data: NdaData


class ChatResponse(BaseModel):
    """API response: the assistant's reply and the updated document state."""

    reply: str
    data: NdaData
