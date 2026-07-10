"""Authentication: password hashing, users, and opaque sessions (PL-7).

Passwords are hashed with PBKDF2-HMAC-SHA256 (stdlib, no extra dependency).
Sessions are opaque random tokens stored in the ``sessions`` table and carried
in an HttpOnly cookie; there is no JWT to verify or secret to manage, and a
session is revoked simply by deleting its row.

These are plain functions over a sqlite connection so they are trivial to unit
test; the FastAPI wiring (cookie + dependency) lives in ``main.py``.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
import sqlite3

COOKIE_NAME = "prelegal_session"

_ALGORITHM = "pbkdf2_sha256"
_ITERATIONS = 200_000
_SALT_BYTES = 16


class EmailTaken(Exception):
    """Raised when signing up with an email that already exists."""


def hash_password(password: str) -> str:
    """Return a self-describing ``algo$iterations$salt$hash`` string."""
    salt = secrets.token_bytes(_SALT_BYTES)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _ITERATIONS)
    return f"{_ALGORITHM}${_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    """Constant-time check of a password against an encoded hash."""
    try:
        algorithm, iterations, salt_hex, hash_hex = encoded.split("$")
        if algorithm != _ALGORITHM:
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt_hex), int(iterations)
        )
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(digest.hex(), hash_hex)


def normalize_email(email: str) -> str:
    return email.strip().lower()


def create_user(
    conn: sqlite3.Connection,
    email: str,
    password: str,
    display_name: str | None = None,
) -> sqlite3.Row:
    """Create a user, raising :class:`EmailTaken` if the email already exists."""
    try:
        cursor = conn.execute(
            "INSERT INTO users (email, display_name, password_hash) VALUES (?, ?, ?)",
            (
                normalize_email(email),
                (display_name or "").strip() or None,
                hash_password(password),
            ),
        )
        conn.commit()
    except sqlite3.IntegrityError as exc:
        raise EmailTaken(email) from exc
    return get_user_by_id(conn, cursor.lastrowid)


def get_user_by_id(conn: sqlite3.Connection, user_id: int) -> sqlite3.Row | None:
    return conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()


def get_user_by_email(conn: sqlite3.Connection, email: str) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT * FROM users WHERE email = ?", (normalize_email(email),)
    ).fetchone()


def authenticate(
    conn: sqlite3.Connection, email: str, password: str
) -> sqlite3.Row | None:
    """Return the user if the email/password are correct, else ``None``."""
    user = get_user_by_email(conn, email)
    if user and verify_password(password, user["password_hash"]):
        return user
    return None


def create_session(conn: sqlite3.Connection, user_id: int) -> str:
    """Create a session for ``user_id`` and return its opaque token."""
    token = secrets.token_urlsafe(32)
    conn.execute(
        "INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id)
    )
    conn.commit()
    return token


def get_user_by_token(
    conn: sqlite3.Connection, token: str | None
) -> sqlite3.Row | None:
    """Resolve a session token to its user, or ``None`` if invalid."""
    if not token:
        return None
    return conn.execute(
        "SELECT u.* FROM users u JOIN sessions s ON s.user_id = u.id "
        "WHERE s.token = ?",
        (token,),
    ).fetchone()


def delete_session(conn: sqlite3.Connection, token: str | None) -> None:
    """Revoke a session token (no-op if it doesn't exist)."""
    if not token:
        return
    conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
    conn.commit()
