#!/usr/bin/env bash
# Generates the Angular (npm) CycloneDX 1.5 SBOM from package-lock.json.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SBOM_DIR="${SBOM_DIR:-$ROOT_DIR/sbom}"
mkdir -p "$SBOM_DIR"
SBOM_DIR="$(cd "$SBOM_DIR" && pwd)"

cd "$ROOT_DIR"
npx --no-install cyclonedx-npm --package-lock-only --ignore-npm-errors --omit dev --spec-version 1.5 --output-format XML \
  --output-file "$SBOM_DIR/sbom-angular.xml"
