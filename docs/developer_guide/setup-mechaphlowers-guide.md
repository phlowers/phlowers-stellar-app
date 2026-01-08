# set_up_mechaphlowers.py Guide

## Overview

The `set_up_mechaphlowers.py` script automates the configuration of **mechaphlowers with Pyodide** for this Angular web application.

**Key features:**

- Automatic dependency detection (direct + transitive)
- CDN-first approach: prefers Pyodide-optimized wasm32 wheels
- Brotli/Gzip compression (~26% bandwidth reduction)
- Bytecode `.pyc` compilation for faster execution
- Zero maintenance: adapts automatically to CDN changes

---

## Architecture

```
Phase 1: PYODIDE SETUP
  └─ Download runtime from NPM (pyodide.asm.wasm, pyodide.asm.js, python_stdlib.zip, pyodide-lock.json)

Phase 2: CDN ANALYSIS
  └─ Fetch CDN packages, build constraints for NATIVE packages only (C/Rust extensions)

Phase 3: PIP DOWNLOAD
  └─ Download mechaphlowers + dependencies (native pinned to CDN, pure Python resolved freely)

Phase 4: CDN WHEEL DOWNLOAD
  └─ Replace manylinux wheels with wasm32 versions from CDN

Phase 5: OPTIMIZATION
  └─ Deduplicate (wasm32 > cp313 > py3), compile to .pyc, compress large files (>1MB)

Phase 6: CONFIG GENERATION
  └─ Generate python-packages.json for the Python worker
```

---

## Configuration

Versions are read from `package.json` (single source of truth):

```json
{
  "dependencies": {
    "pyodide": "^0.28.3"
  },
  "config": {
    "mechaphlowers": "0.5.1"
  }
}
```

**To update versions:** modify `package.json`, then run `npm run set-up-mechaphlowers`.

### Key constants

| Constant | Value |
|----------|-------|
| `PYODIDE_DIR` | `./public/pyodide` |
| `PACKAGES_JSON_PATH` | `./src/app/core/services/worker_python/python-packages.json` |
| `NATIVE_PACKAGES` | `pydantic-core`, `numpy`, `pandas`, `pyyaml`, `scipy`, `pillow`, `lxml`, `wrapt`, `xxhash` |

---

## Core Functions

| Function | Purpose |
|----------|---------|
| `Config.from_package_json()` | Load versions from package.json |
| `fetch_cdn_packages()` | Get available packages from Pyodide CDN |
| `build_native_constraints()` | Pin native packages to CDN versions |
| `download_with_pip()` | Download package + dependencies via pip |
| `download_cdn_wheels()` | Download wasm32 wheels from CDN |
| `deduplicate_wheels()` | Remove duplicates, keep best version (priority: wasm32 > cp313 > py3) |
| `compress_wheels()` | Brotli + Gzip compression (skips CDN files and files < 1MB) |
| `generate_packages_json()` | Generate config for Python worker |

---

## Usage

```bash
# Standard execution
npm run set-up-mechaphlowers

# With custom PyPI index
npm run set-up-mechaphlowers -- --uv-index https://my-index.com/simple

# With custom NPM registry
npm run set-up-mechaphlowers -- --npm-registry-url https://registry.npmmirror.com/

# Skip compression (debugging)
npm run set-up-mechaphlowers -- --skip-compression

# Test with local wheel (compression auto-skipped)
npm run set-up-mechaphlowers:local ./mechaphlowers-0.5.2b0-py3-none-any.whl
```

---

## Output Structure

```
public/pyodide/
├── pyodide.asm.wasm, pyodide.asm.js, python_stdlib.zip, pyodide-lock.json
├── numpy-2.2.5-cp313-cp313-pyodide_2025_0_wasm32.whl     (CDN)
├── pandas-2.3.1-cp313-cp313-pyodide_2025_0_wasm32.whl    (CDN)
├── mechaphlowers-0.5.1-cp313-none-any.whl                (pip)
├── plotly-5.24.1-cp313-none-any.whl                      (pip)
├── plotly-5.24.1-cp313-none-any.whl.br                   (compressed)
└── ... other wheels ...

src/app/core/services/worker_python/
└── python-packages.json
```

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| `'pyodide' not found in package.json` | Run `npm install pyodide@^0.28.3` |
| `'mechaphlowers' not found in config` | Add `"config": {"mechaphlowers": "0.5.1"}` to package.json |
| `Could not fetch pyodide-lock.json` | Check internet connection |
| `Some packages may not have been downloaded` | Try `--uv-index https://pypi.org/simple` |

### Verify installation

```bash
ls -lh public/pyodide/*.whl | wc -l              # Count packages
du -sh public/pyodide/                            # Total size
cat src/app/core/services/worker_python/python-packages.json | jq 'keys | length'
```

### Clean rebuild

```bash
rm -rf public/pyodide
rm -f src/app/core/services/worker_python/python-packages.json
npm run set-up-mechaphlowers
```

---

## Summary

| Aspect | Detail |
|--------|--------|
| **Configuration** | Single source of truth in package.json |
| **Strategy** | Constrain native packages only, pip resolves pure Python |
| **Deduplication** | Priority: wasm32 > cp313 > py3 |
| **Compression** | Brotli + Gzip, skipped for --local-wheel |
| **Architecture** | Dataclasses, type hints, ~680 lines |

---

## Resources

- [Pyodide Documentation](https://pyodide.org/)
- [mechaphlowers GitHub](https://github.com/phlowers/mechaphlowers)
- [jsDelivr CDN](https://www.jsdelivr.com/)

---

**Last update**: January 8, 2026
