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
        │ Read versions │
        │               │ → pyodide + mechaphlowers from package.json
        └───────────────┘
                ↓
        ┌───────────────┐
        │   Analyze     │
        │ dependencies  │ → 26 packages (direct + transitive)
        └───────────────┘
                ↓
        ┌───────────────┐
        │    Check      │
        │  Pyodide CDN  │ → 14 packages available
        └───────────────┘
                ↓
        ┌───────────────┐
        │    Smart      │
        │   download    │ → CDN (14) + pip (12)
        └───────────────┘
                ↓
        ┌───────────────┐
        │ Optimization  │
        │ & Compression │ → Brotli + Gzip, 26% reduction
        └───────────────┘
                ↓
Output: ./public/pyodide/ (26 optimized wheels)
        ./src/app/.../python-packages.json (config)
```

## 🎯 Results

- ✅ **26 packages** downloaded and optimized
- ✅ **14/26 from CDN** (Pyodide-optimized versions)
- ✅ **12/26 via pip** (non-CDN packages)
- ✅ **6.7 MB** saved (compression)
- ✅ **Zero maintenance** - adapts automatically

## 🔑 Key Features

### 1. Complete automatic detection
```python
# Extracts all resolved dependencies (direct + transitive)
get_mechaphlowers_dependencies()  # → 26 packages

Automatically includes:
  - numpy, pandas, scipy (large packages)
  - pydantic, pydantic-core (validation)
  - All sub-dependencies
```

### 2. CDN Intelligence
```python
# Checks CDN for each dependency
available_packages = get_available_packages_from_cdn()  # → 14 found

Optimized:
  - numpy → numpy-2.2.5-cp313-cp313-pyodide_2025_0_wasm32.whl (Pyodide)
  - pandas → pandas-2.3.1-cp313-cp313-pyodide_2025_0_wasm32.whl (Pyodide)
  - Missing packages → downloaded via pip
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
def normalize_package_name(name: str) -> str:
    return name.lower().replace("_", "-")

# BEFORE: .lower().replace("_", "-") repeated 8 times
# AFTER: normalize_package_name() used everywhere
```

## 📊 Execution flow

```
main()
├─ get_versions_from_package_json()       Read versions from package.json
├─ recreate_directory()                    Clean ./public/pyodide
├─ download_and_extract_tgz()             Download Pyodide (NPM)
├─ keep_only_needed_files()               Keep only essentials
├─ get_mechaphlowers_dependencies()       Resolve all deps
├─ get_available_packages_from_cdn()      Check CDN
├─ download_optimized_wheels_from_cdn()   Download CDN (14)
├─ subprocess.run([pip download...])      Download pip (12)
├─ pyodide_build()                        Compile to .pyc
├─ remove_duplicate_wheels()              Clean duplicates
├─ cleanup *.old files                    Remove leftover files
├─ compress_pyodide_wheels()              Brotli + Gzip
└─ write_python_packages_json()           Final config
```

## 🔧 Advanced features

### Modern Python 3.12+ types
```python
# BEFORE: from typing import Dict, List
# list[str], dict[str, str] instead of List[str], Dict[str, str]
```

### Centralized `normalize_package_name()` function
```
- PyYAML → pyyaml
- pydantic_core → pydantic-core
- Eliminates duplication (~8 times → 1 function)
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
**Date**: January 6, 2026  
**Script**: ~700 lines, 12 imports  
**Optimizations**: Versions centralized in package.json, `normalize_package_name()` function, modern Python 3.12+ types, deduplication via `set`
