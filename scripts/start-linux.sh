#!/usr/bin/env bash
# Build and run the Prelegal container (Linux). App at http://localhost:8000.
set -euo pipefail

IMAGE="prelegal:latest"
CONTAINER="prelegal"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Under WSL, Docker Desktop points the credential store at a Windows helper
# (e.g. "credsStore": "desktop.exe"). That helper can't exec in the Linux build
# context, so `docker build` fails even pulling public base images
# ("fork/exec .../docker-credential-desktop.exe: exec format error"). When we
# detect such a helper, build with a throwaway Docker config that has none — the
# base images here are public, so anonymous pulls are fine.
if grep -Eq '"credsStore"[[:space:]]*:[[:space:]]*"[^"]*\.exe"' \
    "${HOME}/.docker/config.json" 2>/dev/null; then
  CLEAN_DOCKER_CONFIG="$(mktemp -d)"
  trap 'rm -rf "${CLEAN_DOCKER_CONFIG}"' EXIT
  printf '{}\n' > "${CLEAN_DOCKER_CONFIG}/config.json"
  export DOCKER_CONFIG="${CLEAN_DOCKER_CONFIG}"
  echo "Detected a Windows Docker credential helper; using a clean Docker config for the build."
fi

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
