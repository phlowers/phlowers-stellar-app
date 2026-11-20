#!/usr/bin/env bash
# Generates the Python (stellar-engine) CycloneDX 1.5 SBOM from uv.lock.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SBOM_DIR="${SBOM_DIR:-$ROOT_DIR/sbom}"
mkdir -p "$SBOM_DIR"

cd "$ROOT_DIR/stellar-engine"
uv export --frozen --no-dev --format cyclonedx1.5 --output-file "$SBOM_DIR/sbom-python.json" >/dev/null
