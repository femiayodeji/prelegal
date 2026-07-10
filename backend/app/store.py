"""Persistence for user-saved documents (PL-7).

Each saved document belongs to a user and stores the chosen ``document_type``
(a catalog filename), a title, and the collected fields as JSON. All reads and
writes are scoped by ``user_id`` so a user can only ever see or change their own
documents.
"""

from __future__ import annotations

import json
import sqlite3

from .schemas import DocField


def _serialize(fields: list[DocField]) -> str:
    return json.dumps([f.model_dump() for f in fields])


def _deserialize(fields_json: str) -> list[DocField]:
    return [DocField(**f) for f in json.loads(fields_json)]


def create_document(
    conn: sqlite3.Connection,
    user_id: int,
    document_type: str,
    title: str,
    fields: list[DocField],
) -> int:
    """Insert a new saved document and return its id."""
    cursor = conn.execute(
        "INSERT INTO saved_documents (user_id, document_type, title, fields_json) "
        "VALUES (?, ?, ?, ?)",
        (user_id, document_type, title, _serialize(fields)),
    )
    conn.commit()
    return cursor.lastrowid


def update_document(
    conn: sqlite3.Connection,
    user_id: int,
    doc_id: int,
    document_type: str,
    title: str,
    fields: list[DocField],
) -> bool:
    """Update a saved document the user owns. Returns False if it isn't theirs."""
    cursor = conn.execute(
        "UPDATE saved_documents "
        "SET document_type = ?, title = ?, fields_json = ?, "
        "    updated_at = datetime('now') "
        "WHERE id = ? AND user_id = ?",
        (document_type, title, _serialize(fields), doc_id, user_id),
    )
    conn.commit()
    return cursor.rowcount > 0


def list_documents(conn: sqlite3.Connection, user_id: int) -> list[dict]:
    """List a user's saved documents (summary fields), newest first."""
    rows = conn.execute(
        "SELECT id, document_type, title, updated_at FROM saved_documents "
        "WHERE user_id = ? ORDER BY datetime(updated_at) DESC",
        (user_id,),
    ).fetchall()
    return [dict(row) for row in rows]


def get_document(
    conn: sqlite3.Connection, user_id: int, doc_id: int
) -> dict | None:
    """Return one of the user's saved documents (with fields), or None."""
    row = conn.execute(
        "SELECT * FROM saved_documents WHERE id = ? AND user_id = ?",
        (doc_id, user_id),
    ).fetchone()
    if row is None:
        return None
    result = dict(row)
    result["fields"] = _deserialize(result.pop("fields_json"))
    return result


def delete_document(conn: sqlite3.Connection, user_id: int, doc_id: int) -> bool:
    """Delete one of the user's saved documents. Returns False if not theirs."""
    cursor = conn.execute(
        "DELETE FROM saved_documents WHERE id = ? AND user_id = ?",
        (doc_id, user_id),
    )
    conn.commit()
    return cursor.rowcount > 0
