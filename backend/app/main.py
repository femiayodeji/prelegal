"""FastAPI application for the Prelegal V1 foundation.

Responsibilities:
  * expose the JSON API under ``/api`` (currently just a health check), and
  * serve the statically-exported Next.js frontend for everything else.

The database is recreated from scratch on startup via the lifespan handler.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import APIRouter, FastAPI
from starlette.staticfiles import StaticFiles

from .config import resolve_static_dir
from .db import init_db

api = APIRouter(prefix="/api")


@api.get("/health")
def health() -> dict[str, str]:
    """Liveness probe used by the start scripts and container health checks."""
    return {"status": "ok"}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Recreate the throwaway SQLite database each time the app starts.
    init_db()
    yield


def create_app(static_dir: Path | None = None) -> FastAPI:
    """Build the FastAPI app.

    ``static_dir`` overrides the auto-detected static-export directory (useful
    in tests); when omitted it is resolved from the environment/layout.
    """
    app = FastAPI(title="Prelegal", version="0.1.0", lifespan=lifespan)
    app.include_router(api)

    # Serve the statically-exported Next.js site. `html=True` resolves "/" to
    # index.html and unknown paths to the exported 404.html. Mounted last so
    # the explicit /api routes above take precedence.
    resolved = static_dir if static_dir is not None else resolve_static_dir()
    if resolved is not None:
        app.mount(
            "/", StaticFiles(directory=str(resolved), html=True), name="frontend"
        )

    return app


app = create_app()
