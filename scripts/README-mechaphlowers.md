# set_up_mechaphlowers.py - Quick Reference

## 🚀 Quick Start

```bash
# Download and optimize mechaphlowers with Pyodide
npm run set-up-mechaphlowers
```

## 📊 What does this script do?

```
Input: package.json (versions) + Pyodide CDN
                ↓
        ┌───────────────┐
        │ Read versions │ → pyodide + mechaphlowers from package.json
        └───────────────┘
                ↓
        ┌───────────────┐
        │  Fetch CDN    │ → Build constraints for NATIVE packages only
        │  packages     │   (numpy, pandas, pydantic-core, etc.)
        └───────────────┘
                ↓
        ┌───────────────┐
        │  pip download │ → Download with native constraints
        │  + constraints│   Pure Python packages resolved freely
        └───────────────┘
                ↓
        ┌───────────────┐
        │  CDN wheels   │ → Replace manylinux with wasm32 wheels
        │  download     │   for matching versions
        └───────────────┘
                ↓
        ┌───────────────┐
        │ Deduplicate   │
        │ + Compile     │ → .pyc bytecode compilation
        └───────────────┘
                ↓
        ┌───────────────┐
        │ Compression   │ → Brotli + Gzip (skipped for local wheels)
        └───────────────┘
                ↓
Output: ./public/pyodide/ (optimized wheels)
        ./src/app/.../python-packages.json (config)
```

## 🎯 Results

- ✅ **26 packages** downloaded and optimized
- ✅ **14/26 from CDN** (Pyodide-optimized versions)
- ✅ **12/26 via pip** (non-CDN packages)
- ✅ **6.7 MB** saved (compression)
- ✅ **Zero maintenance** - adapts automatically

## 🔑 Key Features

### 1. Native-only constraints
```python
# Constrain ONLY native packages to CDN versions
NATIVE_PACKAGES = frozenset({
    "pydantic-core",  # Rust
    "numpy", "pandas", "pyyaml", "scipy", "pillow", "lxml",  # C/C++
    "wrapt", "xxhash",  # C
})

# Pure Python packages (pydantic, pandera, etc.) resolved freely by pip
# → Ensures compatibility with all dependencies
```

### 2. CDN Intelligence
```python
# Checks CDN for each dependency
cdn_packages = fetch_cdn_packages(cdn_url)  # → 343 available

Optimized:
  - numpy → numpy-2.2.5-cp313-cp313-pyodide_2025_0_wasm32.whl (CDN wasm32)
  - pandas → pandas-2.3.1-cp313-cp313-pyodide_2025_0_wasm32.whl (CDN wasm32)
  - pydantic → resolved by pip (pure Python, works everywhere)
```

### 3. Optimal compression
```
plotly (25.40 MB) → Brotli + Gzip → 18.74 MB (26% reduction)

Strategy:
  - Skip CDN files (already compressed)
  - Skip small files (< 1 MB)
  - Compress only what's worth it
```

## 📁 Generated files

```
public/pyodide/
├── pyodide.asm.wasm                    (runtime)
├── pyodide.asm.js                      (runtime)
├── python_stdlib.zip                   (stdlib)
├── pyodide-lock.json                   (inventory)
├── numpy-2.2.5-cp313-cp313-pyodide_2025_0_wasm32.whl
├── pandas-2.3.1-cp313-cp313-pyodide_2025_0_wasm32.whl
├── plotly-5.24.1-cp312-none-any.whl
├── plotly-5.24.1-cp312-none-any.whl.br (Brotli)
├── plotly-5.24.1-cp312-none-any.whl.gz (Gzip)
└── ... 21 other wheels

src/app/core/services/worker_python/
└── python-packages.json   (config with all packages)
```

## 🔧 Version configuration

Versions are automatically read from `package.json`:

```json
{
  "dependencies": {
    "pyodide": "^0.28.3"    // → PYODIDE_VERSION = "0.28.3"
  },
  "config": {
    "mechaphlowers": "0.5.1" // → MECHAPHLOWERS_VERSION = "0.5.1"
  }
}
```

**To update a version**, simply modify `package.json`!

## 🔧 Advanced options

```bash
# Custom PyPI index
npm run set-up-mechaphlowers -- --uv-index https://my-index.com/simple

# Custom NPM registry
npm run set-up-mechaphlowers -- --npm-registry-url https://registry.npmmirror.com/

# Skip compression (debug)
npm run set-up-mechaphlowers -- --skip-compression

# Test with a local wheel (compression auto-skipped)
npm run set-up-mechaphlowers:local ./mechaphlowers-0.5.2b0-py3-none-any.whl
```

## ⚡ Optimized algorithms

### CDN search: O(n²) → O(n) with case-insensitive normalization

**Before**: 26 packages × 343 CDN packages = 8,918 comparisons  
**After**: 343 lookup setup + 26 searches = 369 operations  
**Gain**: 24× faster 🚀

**Normalization**: `PyYAML` + `pyyaml` = single package (no false duplicates)

### No redundant calls

```python
# Centralized function for normalization
def normalize_name(name: str) -> str:
    """Normalize package name per PEP 503."""
    return name.lower().replace("_", "-")

# BEFORE: .lower().replace("_", "-") repeated 8 times
# AFTER: normalize_name() used everywhere
```

## 📊 Execution flow

```
main()
├─ Config.from_package_json()             Read versions from package.json
├─ download_pyodide_runtime()             Download Pyodide from NPM
├─ fetch_cdn_packages()                   Get CDN package list
├─ build_native_constraints()             Constraints for native packages ONLY
├─ download_with_pip()                    Download with constraints
├─ check_version_compatibility()          Warn about potential issues
├─ download_cdn_wheels()                  Replace manylinux → wasm32
├─ deduplicate_wheels()                   Remove duplicates (priority system)
├─ compile_wheels()                       Compile to .pyc
├─ compress_wheels()                      Brotli + Gzip (skipped for --local-wheel)
└─ generate_packages_json()               Final config
```

## 🔧 Advanced features

### Modern Python 3.12+ types
```python
# BEFORE: from typing import Dict, List
# list[str], dict[str, str] instead of List[str], Dict[str, str]
```

### Centralized `normalize_name()` function
```
- PyYAML → pyyaml
- pydantic_core → pydantic-core
- PEP 503 compliant normalization
```

### Case-insensitive normalization
```
PyYAML (pip)  ┐
pyyaml (CDN)  ├→ SAME PACKAGE → only 1 version kept
PyYAML (CDN)  ┘

Smart priorities:
  1. Pyodide optimized (cp313-pyodide) ← PREFERRED
  2. Compiled (cp312 or cp313)
  3. Generic (py3-none)
```

### Guaranteed duplicate removal
- Case-insensitive: `pydantic_core` = `pydantic-core`
- Underscore normalization: `_` → `-`
- Zero duplicates after execution (automatically verified)

## ✅ Troubleshooting

**Error**: "Could not fetch pyodide-lock.json"
```bash
curl https://cdn.jsdelivr.net/pyodide/v0.28.3/full/pyodide-lock.json
npm run set-up-mechaphlowers
```

**Warning**: "Found more than one output tag"  
→ Normal, the script handles it automatically

**Recreate from scratch**:
```bash
rm -rf public/pyodide
rm -f src/app/core/services/worker_python/python-packages.json
npm run set-up-mechaphlowers
```

## 🔗 References

- See `docs/setup-mechaphlowers-guide.md` for complete documentation
- [Pyodide Docs](https://pyodide.org/)
- [mechaphlowers GitHub](https://github.com/phlowers/mechaphlowers)

---

**Version**: Read from package.json (pyodide: dependencies, mechaphlowers: config)  
**Date**: January 7, 2026  
**Script**: ~680 lines, dataclasses, type hints  
**Key features**: Native-only constraints, `--local-wheel` option (auto-skips compression), compatibility warnings
