# Prelegal Project

## Overview

Prelegal is a SaaS product that lets users draft legal agreements based on the
templates in the `templates/` directory. Users sign in, then hold a freeform AI
chat that establishes which document they want and fills in its fields. The
available documents are covered in the `catalog.json` file in the project root,
included here:

@catalog.json

The product is fully built (PL-4 → PL-7): real accounts, an AI chat that covers
every supported document type, saved documents, and a professional UI.

## Architecture (current state)

- **Backend** (`backend/`, a `uv` + FastAPI project) serves the JSON API under
  `/api` and the statically-exported frontend for everything else. Key modules:
  - `main.py` — app factory, routes, and the auth/DB dependencies.
  - `auth.py` — PBKDF2 password hashing + opaque cookie sessions.
  - `store.py` — per-user saved-document CRUD (ownership-scoped).
  - `documents.py` — loads `catalog.json` + templates and extracts each
    template's fill-in "Variables".
  - `llm.py` — the Cerebras chat integration (see AI design below).
  - `db.py` / `config.py` — throwaway SQLite bootstrap and settings.
- **Frontend** (`frontend/`, Next.js) is a **static export** (`output: export`)
  with no server of its own — it is served by FastAPI. All server work
  (LLM calls, auth, persistence) goes through the API. The document assistant
  lives in `components/DocChat` + `DocumentPreview` + `DocWorkspace`.
- **API surface**: `POST /api/auth/{signup,login,logout}` + `GET /api/auth/me`
  (HttpOnly cookie session); `GET /api/documents[/{filename}]` (public catalog +
  template markdown); `POST /api/chat` (auth-required); and
  `GET/POST/PUT/DELETE /api/saved-documents[/{id}]` (auth-required, per-user).
- **Auth model**: real sign up / sign in against the `users` table; passwords
  hashed with stdlib PBKDF2-HMAC-SHA256; sessions are opaque tokens in an
  HttpOnly cookie (not JWT — a single-container, reset-on-restart DB gains
  nothing from statelessness, and opaque tokens are trivially revocable).

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project should be packaged into a Docker container.  
The backend should be in backend/ and be a uv project, using FastAPI.  
The frontend should be in frontend/  
The database uses SQLite and is created from scratch each time the Docker container is brought up. It holds the `users`, `sessions`, and `saved_documents` tables, so all accounts and saved documents reset when the server restarts.  
The frontend is statically built and served via FastAPI.  
There should be scripts in scripts/ for:  
```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```
Backend available at http://localhost:8000

The `OPENROUTER_API_KEY` is provided to the container at runtime from `.env`
(`.env` is never baked into the image). Under WSL + Docker Desktop,
`start-linux.sh` automatically works around the Windows credential helper
(`credsStore: "desktop.exe"`) that otherwise breaks `docker build`.

## Color Scheme
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`
