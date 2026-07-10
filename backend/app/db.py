"""SQLite database bootstrap.

The V1 foundation uses a throwaway SQLite database that is recreated from
scratch every time the app starts (i.e. every time the Docker container is
brought up), as specified in the project's technical design. This module owns
the schema and the (re)initialisation.

The `users` table is created now as the foundation for later authentication.
The current prototype uses a client-side fake login, so nothing writes to it
yet — it exists so the schema is in place for real sign up / sign in later.
"""

from __future__ import annotations

import sqlite3
from contextlib import closing
from pathlib import Path

from .config import DATABASE_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    display_name  TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


def connect(db_path: Path = DATABASE_PATH) -> sqlite3.Connection:
    """Open a SQLite connection with row access by column name."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: Path = DATABASE_PATH) -> None:
    """Recreate the database from scratch.

    Any existing database file is removed first so each startup begins with a
    clean, deterministic schema.
    """
    if db_path.exists():
        db_path.unlink()
    db_path.parent.mkdir(parents=True, exist_ok=True)

    # `with sqlite3.Connection` only commits/rolls back — it does not close the
    # connection — so wrap it in closing() to release the handle as well.
    with closing(connect(db_path)) as conn:
        conn.executescript(SCHEMA)
        conn.commit()
