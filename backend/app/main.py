"""FastAPI application for Prelegal.

Responsibilities:
  * expose the JSON API under ``/api`` (auth, document catalog, chat, and the
    user's saved documents), and
  * serve the statically-exported Next.js frontend for everything else.

The database is recreated from scratch on startup via the lifespan handler.
"""

from __future__ import annotations

import logging
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Callable, Iterator

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, Response

from starlette.staticfiles import StaticFiles

from . import auth, db, documents, llm, store
from .config import resolve_static_dir
from .db import init_db
from .schemas import (
    AssistantTurn,
    CatalogDocument,
    ChatMessage,
    ChatRequest,
    ChatResponse,
    DocumentState,
    LoginRequest,
    SavedDocumentIn,
    SavedDocumentOut,
    SavedDocumentSummary,
    SignupRequest,
    UserOut,
)

logger = logging.getLogger(__name__)

api = APIRouter(prefix="/api")

# Sessions last a week; the throwaway DB resets sooner than that on restart.
_SESSION_MAX_AGE = 60 * 60 * 24 * 7


# --- Dependencies ---------------------------------------------------------


def get_conn() -> Iterator[sqlite3.Connection]:
    """Yield a SQLite connection for the request, closing it afterwards.

    FastAPI caches sub-dependencies within a request, so a request that needs
    the connection in several places still shares a single connection.
    """
    conn = db.connect()
    try:
        yield conn
    finally:
        conn.close()


def current_user(
    request: Request, conn: sqlite3.Connection = Depends(get_conn)
) -> sqlite3.Row:
    """Resolve the session cookie to a user, or raise 401."""
    user = auth.get_user_by_token(conn, request.cookies.get(auth.COOKIE_NAME))
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    return user


# The chat's LLM call sits behind this alias so it can be overridden in tests
# (via ``app.dependency_overrides``) with a fake that needs no network or key.
TurnGenerator = Callable[[list[ChatMessage], DocumentState], AssistantTurn]


def get_turn_generator() -> TurnGenerator:
    """Provide the function that turns a transcript + state into an assistant turn."""
    return llm.generate_turn


# --- Helpers --------------------------------------------------------------


def _user_out(user: sqlite3.Row) -> UserOut:
    return UserOut(email=user["email"], displayName=user["display_name"])


def _issue_session(
    conn: sqlite3.Connection, response: Response, user_id: int
) -> None:
    token = auth.create_session(conn, user_id)
    response.set_cookie(
        auth.COOKIE_NAME,
        token,
        httponly=True,
        samesite="lax",
        path="/",
        max_age=_SESSION_MAX_AGE,
    )


def _summary(row: dict) -> SavedDocumentSummary:
    return SavedDocumentSummary(
        id=row["id"],
        documentType=row["document_type"],
        title=row["title"],
        updatedAt=row["updated_at"],
    )


def _full(row: dict) -> SavedDocumentOut:
    return SavedDocumentOut(
        id=row["id"],
        documentType=row["document_type"],
        title=row["title"],
        updatedAt=row["updated_at"],
        fields=row["fields"],
    )


# --- Health + document catalog (public) -----------------------------------


@api.get("/health")
def health() -> dict[str, str]:
    """Liveness probe used by the start scripts and container health checks."""
    return {"status": "ok"}


@api.get("/documents", response_model=list[CatalogDocument])
def get_documents() -> list[CatalogDocument]:
    """List the legal documents a user can create."""
    return documents.list_documents()


@api.get("/documents/{filename}")
def get_document_markdown(filename: str) -> dict[str, str]:
    """Return a supported document's Standard Terms markdown, for the preview."""
    try:
        markdown = documents.get_markdown(filename)
    except KeyError:
        raise HTTPException(status_code=404, detail="Unknown document.")
    doc = documents.get_document(filename)
    return {"name": doc.name, "filename": filename, "markdown": markdown}


# --- Authentication -------------------------------------------------------


@api.post("/auth/signup", response_model=UserOut)
def signup(
    payload: SignupRequest,
    response: Response,
    conn: sqlite3.Connection = Depends(get_conn),
) -> UserOut:
    try:
        user = auth.create_user(
            conn, payload.email, payload.password, payload.displayName
        )
    except auth.EmailTaken:
        raise HTTPException(
            status_code=409, detail="An account with that email already exists."
        )
    _issue_session(conn, response, user["id"])
    return _user_out(user)


@api.post("/auth/login", response_model=UserOut)
def login(
    payload: LoginRequest,
    response: Response,
    conn: sqlite3.Connection = Depends(get_conn),
) -> UserOut:
    user = auth.authenticate(conn, payload.email, payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    _issue_session(conn, response, user["id"])
    return _user_out(user)


@api.post("/auth/logout")
def logout(
    request: Request,
    response: Response,
    conn: sqlite3.Connection = Depends(get_conn),
) -> dict[str, str]:
    auth.delete_session(conn, request.cookies.get(auth.COOKIE_NAME))
    response.delete_cookie(auth.COOKIE_NAME, path="/")
    return {"status": "ok"}


@api.get("/auth/me", response_model=UserOut)
def me(user: sqlite3.Row = Depends(current_user)) -> UserOut:
    return _user_out(user)


# --- Chat (auth-required) -------------------------------------------------


@api.post("/chat", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    _user: sqlite3.Row = Depends(current_user),
    generate_turn: TurnGenerator = Depends(get_turn_generator),
) -> ChatResponse:
    """Advance the document-drafting conversation by one assistant turn.

    Stateless: the client sends the full transcript and current document state,
    and receives the assistant's reply plus the updated document state.

    Any failure in the LLM call (network, auth, or malformed output) is turned
    into a clean 502 with a friendly message rather than leaking a raw traceback
    to the client.
    """
    try:
        turn = generate_turn(request.messages, request.doc)
    except Exception:  # noqa: BLE001 — any LLM failure maps to the same response.
        logger.exception("Chat turn generation failed")
        raise HTTPException(
            status_code=502,
            detail="The assistant is temporarily unavailable. Please try again.",
        )
    return ChatResponse(reply=turn.reply, doc=turn.doc)


# --- Saved documents (auth-required) --------------------------------------


@api.get("/saved-documents", response_model=list[SavedDocumentSummary])
def list_saved_documents(
    user: sqlite3.Row = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_conn),
) -> list[SavedDocumentSummary]:
    return [_summary(row) for row in store.list_documents(conn, user["id"])]


@api.post("/saved-documents", response_model=SavedDocumentOut, status_code=201)
def create_saved_document(
    payload: SavedDocumentIn,
    user: sqlite3.Row = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_conn),
) -> SavedDocumentOut:
    doc_id = store.create_document(
        conn, user["id"], payload.documentType, payload.title, payload.fields
    )
    return _full(store.get_document(conn, user["id"], doc_id))


@api.get("/saved-documents/{doc_id}", response_model=SavedDocumentOut)
def get_saved_document(
    doc_id: int,
    user: sqlite3.Row = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_conn),
) -> SavedDocumentOut:
    row = store.get_document(conn, user["id"], doc_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return _full(row)


@api.put("/saved-documents/{doc_id}", response_model=SavedDocumentOut)
def update_saved_document(
    doc_id: int,
    payload: SavedDocumentIn,
    user: sqlite3.Row = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_conn),
) -> SavedDocumentOut:
    updated = store.update_document(
        conn, user["id"], doc_id, payload.documentType, payload.title, payload.fields
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Document not found.")
    return _full(store.get_document(conn, user["id"], doc_id))


@api.delete("/saved-documents/{doc_id}", status_code=204)
def delete_saved_document(
    doc_id: int,
    user: sqlite3.Row = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_conn),
) -> Response:
    if not store.delete_document(conn, user["id"], doc_id):
        raise HTTPException(status_code=404, detail="Document not found.")
    return Response(status_code=204)


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
