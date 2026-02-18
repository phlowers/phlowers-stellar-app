# Set-up Mechaphlowers Guide

## Overview

The `set_up_mechaphlowers_v2.py` script automates the configuration of **Python packages for Pyodide** in this Angular web application.

**Key features:**

- Automatic build and integration of **stellar-engine** (local Python middleware)
- Simplified dependency resolution using `uv pip compile` with constraints
- CDN-first approach: prefers Pyodide-optimized wasm32 wheels
- Brotli/Gzip compression (~26% bandwidth reduction)
- Bytecode `.pyc` compilation for faster execution (wheels renamed to cp313)
- Support for local CDN directory and local mechaphlowers wheel testing

---

## Architecture

```
Phase 1: BUILD STELLAR-ENGINE
  └─ Build the stellar-engine wheel using uv build

Phase 2: RESOLVE DEPENDENCIES
  └─ Use uv pip compile with constraints.in to resolve all dependencies
      (from stellar-engine deps + thermohl from package.json config)

Phase 3: PYODIDE SETUP
  └─ Download runtime from NPM (pyodide.asm.wasm, pyodide.asm.js, python_stdlib.zip, pyodide-lock.json)

Phase 4: DOWNLOAD PACKAGES
  └─ Download resolved packages via pip, add stellar-engine wheel

Phase 5: REPLACE WITH CDN WHEELS
  └─ Replace pip wheels with wasm32 versions from CDN (or local CDN directory)

Phase 6: COMPILE & DEDUPLICATE
  └─ Deduplicate (wasm32 > cp313 > py3), compile to .pyc (renames py3 → cp313)

Phase 7: COMPRESS & CONFIG
  └─ Compress large files (>1MB), generate python-packages.json

Phase 8: VERIFY
  └─ Verify all resolved dependencies are installed
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
    "mechaphlowers": "0.5.3",
    "thermohl": "1.4.0"
  }
}
```

**To update versions:** modify `package.json`, then run `npm run set-up-mechaphlowers`.

### Key files

| File | Purpose |
|------|---------|
| `stellar-engine/` | Local Python middleware package (auto-built) |
| `scripts/constraints.in` | Version constraints for Pyodide CDN compatibility |
| `scripts/requirements-resolved.txt` | Auto-generated resolved dependencies |

### Key constants

| Constant | Value |
|----------|-------|
| `PYODIDE_DIR` | `./public/pyodide` |
| `PACKAGES_JSON_PATH` | `./src/app/core/services/worker_python/python-packages.json` |

---

## Core Functions

### Utilities

| Function | Purpose |
|----------|---------|
| `normalize_name()` | Normalize package name per PEP 503 |
| `parse_wheel()` | Extract (name, version) from wheel filename |
| `get_wheels()` | List all wheel filenames in directory |
| `run_cmd()` | Run subprocess command with error handling |
| `get_config()` | Load versions from package.json (cached) |
| `get_cdn_url()` | Build Pyodide CDN URL |
| `get_wheel_dependencies()` | Extract dependencies from wheel METADATA |

### Pipeline Steps

| Function | Purpose |
|----------|---------|
| `build_stellar_engine()` | Build stellar-engine wheel using `uv build` |
| `resolve_dependencies()` | Use `uv pip compile` with constraints |
| `download_pyodide_runtime()` | Download Pyodide runtime from NPM |
| `download_packages()` | Download resolved packages via pip |
| `fetch_cdn_lock()` | Get available packages from CDN or local directory |
| `replace_with_cdn_wheels()` | Replace pip wheels with CDN/local wasm32 wheels |
| `deduplicate_wheels()` | Remove duplicates (priority: wasm32 > cp313 > py3) |
| `compile_wheels()` | Compile to .pyc using `pyodide py-compile` |
| `compress_wheels()` | Brotli + Gzip compression (skips CDN files and files < 1MB) |
| `generate_packages_json()` | Generate config for Python worker |

---

## Usage

```bash
# Standard execution
npm run set-up-mechaphlowers

# Skip compression (faster for debugging)
npm run set-up-mechaphlowers:skip-compression

# Use local CDN directory (offline mode)
npm run set-up-mechaphlowers:local-cdn -- /path/to/cdn

# Test with local mechaphlowers wheel
npm run set-up-mechaphlowers:local-mechaphlowers -- ./mechaphlowers-0.5.3-py3-none-any.whl

# With custom NPM registry
npm run set-up-mechaphlowers -- --npm-registry-url https://registry.npmmirror.com/
```

---

## Output Structure

```
public/pyodide/
├── pyodide.asm.wasm, pyodide.asm.js, python_stdlib.zip, pyodide-lock.json
├── numpy-2.2.5-cp313-cp313-pyodide_2025_0_wasm32.whl     (CDN)
├── pandas-2.3.1-cp313-cp313-pyodide_2025_0_wasm32.whl    (CDN)
├── mechaphlowers-0.5.3-cp313-none-any.whl                (PyPI, compiled)
├── stellar_engine-0.1.0-cp313-none-any.whl               (LOCAL, compiled)
├── plotly-5.24.1-cp313-none-any.whl                      (PyPI, compiled)
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
| `'mechaphlowers' not found in config` | Add `"config": {"mechaphlowers": "0.5.2"}` to package.json |
| `Could not fetch pyodide-lock.json` | Check internet connection or use `--local-cdn-dir` |
| `pyodide-lock.json not found` | Ensure local CDN directory contains pyodide-lock.json |

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
| **Configuration** | Single source of truth in package.json + constraints.in |
| **Strategy** | `uv pip compile` with constraints, CDN wheel replacement |
| **Deduplication** | Priority: wasm32 > cp313 > py3 |
| **Compilation** | `pyodide py-compile` (renames py3 → cp313) |
| **Compression** | Brotli + Gzip for non-CDN wheels > 1MB |
| **Architecture** | ~560 lines, type hints, `@cache` decorator, helper functions |

---

## Resources

- [Pyodide Documentation](https://pyodide.org/)
- [mechaphlowers GitHub](https://github.com/phlowers/mechaphlowers)
- [jsDelivr CDN](https://www.jsdelivr.com/)
- [uv Documentation](https://docs.astral.sh/uv/)

---

**Last update**: January 20, 2026
