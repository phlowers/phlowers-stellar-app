#!/usr/bin/env bash
# Builds the Angular and Python SBOMs, then merges them into a single CycloneDX 1.5 XML file.
# Requires the CycloneDX CLI (https://github.com/CycloneDX/cyclonedx-cli) on PATH,
# or its location in the CYCLONEDX_CLI environment variable.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SBOM_DIR="${SBOM_DIR:-$ROOT_DIR/sbom}"
CYCLONEDX_CLI="${CYCLONEDX_CLI:-cyclonedx}"

if ! command -v "$CYCLONEDX_CLI" >/dev/null 2>&1; then
  echo "CycloneDX CLI not found ('$CYCLONEDX_CLI'). Install it from" \
    "https://github.com/CycloneDX/cyclonedx-cli/releases or set CYCLONEDX_CLI." >&2
  exit 1
fi

export SBOM_DIR
"$ROOT_DIR/scripts/sbom-ng.sh"
"$ROOT_DIR/scripts/sbom-py.sh"

"$CYCLONEDX_CLI" merge \
  --input-files "$SBOM_DIR/sbom-angular.json" "$SBOM_DIR/sbom-python.json" \
  --input-format json \
  --output-format xml \
  --output-version v1_5 \
  --output-file "$SBOM_DIR/sbom-complet.xml"

echo "SBOM written to $SBOM_DIR/sbom-complet.xml"
