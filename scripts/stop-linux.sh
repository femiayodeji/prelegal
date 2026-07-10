#!/usr/bin/env bash
# Stop and remove the Prelegal container (Linux).
set -euo pipefail

CONTAINER="prelegal"

echo "Stopping container ${CONTAINER}..."
docker rm -f "${CONTAINER}" >/dev/null 2>&1 || true

echo "Prelegal stopped."
