# ---------------------------------------------------------------------------
# Stage 1 — build the static Next.js frontend (next build with output:'export').
# ---------------------------------------------------------------------------
FROM node:22-slim AS frontend
WORKDIR /frontend

# Install dependencies against the lockfile first for better layer caching.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build   # emits /frontend/out

# ---------------------------------------------------------------------------
# Stage 2 — Python/uv runtime that serves the API and the static export.
# ---------------------------------------------------------------------------
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS runtime
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    # Serve the frontend copied in below and keep the throwaway DB in /app.
    PRELEGAL_STATIC_DIR=/app/static \
    PRELEGAL_DB_PATH=/app/prelegal.db \
    # Legal document catalog + templates copied in below.
    PRELEGAL_CATALOG_PATH=/app/catalog.json \
    PRELEGAL_TEMPLATES_DIR=/app/templates

# Install backend dependencies against the lockfile (cached unless it changes).
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

# App code + the built frontend from stage 1.
COPY backend/ ./
COPY --from=frontend /frontend/out ./static
# Legal document catalog + templates served/consumed by the backend.
COPY catalog.json ./catalog.json
COPY templates/ ./templates
RUN uv sync --frozen --no-dev

EXPOSE 8000
CMD ["uv", "run", "--no-dev", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
