#!/usr/bin/env bash
# Generates the Python (stellar-engine) CycloneDX 1.5 XML SBOM with cyclonedx-py, from a
# temporary runtime-only environment installed from uv.lock (dev dependencies excluded).
# Requires uv; cyclonedx-py is fetched on demand via `uvx` (override with CYCLONEDX_PY).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SBOM_DIR="${SBOM_DIR:-$ROOT_DIR/sbom}"
mkdir -p "$SBOM_DIR"
SBOM_DIR="$(cd "$SBOM_DIR" && pwd)"

ENV_DIR="$(mktemp -d)"
trap 'rm -rf "$ENV_DIR"' EXIT

cd "$ROOT_DIR/stellar-engine"
UV_PROJECT_ENVIRONMENT="$ENV_DIR/venv" uv sync --frozen --no-dev --no-install-project >/dev/null 2>&1

if [[ -n "${CYCLONEDX_PY:-}" ]]; then
  CYCLONEDX_PY_CMD=("$CYCLONEDX_PY")
else
  CYCLONEDX_PY_CMD=(uvx --from cyclonedx-bom cyclonedx-py)
fi

"${CYCLONEDX_PY_CMD[@]}" environment \
  --of XML --sv 1.5 \
  --pyproject pyproject.toml --mc-type application \
  --output-file "$SBOM_DIR/sbom-python.xml" \
  "$ENV_DIR/venv/bin/python"
