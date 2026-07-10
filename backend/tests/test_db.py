"""Tests for the throwaway SQLite bootstrap."""

from contextlib import closing

from app import db


def test_init_db_creates_users_table(tmp_path):
    db_path = tmp_path / "test.db"
    db.init_db(db_path)

    with closing(db.connect(db_path)) as conn:
        tables = {
            row["name"]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
        }
        assert "users" in tables

        # The users table has the expected foundation columns.
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(users)")}
        assert {"id", "email", "display_name", "created_at"} <= columns


def test_init_db_is_recreated_from_scratch(tmp_path):
    db_path = tmp_path / "test.db"

    db.init_db(db_path)
    with closing(db.connect(db_path)) as conn:
        conn.execute("INSERT INTO users (email) VALUES ('someone@example.com')")
        conn.commit()

    # A fresh init wipes any previous data — the DB is throwaway.
    db.init_db(db_path)
    with closing(db.connect(db_path)) as conn:
        count = conn.execute("SELECT COUNT(*) AS n FROM users").fetchone()["n"]
        assert count == 0
