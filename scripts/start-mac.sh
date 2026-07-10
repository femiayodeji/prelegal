#!/usr/bin/env bash
# Build and run the Prelegal container (macOS). App at http://localhost:8000.
set -euo pipefail

IMAGE="prelegal:latest"
CONTAINER="prelegal"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Building image ${IMAGE}..."
docker build -t "${IMAGE}" "${ROOT}"

# Replace any previous instance so the SQLite DB is recreated from scratch.
docker rm -f "${CONTAINER}" >/dev/null 2>&1 || true

# Pass secrets (e.g. OPENROUTER_API_KEY for the AI chat) in at runtime from the
# untracked project .env — they are never baked into the image.
ENV_ARGS=()
if [[ -f "${ROOT}/.env" ]]; then
  ENV_ARGS+=(--env-file "${ROOT}/.env")
fi

echo "Starting container ${CONTAINER}..."
docker run -d --name "${CONTAINER}" -p 8000:8000 "${ENV_ARGS[@]}" "${IMAGE}"

echo "Prelegal is running at http://localhost:8000"
