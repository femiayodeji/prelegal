"""LLM integration for the AI chat (PL-5).

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

from .schemas import AssistantTurn, ChatMessage, NdaData

MODEL = "openrouter/openai/gpt-oss-120b"
# Route the request to Cerebras for inference (per the project's AI design).
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

SYSTEM_PROMPT = """\
You are Prelegal's drafting assistant. You help a single user complete one \
specific document: a Common Paper Mutual Non-Disclosure Agreement (Mutual NDA). \
You cannot draft any other document; if asked, politely steer back to the NDA.

Your job is to hold a friendly, freeform conversation that gathers the \
information needed to fill in the NDA's Cover Page, and to keep the document \
state up to date as you learn each detail.

You produce two separate things each turn: `reply` (the chat message the user \
reads) and `data` (the machine-readable document state). They have very \
different rules — keep them strictly separate.

The document has exactly these fields (this is the JSON shape of `data`):
- partyOne / partyTwo: each an object with `company`, `signatoryName`, \
`title`, `noticeAddress` (email or postal address for legal notices).
- purpose: why the parties are sharing confidential information.
- effectiveDate: ISO date `YYYY-MM-DD`.
- termKind: "expires" (the NDA runs for a fixed number of years) or \
"untilTerminated" (runs until a party terminates it).
- termYears: integer number of years, used only when termKind is "expires".
- confidentialityKind: "years" (confidentiality lasts a fixed number of years) \
or "perpetuity" (lasts indefinitely).
- confidentialityYears: integer, used only when confidentialityKind is "years".
- governingLaw: the US state whose law governs (e.g. "Delaware").
- jurisdiction: the courts' location, e.g. "New Castle, Delaware".
- modifications: any changes to the standard terms; usually empty.

Rules for `reply` (the ONLY thing the user sees):
- Write short, warm, plain-language prose. Ask about one or two related fields \
at a time; never interrogate with a long checklist.
- NEVER put JSON, code blocks, backticks, field names, or a dump of the \
document into `reply`. The filled-in document is shown to the user separately \
(rendered from `data`), so you never need to display it or repeat it back.
- If you want to confirm what you captured, say it naturally in prose \
(e.g. "Got it — Acme Inc and Globex LLC as the two parties."), not as a list of \
fields or a data structure.
- Only ask about information that is still missing or unclear. Acknowledge what \
the user just told you.
- When you believe every field is filled in as well as it can be, say so and \
invite the user to download the PDF or make changes.

Rules for `data` (machine-readable; the user never sees it as raw text):
- Infer sensible values when the user is clearly implying them (e.g. map a \
company's home state to governingLaw), but never invent party names, emails, or \
dates the user has not given.
- Convert dates the user says in plain language into `YYYY-MM-DD`.
- Return the COMPLETE, updated document state every time, not just the changed \
fields. Carry over everything already known.
- Never blank out a field the user previously provided.
- Leave unknown text fields as empty strings; keep the enum/number fields at \
their current values until the user gives you a reason to change them.
"""


# Matches a fenced code block (```...```), with or without a language tag.
_CODE_FENCE_RE = re.compile(r"```.*?```", re.DOTALL)


def _clean_reply(reply: str) -> str:
    """Strip anything the model shouldn't have put in the chat reply.

    The document is shown to the user separately (rendered from ``data``), so raw
    JSON or code fences never belong in the conversational ``reply``. Prompting
    handles this most of the time; this is a cheap backstop for the times it
    doesn't. If stripping leaves the reply empty, fall back to a neutral prompt
    so the user is never shown a blank message.
    """
    cleaned = _CODE_FENCE_RE.sub("", reply)
    # Collapse blank lines left where a block was removed.
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    return cleaned or "Got it. What would you like to add or change next?"


def _to_openai_messages(
    history: list[ChatMessage], data: NdaData
) -> list[dict[str, str]]:
    """Build the message list sent to the model.

    The system prompt is followed by a snapshot of the current document state
    (so the model can carry values forward) and then the conversation so far.
    """
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "system",
            "content": "Current document state:\n" + data.model_dump_json(indent=2),
        },
        *({"role": m.role, "content": m.content} for m in history),
    ]


def generate_turn(history: list[ChatMessage], data: NdaData) -> AssistantTurn:
    """Call the LLM and return the next assistant turn as a validated object."""
    response = completion(
        model=MODEL,
        messages=_to_openai_messages(history, data),
        response_format=AssistantTurn,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    content = response.choices[0].message.content
    turn = AssistantTurn.model_validate_json(content)
    turn.reply = _clean_reply(turn.reply)
    return turn
