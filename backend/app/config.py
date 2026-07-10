"""Runtime settings for the Prelegal backend.

Everything is resolved from environment variables with sensible defaults so the
same code runs identically in local development and inside the Docker image.
"""

from __future__ import annotations

import os
from pathlib import Path

# Repository layout (this file lives at backend/app/config.py).
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent

# Directory holding the statically-exported Next.js frontend (`next build` with
# `output: 'export'`). In the Docker image the export is copied next to the
# backend; in local dev it lives at frontend/out. The first existing path wins.
_STATIC_CANDIDATES = [
    os.environ.get("PRELEGAL_STATIC_DIR"),
    str(BACKEND_DIR / "static"),
    str(PROJECT_ROOT / "frontend" / "out"),
]


def resolve_static_dir() -> Path | None:
    """Return the first configured static-export directory that exists."""
    for candidate in _STATIC_CANDIDATES:
        if candidate and Path(candidate).is_dir():
            return Path(candidate)
    return None


# SQLite database path. The database is a throwaway that is recreated from
# scratch on every startup, so an in-container path is fine.
DATABASE_PATH = Path(os.environ.get("PRELEGAL_DB_PATH", str(BACKEND_DIR / "prelegal.db")))
