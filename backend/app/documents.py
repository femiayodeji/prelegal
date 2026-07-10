"""Catalog + template registry for the supported legal documents (PL-6).

Loads ``catalog.json`` and the Common Paper templates once, and exposes:
  * the list of documents a user can actually create (``list_documents``),
  * a template's Standard Terms markdown for rendering (``get_markdown``), and
  * the fill-in "Variables" of a template (``get_variables``) so the AI knows
    what to ask about.

Templates express their fill-in points as inline "Variables" — highlighted spans
with classes ``coverpage_link`` / ``orderform_link`` / ``keyterms_link`` — rather
than a separate field schema. We extract the distinct Variable names to seed the
conversation.
"""

from __future__ import annotations

import json
import re
from functools import lru_cache

from .config import CATALOG_PATH, TEMPLATES_DIR
from .schemas import CatalogDocument

# A fill-in Variable, e.g. <span class="orderform_link">Subscription Period</span>.
_VARIABLE_RE = re.compile(
    r'<span class="(?:coverpage_link|orderform_link|keyterms_link)"[^>]*>(.*?)</span>',
    re.DOTALL,
)
# Inline markup that can appear inside a Variable span (e.g. bold markdown).
_MARKUP_RE = re.compile(r"<[^>]+>|\*\*|[*_`]")


def _clean_variable(raw: str) -> str:
    """Normalise a Variable's text: strip markup, possessives, and whitespace."""
    text = _MARKUP_RE.sub("", raw)
    text = re.sub(r"[’']s\b", "", text)  # drop possessive "'s" / "’s"
    return re.sub(r"\s+", " ", text).strip(" .,:;")


@lru_cache(maxsize=1)
def _catalog() -> list[CatalogDocument]:
    """Parse ``catalog.json`` into typed catalog entries (cached)."""
    raw = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    return [CatalogDocument(**doc) for doc in raw.get("documents", [])]


def list_documents() -> list[CatalogDocument]:
    """Documents the user can create.

    Excludes the standalone NDA cover page — it is a companion fill-in sheet for
    the Mutual NDA Standard Terms, not an agreement a user selects on its own.
    """
    return [d for d in _catalog() if "coverpage" not in d.filename.lower()]


def _by_filename() -> dict[str, CatalogDocument]:
    return {d.filename: d for d in list_documents()}


def is_supported(filename: str) -> bool:
    """Whether ``filename`` is a selectable document in the catalog."""
    return filename in _by_filename()


def get_document(filename: str) -> CatalogDocument:
    """Return the catalog entry for ``filename`` or raise ``KeyError``."""
    return _by_filename()[filename]


@lru_cache(maxsize=None)
def get_markdown(filename: str) -> str:
    """Return a supported template's raw markdown.

    Raises ``KeyError`` if the filename is not a supported document, which also
    prevents path traversal — only known catalog filenames are ever read.
    """
    if not is_supported(filename):
        raise KeyError(filename)
    return (TEMPLATES_DIR / filename).read_text(encoding="utf-8")


@lru_cache(maxsize=None)
def get_variables(filename: str) -> tuple[str, ...]:
    """Distinct fill-in Variable names referenced by a template, in order."""
    seen: dict[str, None] = {}
    for match in _VARIABLE_RE.findall(get_markdown(filename)):
        name = _clean_variable(match)
        if name:
            seen.setdefault(name, None)
    return tuple(seen)
