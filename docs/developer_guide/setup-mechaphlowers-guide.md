# Complete Guide: set_up_mechaphlowers.py

## 📋 Table of Contents
1. [Overview](#overview)
2. [General Architecture](#general-architecture)
3. [Configuration](#configuration)
4. [Main Workflow](#main-workflow)
5. [Detailed Functions](#detailed-functions)
6. [Optimizations](#optimizations)
7. [Output Examples](#output-examples)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The **`set_up_mechaphlowers.py`** script fully automates the configuration of **mechaphlowers with Pyodide** for an Angular/TypeScript web application.

### Main Objective
Download and optimize mechaphlowers Python dependencies by **dynamically preferring Pyodide CDN versions** when available.

### Key Benefits
- ✅ **Automatic detection** of all dependencies (direct and transitive)
- ✅ **CDN Intelligence**: prefers Pyodide-optimized wheels
- ✅ **Optimal compression**: Brotli + Gzip for ~60% bandwidth reduction
- ✅ **Zero maintenance**: automatically adapts to CDN changes
- ✅ **Performance**: bytecode `.pyc` compilation for fast execution

---

## General Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 1: PYODIDE SETUP                   │
├─────────────────────────────────────────────────────────────┤
│ 1. Download Pyodide runtime (NPM)                           │
│ 2. Extract only essential files                             │
│    - pyodide.asm.wasm                                       │
│    - pyodide.asm.js                                         │
│    - python_stdlib.zip                                      │
│    - pyodide-lock.json                                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│            PHASE 2: CDN ANALYSIS & CONSTRAINTS              │
├─────────────────────────────────────────────────────────────┤
│ 1. Fetch CDN package list from pyodide-lock.json            │
│ 2. Build constraints for NATIVE packages only:              │
│    - pydantic-core (Rust)                                   │
│    - numpy, pandas, pyyaml, scipy, pillow, lxml (C/C++)     │
│    - wrapt, xxhash (C)                                      │
│ 3. Pure Python packages NOT constrained (pip resolves)      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│            PHASE 3: PIP DOWNLOAD WITH CONSTRAINTS           │
├─────────────────────────────────────────────────────────────┤
│ Download mechaphlowers + all dependencies via pip           │
│    - Native packages pinned to CDN versions                 │
│    - Pure Python packages resolved freely by pip            │
│    - Ensures compatibility (e.g., pandera gets right pydantic) │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│            PHASE 4: CDN WHEEL DOWNLOAD                      │
├─────────────────────────────────────────────────────────────┤
│ Download wasm32 wheels from CDN for matching versions       │
│ Replace manylinux wheels with Pyodide-compatible versions   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│             PHASE 5: OPTIMIZATION & COMPRESSION             │
├─────────────────────────────────────────────────────────────┤
│ 1. Deduplicate wheels (priority: wasm32 > cp313 > py3)      │
│ 2. PyC compilation (bytecode) for performance               │
│ 3. Brotli/Gzip compression (~26% reduction)                 │
│    - Skip CDN files (already compressed)                    │
│    - Skip when using --local-wheel (faster dev iteration)   │
│    - Compress only files > 1 MB                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│             PHASE 6: CONFIG GENERATION                      │
├─────────────────────────────────────────────────────────────┤
│ Generate python-packages.json for Python worker             │
│ Format: {package-name: {file_name, name, source}}           │
└─────────────────────────────────────────────────────────────┘
```

---

## Configuration

### Versions centralized in package.json

Versions are automatically read from `package.json` to avoid synchronization errors:

```json
// package.json
{
  "dependencies": {
    "pyodide": "^0.28.3"     // → PYODIDE_VERSION
  },
  "config": {
    "mechaphlowers": "0.5.1"  // → MECHAPHLOWERS_VERSION
  }
}
```

### Version reading function

```python
@dataclass(frozen=True, slots=True)
class Config:
    """Configuration loaded from package.json."""
    pyodide_version: str
    mechaphlowers_version: str
    cdn_url: str
    
    @classmethod
    def from_package_json(cls) -> "Config":
        """Load configuration from package.json."""
        data = json.loads(PACKAGE_JSON_PATH.read_text(encoding="utf-8"))
        
        # Extract pyodide version (handles ^, ~, >= prefixes)
        pyodide_dep = data["dependencies"]["pyodide"]
        pyodide_version = pyodide_dep.lstrip("^~>=<")
        
        # Extract mechaphlowers version from config section
        mechaphlowers_version = data["config"]["mechaphlowers"]
        
        cdn_url = f"https://cdn.jsdelivr.net/pyodide/v{pyodide_version}/full"
        return cls(pyodide_version, mechaphlowers_version, cdn_url)
```

### Configuration variables

```python
PACKAGE_JSON_PATH = Path(__file__).parent.parent / "package.json"
PYODIDE_DIR = Path("./public/pyodide")
PACKAGES_JSON_PATH = Path("./src/app/core/services/worker_python/python-packages.json")

PYODIDE_CORE_FILES = (
    "pyodide.asm.wasm",      # WebAssembly Runtime
    "pyodide.asm.js",        # JavaScript Runtime
    "python_stdlib.zip",     # Python Stdlib
    "pyodide-lock.json",     # CDN packages inventory
)

# Native extension packages that MUST use CDN wasm32 versions
NATIVE_PACKAGES = frozenset({
    "pydantic-core",  # Rust
    "numpy", "pandas", "pyyaml", "scipy", "pillow", "lxml",  # C/C++
    "wrapt", "xxhash",  # C
})
```

### Updating versions

To update to a new version, simply modify `package.json`:

```bash
# Step 1: Modify package.json
# For Pyodide: change "pyodide": "^0.29.0" in dependencies
# For mechaphlowers: change "mechaphlowers": "0.6.0" in config

# Step 2: Rerun the script
npm run set-up-mechaphlowers
```

The script will work **automatically** with the new versions! 🚀

### Benefits of this approach

- ✅ **Single source of truth**: versions defined in one place
- ✅ **Consistency**: pyodide npm and pyodide CDN always synchronized
- ✅ **Easy maintenance**: no need to modify the Python script
- ✅ **Error detection**: script exits if a version is missing

---

## Main Workflow

### Execution order in `main()`

```python
def main() -> None:
    # 0️⃣ PARSE ARGUMENTS
    parser = argparse.ArgumentParser(...)
    parser.add_argument("--uv-index", help="Custom PyPI index URL")
    parser.add_argument("--npm-registry-url", default="https://registry.npmjs.org/")
    parser.add_argument("--skip-compression", action="store_true")
    parser.add_argument("--local-wheel", help="Path to local mechaphlowers wheel")
    args = parser.parse_args()
    
    # 1️⃣ CONFIGURATION
    config = Config.from_package_json()
    # → pyodide_version, mechaphlowers_version, cdn_url
    
    # 2️⃣ PYODIDE SETUP
    PYODIDE_DIR.mkdir(parents=True)
    download_pyodide_runtime(args.npm_registry_url, config.pyodide_version, PYODIDE_DIR)
    
    # 3️⃣ CDN ANALYSIS & CONSTRAINTS
    cdn_packages = fetch_cdn_packages(config.cdn_url)
    constraints = build_native_constraints(cdn_packages)  # NATIVE packages only!
    
    # 4️⃣ PIP DOWNLOAD WITH CONSTRAINTS
    package_spec = args.local_wheel or f"mechaphlowers=={config.mechaphlowers_version}"
    installed = download_with_pip(package_spec, PYODIDE_DIR, constraints, args.uv_index)
    
    # 5️⃣ COMPATIBILITY CHECK
    compat_warnings = check_version_compatibility(installed, cdn_packages)
    if compat_warnings:
        print("\n⚠️  Compatibility warnings:")
        for warning in compat_warnings:
            print(f"   {warning}")
    
    # 6️⃣ CDN WHEEL DOWNLOAD (matching versions)
    matching = [
        cdn_packages[name]
        for name, version in installed.items()
        if name in cdn_packages and cdn_packages[name].version == version
    ]
    cdn_wheel_names = download_cdn_wheels(matching, config.cdn_url, PYODIDE_DIR)
    cdn_package_names = {parse_wheel(w)[0] for w in cdn_wheel_names}  # Track by name
    
    # 7️⃣ OPTIMIZATION
    deduplicate_wheels(PYODIDE_DIR, cdn_wheel_names)
    compile_wheels(PYODIDE_DIR)
    deduplicate_wheels(PYODIDE_DIR, cdn_wheel_names)  # Post-compilation
    
    # 8️⃣ COMPRESSION (skipped for --local-wheel)
    if args.local_wheel:
        print("  Skipping compression (local wheel mode)")
    elif not args.skip_compression:
        compress_wheels(PYODIDE_DIR, cdn_package_names)
    
    # 9️⃣ CONFIG GENERATION
    num_packages = generate_packages_json(PYODIDE_DIR, PACKAGES_JSON_PATH)
    
    # 🎉 FINAL REPORT
    print(f"✓ Setup complete! ({num_packages} packages)")
```

---

## Detailed Functions

### 1️⃣ `fetch_cdn_packages(cdn_url) -> dict[str, CdnPackage]`

**Objective**: Fetch available packages from Pyodide CDN

**Process**:
```
1. Download pyodide-lock.json from CDN
2. Parse and build dict of CdnPackage objects
3. Normalize package names (PEP 503)
4. Return {normalized_name: CdnPackage(name, version, filename)}
```

**CdnPackage dataclass**:
```python
@dataclass(frozen=True, slots=True)
class CdnPackage:
    name: str        # Original name from CDN
    version: str     # Package version
    filename: str    # Wheel filename
```

---

### 2️⃣ `build_native_constraints(cdn_packages) -> dict[str, str]`

**Objective**: Build pip constraints for NATIVE packages only

**Why native-only?**
- Native packages (C/Rust) downloaded by pip are compiled for Linux x86_64
- These manylinux wheels don't work in WebAssembly
- Pure Python packages work everywhere - pip should resolve them freely

```python
NATIVE_PACKAGES = frozenset({
    "pydantic-core",  # Rust
    "numpy", "pandas", "pyyaml", "scipy", "pillow", "lxml",  # C/C++
    "wrapt", "xxhash",  # C
})

def build_native_constraints(cdn_packages):
    constraints = {}
    for pkg_name in NATIVE_PACKAGES:
        if pkg_name in cdn_packages:
            constraints[pkg_name] = cdn_packages[pkg_name].version
    return constraints
```

**Result**: Only native packages are pinned
```
pydantic-core==2.27.2
numpy==2.2.5
pandas==2.3.1
pyyaml==6.0.2
wrapt==1.17.2
...
```

---

### 3️⃣ `download_with_pip(package, target_dir, constraints) -> dict[str, str]`

**Objective**: Download package and all dependencies via pip

**Process**:
```
1. Write constraints.txt for native packages
2. Run: uvx pip download -d <target_dir> -c constraints.txt <package>
3. Parse downloaded wheel filenames
4. Return {normalized_name: version}
```

**Key benefit**: pip resolves pure Python packages freely
- pandera gets the pydantic version it needs
- No manual compatibility mapping required

---

### 4️⃣ `check_version_compatibility(installed, cdn_packages) -> list[str]`

**Objective**: Warn about potential version compatibility issues

```python
def check_version_compatibility(installed, cdn_packages):
    warnings = []
    
    # Example: pydantic 2.11+ needs pydantic-core 2.28+
    if "pydantic" in installed and "pydantic-core" in installed:
        pydantic_ver = installed["pydantic"]
        core_ver = installed["pydantic-core"]
        
        if pydantic_ver.startswith("2.11") and core_ver.startswith("2.27"):
            warnings.append(
                f"pydantic {pydantic_ver} may require pydantic-core >= 2.28, "
                f"but CDN has {core_ver}"
            )
    
    return warnings
```

---

### 5️⃣ `download_cdn_wheels(packages, cdn_url, target_dir) -> set[str]`

**Objective**: Download wasm32 wheels from CDN for matching versions

**Process**:
```
1. For each package where pip version == CDN version
2. Download wheel from CDN
3. Replace manylinux wheel with wasm32 version
4. Return set of downloaded filenames
```

**CDN Download**:
```
  Downloading numpy-2.2.5-cp313-cp313-pyodide_2025_0_wasm32.whl
    ✓ numpy-2.2.5-cp313-cp313-pyodide_2025_0_wasm32.whl (2.97 MB)
  Downloading pandas-2.3.1-cp313-cp313-pyodide_2025_0_wasm32.whl
    ✓ pandas-2.3.1-cp313-cp313-pyodide_2025_0_wasm32.whl (5.05 MB)
  ... etc

✓ Downloaded 14 CDN wheels
```

---

### 6️⃣ `deduplicate_wheels(directory, cdn_wheels) -> int`

**Objective**: Remove duplicate wheels, keeping best version

**Priority system** (best to worst):
```python
# 1. CDN pyodide (wasm32) - BEST for browser
# 2. cp313 compiled - good performance
# 3. CDN generic (py3-none-any) - pure Python from CDN
# 4. pip generic - fallback

def priority(wheel):
    if "pyodide" in wheel and wheel in cdn_wheels:
        return 0  # Best
    if "cp313" in wheel:
        return 1
    if wheel in cdn_wheels:
        return 2
    return 3  # Fallback
```

**Tracking by package name**:
```python
# Important: filenames change after compilation!
# numpy-2.2.5-py3-none-any.whl → numpy-2.2.5-cp313-none-any.whl
# So we track by normalized package name, not filename
cdn_package_names = {parse_wheel(w)[0] for w in cdn_wheel_names}
```

---

### 7️⃣ `compress_wheels(directory, cdn_package_names) -> float`

**Objective**: Reduce bandwidth with intelligent compression

**Strategy**:
```
1. SKIP CDN packages (tracked by name, not filename)
   ├─ Pyodide wheels are pre-compressed
   └─ No re-compression = time savings

2. SKIP small files (< 1 MB threshold)
   ├─ Compress only large files
   └─ Small files give little gain

3. SKIP in --local-wheel mode
   └─ Faster dev iteration

4. TWO-LEVEL COMPRESSION
   ├─ Brotli (-q 11): best compression (~70% reduction)
   └─ Gzip (-9): fallback if Brotli unavailable
```

---

## Optimizations

### 1. CDN search algorithm: O(n²) → O(n)

**Before (slow)**:
```python
for pkg_name in packages_to_check:           # 26 iterations
    for key in cdn_packages.keys():          # 343 iterations
        if key matches pkg_name:             # O(1) comparison
            packages[pkg_name] = wheel_file
            break
# Total: 26 × 343 = 8,918 comparisons
```

**After (fast)**:
```python
# Build lookup once: O(343)
lookup = {key.lower().replace("_", "-"): key for key in cdn_packages}

# O(1) search for each package: O(26)
for pkg_name in packages_to_check:
    if pkg_name.lower() in lookup:  # Dictionary lookup O(1)
        packages[pkg_name] = cdn_packages[lookup[pkg_name]].get("file_name")
# Total: 343 + 26 = 369 operations
```

**Gain**: 8,918 / 369 = **24× faster** 🚀

### 2. Redundant call removal

**Before**:
```python
available_packages = get_available_packages_from_cdn()
mechaphlowers_deps = get_mechaphlowers_dependencies()  # Called 2 times!
```

**After**:
```python
all_needed_deps = get_mechaphlowers_dependencies()  # Only once
available_packages = get_available_packages_from_cdn(all_needed_deps)
```

### 3. Cleaned imports

**Before**: 12 imports (including unused `re` and `typing`)
**After**: 10 imports (cleanup)

**Cleanup details**:
- Removed `import re` (was never used)
- Removed `from typing import Dict, List` (Python 3.12+ supports native `dict`/`list`)
- Reduced script size (669 → 658 lines)

### 4. `normalize_package_name()` utility function

Centralizes package name normalization:
```python
def normalize_package_name(name: str) -> str:
    """Normalize: PyYAML → pyyaml, pydantic_core → pydantic-core"""
    return name.lower().replace("_", "-")
```

Benefits:
- Eliminates code duplication (was repeated ~8 times)
- Single modification point if logic changes
- More readable and maintainable code

### 5. Intelligent compression

- ✅ Skip CDN files (already optimized)
- ✅ Skip small files (< 1 MB)
- ✅ Two-level compression (Brotli + Gzip)

### 6. Improved duplicate detection

- ✅ Case-insensitive normalization: `PyYAML` = `pyyaml`
- ✅ Underscore normalization: `pydantic_core` = `pydantic-core`
- ✅ Priority system: Pyodide optimized > compiled > generic
- ✅ Zero duplicates guaranteed after execution

### 7. Modern Python 3.12+ types

- ✅ `list[str]` instead of `List[str]`
- ✅ `dict[str, str]` instead of `Dict[str, str]`
- ✅ Using `set` for efficient deduplication

---

## Output Examples

### Complete success report

```
Recreated directory: ./public/pyodide
Downloading pyodide
Downloaded and extracted https://registry.npmjs.org//pyodide/-/pyodide-0.28.3.tgz to ./public/pyodide
Moved pyodide.asm.wasm to ./public/pyodide
Moved pyodide.asm.js to ./public/pyodide
Moved python_stdlib.zip to ./public/pyodide
Moved pyodide-lock.json to ./public/pyodide
Removed package directory

Downloading mechaphlowers and dependencies

======================================================================
CHECKING CDN FOR MECHAPHLOWERS DEPENDENCIES (Pyodide v0.28.3)
======================================================================

CDN Coverage for mechaphlowers dependencies:
  Available on CDN:  14/26
    ✓ annotated-types
    ✓ numpy
    ✓ packaging
    ✓ pandas
    ✓ platformdirs
    ✓ pydantic
    ✓ pydantic-core
    ✓ python-dateutil
    ✓ pytz
    ✓ pyyaml
    ✓ six
    ✓ typing-extensions
    ✓ tzdata
    ✓ wrapt

  Will use pip:      12/26
    ○ flexcache
    ○ flexparser
    ○ mechaphlowers
    ○ multimethod
    ○ mypy-extensions
    ○ pandera
    ○ pint
    ○ plotly
    ○ tenacity
    ○ typeguard
    ○ typing-inspect
    ○ typing-inspection

======================================================================
DOWNLOADING OPTIMIZED WHEELS FROM Pyodide CDN
======================================================================
  Downloading numpy-2.2.5-cp313-cp313-pyodide_2025_0_wasm32.whl
    ✓ numpy-2.2.5-cp313-cp313-pyodide_2025_0_wasm32.whl (2.97 MB)
  Downloading pandas-2.3.1-cp313-cp313-pyodide_2025_0_wasm32.whl
    ✓ pandas-2.3.1-cp313-cp313-pyodide_2025_0_wasm32.whl (5.05 MB)
  [... 12 other files ...]
✓ Downloaded 14 wheels from CDN

Downloading 12 packages not available on CDN with pip

Building wheel files
Compressing wheels with Brotli/Gzip

======================================================================
Compressing 1 large files (>= 1.0 MB)
Skipping 5 CDN-optimized files (already compressed)
Skipping 21 small files (< 1.0 MB)
======================================================================

plotly                            25.40 MB →    18.74 MB (26.2%) [brotli + gzip]

======================================================================
Total: 25.40 MB → 18.74 MB
Savings: 6.66 MB (26.2%)
======================================================================

✓ Setup complete!
======================================================================
  Packages: 26
  Config: ./src/app/core/services/worker_python/python-packages.json
  Bandwidth saved: 6.7 MB (~12-13%)
======================================================================
```

### Final file structure

```
public/pyodide/
├── pyodide.asm.wasm                                      (runtime)
├── pyodide.asm.js                                        (runtime)
├── python_stdlib.zip                                     (stdlib)
├── pyodide-lock.json                                     (inventory)
│
├── numpy-2.2.5-cp313-cp313-pyodide_2025_0_wasm32.whl    (CDN)
├── pandas-2.3.1-cp313-cp313-pyodide_2025_0_wasm32.whl   (CDN)
├── pydantic-2.10.6-py3-none-any.whl                     (CDN)
├── pydantic_core-2.27.2-cp313-cp313-pyodide_2025_0_wasm32.whl (CDN)
│
├── mechaphlowers-0.4.3-cp312-none-any.whl               (pip)
├── plotly-5.24.1-cp312-none-any.whl                     (pip)
├── plotly-5.24.1-cp312-none-any.whl.br                  (compressed)
├── plotly-5.24.1-cp312-none-any.whl.gz                  (fallback)
│
└── ... 20 other wheels ...

src/app/core/services/worker_python/
└── python-packages.json                                  (config)

python-packages.json:
{
  "annotated-types": {"file_name": "annotated_types-0.7.0-py3-none-any.whl", "name": "annotated_types", "source": "local"},
  "numpy": {"file_name": "numpy-2.2.5-cp313-cp313-pyodide_2025_0_wasm32.whl", "name": "numpy", "source": "local"},
  "pandas": {"file_name": "pandas-2.3.1-cp313-cp313-pyodide_2025_0_wasm32.whl", "name": "pandas", "source": "local"},
  ... etc (26 total)
}
```

---

## Troubleshooting

### ❌ Error: "'pyodide' not found in package.json dependencies"

**Cause**: The pyodide dependency is not in package.json

**Solution**:
```bash
# Check that pyodide is in dependencies
cat package.json | grep pyodide

# Add if missing
npm install pyodide@^0.28.3
```

### ❌ Error: "'mechaphlowers' not found in package.json config section"

**Cause**: The config.mechaphlowers section doesn't exist in package.json

**Solution**:
```json
// Add in package.json
{
  "config": {
    "mechaphlowers": "0.5.1"
  }
}
```

### ❌ Error: "Could not fetch pyodide-lock.json"

**Cause**: No Internet connection or CDN unavailable

**Solution**:
```bash
# Check connectivity
curl https://cdn.jsdelivr.net/pyodide/v0.28.3/full/pyodide-lock.json

# Rerun the script
npm run set-up-mechaphlowers
```

### ❌ Error: "Some packages may not have been downloaded"

**Cause**: pip couldn't download some packages

**Solution**:
```bash
# Check detailed errors
npm run set-up-mechaphlowers 2>&1 | grep -A 5 "Warning"

# Rerun with custom PyPI index
npm run set-up-mechaphlowers -- --uv-index https://pypi.org/simple
```

### ⚠️ Warning: "Found more than one output tag after py-compilation"

**Cause**: Compiled files have multiple platform tags

**Impact**: None - the script chooses the right one automatically

**Example**:
```
Found more than one output tag after py-compilation:
['cp312-cp312-manylinux_2_17_x86_64', 'cp312-cp312-manylinux2014_x86_64']
in numpy-2.2.5-cp312-cp312-manylinux_2_17_x86_64.manylinux2014_x86_64.whl
```

### 📊 Verify generated packages

```bash
# List all packages
ls -lh public/pyodide/*.whl | wc -l

# Check config
cat src/app/core/services/worker_python/python-packages.json | jq '.[] | .name' | wc -l

# See total size
du -sh public/pyodide/
```

### 🔄 Recreate from scratch

```bash
# Clean directories
rm -rf public/pyodide
rm -f src/app/core/services/worker_python/python-packages.json

# Rerun
npm run set-up-mechaphlowers
```

---

## Usage

### Simple execution

```bash
npm run set-up-mechaphlowers
```

### With custom options

```bash
# Custom PyPI index
npm run set-up-mechaphlowers -- --uv-index https://my-index.com/simple

# Other NPM registry
npm run set-up-mechaphlowers -- --npm-registry-url https://registry.npmmirror.com/

# Skip compression (for debugging)
npm run set-up-mechaphlowers -- --skip-compression

# Test with a local wheel (compression auto-skipped for faster iteration)
npm run set-up-mechaphlowers:local ./mechaphlowers-0.5.2b0-py3-none-any.whl
```

### package.json scripts

```json
{
  "scripts": {
    "set-up-mechaphlowers": "uv run scripts/set_up_mechaphlowers.py",
    "set-up-mechaphlowers:local": "uv run scripts/set_up_mechaphlowers.py --local-wheel"
  }
}
```
```

---

## Key Points Summary

| Aspect | Detail |
|--------|--------|
| **Configuration** | Versions read from package.json (single source of truth) |
| **Strategy** | Constrain NATIVE packages only, pure Python resolved by pip |
| **Native packages** | pydantic-core, numpy, pandas, pyyaml, scipy, pillow, lxml, wrapt, xxhash |
| **Deduplication** | Priority: wasm32 > cp313 > py3; track by package name |
| **Compression** | Brotli + Gzip; auto-skipped for --local-wheel |
| **Compatibility** | `check_version_compatibility()` warns about issues |
| **Architecture** | Dataclasses (Config, CdnPackage), type hints, ~680 lines |
| **Key functions** | `fetch_cdn_packages`, `build_native_constraints`, `download_with_pip` |
| **Maintenance** | Zero - versions centralized in package.json |
| **Performance** | .pyc compilation for fast execution |

---

## Resources

- [Pyodide Documentation](https://pyodide.org/)
- [mechaphlowers GitHub](https://github.com/phlowers/mechaphlowers)
- [jsDelivr CDN](https://www.jsdelivr.com/)
- [Pyodide Lock Format](https://pyodide.org/en/stable/)

---

**Last update**: January 7, 2026  
**Pyodide version**: Read from `package.json` → `dependencies.pyodide`  
**mechaphlowers version**: Read from `package.json` → `config.mechaphlowers`
