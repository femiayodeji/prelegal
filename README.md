# Prelegal

A platform for drafting common legal agreements.

## Status

🚧 **Work in progress** — under active development, expected to be completed by 2026-07-16.

This is the **V1 foundation** ([PL-4](https://femi-ayodeji.atlassian.net/browse/PL-4)):
the full technical stack (frontend + backend + throwaway database, containerised)
is in place, but product features are unchanged from the prototype. The only
feature so far is the Mutual NDA creator, reached through a **fake login**
(no real authentication yet — any details bring you into the platform).

## Architecture

- **backend/** — [uv](https://docs.astral.sh/uv/) project running **FastAPI**. Serves
  the JSON API under `/api` and the statically-exported frontend for everything else.
  On startup it recreates a throwaway **SQLite** database (with a `users` table) from
  scratch.
- **frontend/** — **Next.js** (App Router) + TypeScript + Tailwind, built as a static
  export (`next build` → `frontend/out`) and served by the backend.
- Everything is packaged into a **single Docker container** listening on
  **http://localhost:8000**.

## Running with Docker

Use the start/stop scripts for your platform:

```bash
# macOS
scripts/start-mac.sh
scripts/stop-mac.sh

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh
```

```powershell
# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```

The start script builds the image and runs the container; open
**http://localhost:8000**. The stop script removes the container (the SQLite
database is discarded and recreated on the next start).

## Local development

Run the two dev servers separately for fast iteration:

```bash
# Frontend (http://localhost:3000)
cd frontend && npm install && npm run dev

# Backend (http://localhost:8000) — serves frontend/out if it has been built
cd backend && uv run uvicorn app.main:app --reload
```

## Testing

```bash
# Frontend
cd frontend
npm run lint
npm test               # Vitest unit tests
npx playwright test    # e2e: login gate + NDA workflow

# Backend
cd backend
uv run pytest          # API health, static serving, DB init
```

## Templates & license

The legal templates in `templates/` come from
[Common Paper](https://github.com/CommonPaper), free to use and modify under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). See `catalog.json`.
