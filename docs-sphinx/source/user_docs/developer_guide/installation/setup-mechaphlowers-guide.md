# Set-up Mechaphlowers Guide

## Overview

The `set_up_mechaphlowers_v2.py` script builds **stellar-engine** from source and prepares all Python packages for the **Pyodide** web worker.

**What it does:**

1. Builds the `stellar-engine` wheel (which depends on `mechaphlowers`)
2. Downloads the Pyodide runtime from NPM
3. Downloads all transitive dependencies via `pip download`
4. Replaces packages with pre-compiled CDN wheels when available
5. Compiles remaining wheels to bytecode and generates `python-packages.json`

---

## Architecture

```
Step 1: BUILD STELLAR-ENGINE
  └─ uv build --wheel (optionally patch mechaphlowers version for local wheel)

Step 2: DOWNLOAD PYODIDE RUNTIME
  └─ Fetch Pyodide runtime from NPM registry

Step 3: DOWNLOAD PACKAGES
  └─ Extract deps from built wheel → pip download with constraints.in

Step 4: CDN REPLACEMENT
  └─ Replace pip wheels with wasm32 versions from CDN (or local CDN directory)

Step 5: COMPILE & CONFIG
  └─ Deduplicate, compile to .pyc, generate python-packages.json
```

---

## Configuration

The Pyodide version is read from `package.json`:

```json
{
  "dependencies": {
    "pyodide": "^0.28.3"
  },
  "config": {
    "mechaphlowers": "0.5.3"
  }
}
```

stellar-engine's `pyproject.toml` declares a single direct dependency:

```toml
dependencies = [
    "mechaphlowers>=0.5.3",
]
```

All transitive dependencies (thermohl, numpy, pandas, pandera, etc.) are resolved automatically by pip.

### Key files

| File | Purpose |
|------|---------|
| `stellar-engine/pyproject.toml` | stellar-engine package definition |
| `scripts/constraints.in` | Version constraints for Pyodide CDN compatibility |

---

## Usage

```bash
# Standard execution
npm run set-up-mechaphlowers

# Use local CDN directory (offline mode)
npm run set-up-mechaphlowers:local-cdn -- /path/to/cdn

# Use local mechaphlowers wheel from stellar-engine/input/
# (the local wheel's dependency versions override upstream resolution)
npm run set-up-mechaphlowers:local-mechaphlowers

# With custom NPM registry
npm run set-up-mechaphlowers -- --npm-registry-url https://registry.npmmirror.com/
```

### `--local-mechaphlowers`

Place a mechaphlowers `.whl` file in `stellar-engine/input/`.  The script will:

1. Patch `pyproject.toml` with the local version before building
2. Use the local wheel's declared dependencies for resolution
3. Replace the downloaded mechaphlowers with the local wheel
4. Restore the original `pyproject.toml` after building

---

## Output Structure

```
public/pyodide/
├── pyodide.asm.wasm, pyodide.asm.js, python_stdlib.zip, pyodide-lock.json
├── numpy-2.2.5-cp313-cp313-pyodide_2025_0_wasm32.whl     (CDN)
├── pandas-2.3.1-cp313-cp313-pyodide_2025_0_wasm32.whl    (CDN)
├── mechaphlowers-0.5.3-cp313-none-any.whl                (PyPI, compiled)
├── stellar_engine-0.1.0-cp313-none-any.whl               (built, compiled)
├── plotly-5.24.1-cp313-none-any.whl                      (PyPI, compiled)
└── ... other wheels ...

src/app/core/services/worker_python/
└── python-packages.json
```

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| `pyproject.toml not found` | Ensure `stellar-engine/pyproject.toml` exists |
| `Could not fetch pyodide-lock.json` | Check internet or use `--local-cdn-dir` |
| `multiple mechaphlowers wheels found` | Keep only one `.whl` in `stellar-engine/input/` |
| `no mechaphlowers wheel found` | Place a wheel in `stellar-engine/input/` |

### Verify installation

```bash
ls -lh public/pyodide/*.whl | wc -l
cat src/app/core/services/worker_python/python-packages.json | jq 'keys | length'
```

### Clean rebuild

```bash
rm -rf public/pyodide
rm -f src/app/core/services/worker_python/python-packages.json
npm run set-up-mechaphlowers
```

---

## Resources

- [Pyodide Documentation](https://pyodide.org/)
- [mechaphlowers GitHub](https://github.com/phlowers/mechaphlowers)
- [uv Documentation](https://docs.astral.sh/uv/)

---

**Last update**: February 19, 2026
