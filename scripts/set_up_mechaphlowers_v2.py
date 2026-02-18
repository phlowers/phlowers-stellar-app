# /// script
# requires-python = ">=3.13,<3.14"
# dependencies = ["requests == 2.32.3", "brotli == 1.1.0"]
# ///
"""Configure Python packages for Pyodide browser environment.

This script builds stellar-engine, resolves dependencies using uv pip compile,
then downloads and prepares all wheels for Pyodide.

Package versions are managed in package.json under the "config" section:
- mechaphlowers: version of the main computation library
- thermohl: version of the thermal library

Usage:
    uv run scripts/set_up_mechaphlowers_v2.py
    uv run scripts/set_up_mechaphlowers_v2.py --skip-compression
    uv run scripts/set_up_mechaphlowers_v2.py --zip-cdn
    uv run scripts/set_up_mechaphlowers_v2.py --local-cdn-dir /path/to/cdn
    uv run scripts/set_up_mechaphlowers_v2.py --local-mechaphlowers /path/to/mechaphlowers.whl
"""
from __future__ import annotations

import argparse
import gzip
import json
import re
import shutil
import subprocess
import tarfile
import tempfile
import zipfile
from functools import cache
from pathlib import Path

import brotli
import requests

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPTS_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPTS_DIR.parent
PACKAGE_JSON_PATH = PROJECT_ROOT / "package.json"
PYODIDE_DIR = Path("./public/pyodide")
PACKAGES_JSON_PATH = Path("./src/app/core/services/worker_python/python-packages.json")

STELLAR_ENGINE_DIR = PROJECT_ROOT / "stellar-engine"
CONSTRAINTS_FILE = SCRIPTS_DIR / "constraints.in"
RESOLVED_FILE = SCRIPTS_DIR / "requirements-resolved.txt"

PYODIDE_CORE_FILES = (
    "pyodide.asm.wasm",
    "pyodide.asm.js",
    "python_stdlib.zip",
    "pyodide-lock.json",
)


# =============================================================================
# UTILITIES
# =============================================================================

def normalize_name(name: str) -> str:
    """Normalize package name per PEP 503."""
    return name.lower().replace("_", "-")


def parse_wheel(filename: str) -> tuple[str, str]:
    """Extract (normalized_name, version) from wheel filename."""
    parts = filename.split("-")
    return normalize_name(parts[0]), parts[1] if len(parts) > 1 else ""


def get_wheels(directory: Path) -> list[str]:
    """List all wheel filenames in directory."""
    return [f.name for f in directory.glob("*.whl") if f.is_file()]


def run_cmd(cmd: list[str], error_msg: str = "Command failed") -> subprocess.CompletedProcess:
    """Run a subprocess command and exit on failure."""
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        raise SystemExit(1)
    return result


@cache
def get_config() -> dict:
    """Load configuration from package.json.
    
    Returns:
        Dict with keys: pyodide_version, mechaphlowers_version, thermohl_version
    """
    data = json.loads(PACKAGE_JSON_PATH.read_text())
    return {
        "pyodide_version": data["dependencies"]["pyodide"].lstrip("^~"),
        "mechaphlowers_version": data["config"]["mechaphlowers"],
        "thermohl_version": data["config"]["thermohl"],
    }


def get_cdn_url(pyodide_version: str) -> str:
    """Build Pyodide CDN URL."""
    return f"https://cdn.jsdelivr.net/pyodide/v{pyodide_version}/full"


def get_wheel_dependencies(wheel_path: Path) -> list[str]:
    """Extract dependencies from a wheel's METADATA file.
    
    Args:
        wheel_path: Path to the wheel file
        
    Returns:
        List of dependency specifiers (e.g., ["numpy>=1.20", "pandas"])
    """
    dependencies = []
    with zipfile.ZipFile(wheel_path, "r") as zf:
        # Find METADATA file in the wheel
        metadata_files = [n for n in zf.namelist() if n.endswith("/METADATA")]
        if not metadata_files:
            return dependencies
        
        metadata = zf.read(metadata_files[0]).decode("utf-8")
        
        # Parse Requires-Dist lines
        for line in metadata.splitlines():
            if line.startswith("Requires-Dist:"):
                dep = line[len("Requires-Dist:"):].strip()
                # Skip optional dependencies (those with markers like ; extra == "dev")
                if "; extra ==" not in dep and "; extra==" not in dep:
                    # Remove environment markers for simplicity (keep just package spec)
                    dep = re.split(r"\s*;\s*", dep)[0].strip()
                    if dep:
                        dependencies.append(dep)
    
    return dependencies


def build_stellar_engine() -> Path:
    """Build stellar-engine wheel using uv build.
    
    Returns:
        Path to the built wheel file
        
    Raises:
        SystemExit: If build fails or no wheel is produced
    """
    print("\n[1/8] Building stellar-engine...")
    
    if not STELLAR_ENGINE_DIR.exists():
        print(f"  ✗ Error: stellar-engine directory not found at {STELLAR_ENGINE_DIR}")
        raise SystemExit(1)
    
    dist_dir = STELLAR_ENGINE_DIR / "dist"
    
    # Clean previous builds
    if dist_dir.exists():
        shutil.rmtree(dist_dir)
    
    # Build using uv
    cmd = ["uv", "build", "--directory", str(STELLAR_ENGINE_DIR)]
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=STELLAR_ENGINE_DIR)
    
    if result.returncode != 0:
        print(f"  ✗ Build failed: {result.stderr}")
        raise SystemExit(1)
    
    # Find the built wheel
    wheels = list(dist_dir.glob("*.whl"))
    if not wheels:
        print("  ✗ No wheel produced by build")
        raise SystemExit(1)
    
    wheel_path = wheels[0]
    name, version = parse_wheel(wheel_path.name)
    print(f"  ✓ Built {name} v{version}")
    
    return wheel_path


# =============================================================================
# STEP 1: RESOLVE DEPENDENCIES
# =============================================================================

def resolve_dependencies(
    stellar_engine_wheel: Path,
    local_mechaphlowers_wheel: Path | None = None,
) -> dict[str, str]:
    """Resolve all dependencies using uv pip compile with constraints.
    
    Requirements are generated from:
    - package.json config (mechaphlowers, thermohl versions)
    - stellar-engine wheel dependencies
    
    Args:
        stellar_engine_wheel: Path to the built stellar-engine wheel
        local_mechaphlowers_wheel: Optional path to local mechaphlowers wheel
    
    Returns:
        Dict mapping package name to version
    """
    print("\n[2/8] Resolving dependencies with uv pip compile...")
    
    config = get_config()
    temp_req = SCRIPTS_DIR / "requirements-temp.txt"
    
    # Extract dependencies from stellar-engine
    stellar_deps = get_wheel_dependencies(stellar_engine_wheel)
    print(f"  stellar-engine dependencies: {len(stellar_deps)} packages")
    
    # Build requirements list
    requirements: list[str] = []
    
    # Add thermohl from config (mechaphlowers comes from stellar-engine deps)
    requirements.append(f"thermohl=={config['thermohl_version']}")
    
    # Handle mechaphlowers: use local wheel deps or config version
    if local_mechaphlowers_wheel:
        local_name, local_version = parse_wheel(local_mechaphlowers_wheel.name)
        print(f"  Using local mechaphlowers: {local_mechaphlowers_wheel.name}")
        
        # Extract dependencies from local mechaphlowers wheel
        local_deps = get_wheel_dependencies(local_mechaphlowers_wheel)
        print(f"  Local mechaphlowers dependencies: {', '.join(local_deps) if local_deps else 'none'}")
        
        # Add local wheel dependencies
        requirements.extend(local_deps)
        
        # Add stellar-engine deps but exclude mechaphlowers (we use local)
        for dep in stellar_deps:
            dep_name = normalize_name(dep.split("[")[0].split(">=")[0].split("==")[0].split("<")[0].strip())
            if dep_name != "mechaphlowers":
                requirements.append(dep)
    else:
        # Add all stellar-engine dependencies (includes mechaphlowers with pinned version)
        requirements.extend(stellar_deps)
    
    # Write temporary requirements file
    temp_req.write_text("\n".join(requirements))
    
    cmd = [
        "uv", "pip", "compile",
        "--constraint", str(CONSTRAINTS_FILE),
        str(temp_req),
        "-o", str(RESOLVED_FILE),
        "--python-version", "3.13",
        "--prerelease=explicit",
    ]
    
    run_cmd(cmd)
    
    # Cleanup temp file
    temp_req.unlink(missing_ok=True)
    
    # Parse resolved requirements
    resolved: dict[str, str] = {}
    for line in RESOLVED_FILE.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "==" in line:
            pkg_name, pkg_version = line.split("==")
            resolved[normalize_name(pkg_name)] = pkg_version
    
    # Add local wheels to resolved (they won't be in the compiled output)
    stellar_name, stellar_version = parse_wheel(stellar_engine_wheel.name)
    resolved[stellar_name] = stellar_version
    
    if local_mechaphlowers_wheel:
        mecha_name, mecha_version = parse_wheel(local_mechaphlowers_wheel.name)
        resolved[mecha_name] = mecha_version
    
    print(f"  ✓ Resolved {len(resolved)} packages")
    return resolved


# =============================================================================
# STEP 2: DOWNLOAD PYODIDE RUNTIME
# =============================================================================

def download_pyodide_runtime(version: str, npm_registry: str) -> None:
    """Download and extract Pyodide runtime from NPM."""
    print(f"\n[3/8] Downloading Pyodide runtime v{version}...")
    
    url = f"{npm_registry}/pyodide/-/pyodide-{version}.tgz"
    
    with tempfile.TemporaryDirectory() as temp_dir:
        tgz_path = Path(temp_dir) / "pyodide.tgz"
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        tgz_path.write_bytes(response.content)
        
        with tarfile.open(tgz_path, "r:gz") as tar:
            tar.extractall(path=PYODIDE_DIR, filter="data")
    
    # Move core files from package/ subdirectory
    package_dir = PYODIDE_DIR / "package"
    if package_dir.exists():
        for filename in PYODIDE_CORE_FILES:
            src = package_dir / filename
            if src.exists():
                shutil.move(str(src), str(PYODIDE_DIR / filename))
        shutil.rmtree(package_dir)
    
    print("  ✓ Done")


# =============================================================================
# STEP 3: DOWNLOAD PACKAGES
# =============================================================================

def download_packages(
    stellar_engine_wheel: Path,
    local_mechaphlowers_wheel: Path | None = None,
) -> dict[str, str]:
    """Download resolved packages and copy local wheels.
    
    Args:
        stellar_engine_wheel: Path to the built stellar-engine wheel
        local_mechaphlowers_wheel: Optional path to local mechaphlowers wheel
    
    Returns:
        Dict mapping package name to version
    """
    print("\n[4/8] Downloading packages...")
    
    cmd = [
        "uvx", "--python", ">=3.13,<3.14", "pip", "download",
        "-r", str(RESOLVED_FILE),
        "-d", str(PYODIDE_DIR),
    ]
    
    run_cmd(cmd)
    
    # Copy stellar-engine wheel
    shutil.copy(stellar_engine_wheel, PYODIDE_DIR / stellar_engine_wheel.name)
    print(f"  Added stellar-engine: {stellar_engine_wheel.name}")
    
    # If using local mechaphlowers wheel, replace the downloaded one
    if local_mechaphlowers_wheel:
        local_name, _ = parse_wheel(local_mechaphlowers_wheel.name)
        for wheel in PYODIDE_DIR.glob(f"{local_name.replace('-', '_')}*.whl"):
            wheel.unlink()
        shutil.copy(local_mechaphlowers_wheel, PYODIDE_DIR / local_mechaphlowers_wheel.name)
        print(f"  Using local mechaphlowers: {local_mechaphlowers_wheel.name}")
    
    # Parse downloaded wheels
    downloaded: dict[str, str] = {}
    for wheel in get_wheels(PYODIDE_DIR):
        name, version = parse_wheel(wheel)
        downloaded[name] = version
    
    print(f"  ✓ Downloaded {len(downloaded)} packages")
    return downloaded


# =============================================================================
# STEP 4: REPLACE WITH CDN WHEELS
# =============================================================================

def fetch_cdn_lock(cdn_url: str, local_cdn_dir: Path | None = None) -> dict[str, dict]:
    """Fetch pyodide-lock.json from CDN or local directory."""
    if local_cdn_dir:
        lock_file = local_cdn_dir / "pyodide-lock.json"
        return json.loads(lock_file.read_text()).get("packages", {})
    
    response = requests.get(f"{cdn_url}/pyodide-lock.json", timeout=30)
    response.raise_for_status()
    return response.json().get("packages", {})


def find_wheel_in_dir(directory: Path, filename: str) -> Path | None:
    """Find a wheel file in directory, trying compiled variants.
    
    pyodide py-compile renames wheels from py3-none-any to cp313-none-any.
    This function tries the exact filename first, then tries variants.
    
    Args:
        directory: Directory to search in
        filename: Original filename from pyodide-lock.json
        
    Returns:
        Path to found wheel file, or None if not found
    """
    # Try exact filename first
    exact = directory / filename
    if exact.exists():
        return exact
    
    # Try compiled variants (py3 -> cp313, py2.py3 -> cp313)
    variants = [
        filename.replace("-py3-none-any.whl", "-cp313-none-any.whl"),
        filename.replace("-py2.py3-none-any.whl", "-cp313-none-any.whl"),
    ]
    
    for variant in variants:
        if variant != filename:
            path = directory / variant
            if path.exists():
                return path
    
    return None


def replace_with_cdn_wheels(
    downloaded: dict[str, str],
    cdn_url: str,
    local_cdn_dir: Path | None = None,
) -> set[str]:
    """Replace pip wheels with CDN wheels when versions match.
    
    Args:
        downloaded: Dict of downloaded packages {name: version}
        cdn_url: CDN URL for remote downloads
        local_cdn_dir: Optional local directory containing CDN wheels
    
    Returns:
        Set of CDN wheel filenames copied/downloaded
        
    Raises:
        SystemExit: If local_cdn_dir is specified and required wheels are missing
    """
    source = f"local CDN ({local_cdn_dir})" if local_cdn_dir else "CDN"
    print(f"\n[5/8] Replacing with {source} wheels...")
    
    cdn_packages = fetch_cdn_lock(cdn_url, local_cdn_dir)
    cdn_wheel_names: set[str] = set()
    missing_wheels: list[tuple[str, str]] = []  # List of (name, filename) for missing wheels
    
    for pkg_data in cdn_packages.values():
        name = normalize_name(pkg_data.get("name", ""))
        cdn_version = pkg_data.get("version", "")
        cdn_filename = pkg_data.get("file_name", "")
        
        # Check if we have this package and versions match
        if name in downloaded and downloaded[name] == cdn_version:
            # Remove pip wheel(s) - use normalized pattern
            pattern = name.replace("-", "_")
            for wheel in PYODIDE_DIR.glob(f"{pattern}*.whl"):
                wheel.unlink()
            
            # Copy from local or download from CDN
            try:
                if local_cdn_dir:
                    # Try to find wheel with exact name or compiled variant
                    src = find_wheel_in_dir(local_cdn_dir, cdn_filename)
                    if src:
                        shutil.copy(src, PYODIDE_DIR / src.name)
                        cdn_wheel_names.add(src.name)
                        print(f"  ✓ {name} ({cdn_version})")
                    else:
                        missing_wheels.append((name, cdn_filename))
                        print(f"  ✗ {name}: {cdn_filename} not found in local CDN")
                else:
                    response = requests.get(f"{cdn_url}/{cdn_filename}", timeout=60)
                    response.raise_for_status()
                    (PYODIDE_DIR / cdn_filename).write_bytes(response.content)
                    cdn_wheel_names.add(cdn_filename)
                    print(f"  ✓ {name} ({cdn_version})")
            except (requests.RequestException, OSError) as e:
                print(f"  ✗ {name}: {e}")
    
    print(f"  ✓ Replaced {len(cdn_wheel_names)} packages with {source} versions")
    
    # In local CDN mode, missing wheels are a fatal error
    if local_cdn_dir and missing_wheels:
        print(f"\n  ✗ ERROR: {len(missing_wheels)} required wheel(s) missing from local CDN:")
        for name, filename in missing_wheels:
            print(f"    - {name}: {filename}")
        print("\n  The application will not work correctly with missing dependencies.")
        print("  Please ensure all required wheels are present in the local CDN directory.")
        raise SystemExit(1)
    
    return cdn_wheel_names


# =============================================================================
# STEP 5: COMPILE & DEDUPLICATE
# =============================================================================

def deduplicate_wheels(cdn_package_names: set[str]) -> int:
    """Remove duplicate wheels, keeping best version.
    
    Args:
        cdn_package_names: Set of normalized package names from CDN (not filenames)
    """
    packages: dict[str, list[str]] = {}
    for wheel in get_wheels(PYODIDE_DIR):
        name, _ = parse_wheel(wheel)
        packages.setdefault(name, []).append(wheel)
    
    removed = 0
    for pkg_name, wheels in packages.items():
        if len(wheels) <= 1:
            continue
        
        # Priority: CDN pkgs prefer pyodide wasm; PyPI pkgs prefer cp313
        pyodide_wasm = next((w for w in wheels if "pyodide" in w.lower()), None)
        cp313 = next((w for w in wheels if "-cp313-" in w), None)
        
        if pkg_name in cdn_package_names:
            keep = pyodide_wasm or cp313 or wheels[0]
        else:
            keep = cp313 or pyodide_wasm or wheels[0]
        
        for wheel in wheels:
            if wheel != keep:
                (PYODIDE_DIR / wheel).unlink()
                removed += 1
    
    return removed


def compile_wheels(cdn_package_names: set[str]) -> None:
    """Compile wheels to .pyc bytecode using pyodide py-compile.
    
    CDN wheels are already pre-compiled for Pyodide and are excluded.
    This renames py3-none-any wheels to cp313-none-any after compilation.
    
    Args:
        cdn_package_names: Set of normalized package names from CDN (to exclude)
    """
    print("\n[6/8] Compiling wheels...")
    
    # Protect core files and CDN wheels (already compiled for Pyodide)
    temp_dir = PYODIDE_DIR / ".protected_temp"
    temp_dir.mkdir(exist_ok=True)
    
    for filename in PYODIDE_CORE_FILES:
        if (src := PYODIDE_DIR / filename).exists():
            shutil.move(str(src), str(temp_dir / filename))
    
    # Move CDN wheels to temp dir (they are already compiled for Pyodide)
    cdn_wheels_moved: list[str] = []
    for wheel_path in PYODIDE_DIR.glob("*.whl"):
        name, _ = parse_wheel(wheel_path.name)
        if name in cdn_package_names:
            shutil.move(str(wheel_path), str(temp_dir / wheel_path.name))
            cdn_wheels_moved.append(wheel_path.name)
    
    if cdn_wheels_moved:
        print(f"  Skipping {len(cdn_wheels_moved)} CDN wheels (already compiled)")
    
    # Compile using pyodide CLI via uvx (without --keep to replace py3 with cp313)
    cmd = ["uvx", "--from", "pyodide-build", "pyodide", "py-compile", "--compression-level", "6", str(PYODIDE_DIR)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ⚠ Compilation warning: {result.stderr}")
    
    # Restore core files
    for filename in PYODIDE_CORE_FILES:
        if (src := temp_dir / filename).exists():
            shutil.move(str(src), str(PYODIDE_DIR / filename))
    
    # Restore CDN wheels
    for wheel_name in cdn_wheels_moved:
        shutil.move(str(temp_dir / wheel_name), str(PYODIDE_DIR / wheel_name))
    
    temp_dir.rmdir()
    
    # Cleanup .old files
    for old_file in PYODIDE_DIR.glob("*.old"):
        old_file.unlink()
    
    print("  ✓ Done")


# =============================================================================
# STEP 6: COMPRESS & GENERATE CONFIG
# =============================================================================

def compress_wheels(cdn_package_names: set[str], min_size_mb: float = 1.0) -> None:
    """Compress large non-CDN wheels with Brotli and Gzip."""
    print("\n[7/8] Compressing large wheels...")
    
    min_bytes = int(min_size_mb * 1024 * 1024)
    mb = 1024 * 1024
    
    for wheel_path in sorted(PYODIDE_DIR.glob("*.whl")):
        if parse_wheel(wheel_path.name)[0] in cdn_package_names or wheel_path.stat().st_size < min_bytes:
            continue
        
        data = wheel_path.read_bytes()
        br_data = brotli.compress(data, quality=11)
        
        wheel_path.with_suffix(".whl.br").write_bytes(br_data)
        with gzip.open(wheel_path.with_suffix(".whl.gz"), "wb", compresslevel=9) as f:
            f.write(data)
        
        print(f"  {wheel_path.name}: {len(data)/mb:.2f} → {len(br_data)/mb:.2f} MB")
    
    print("  ✓ Done")


def zip_cdn_wheels(cdn_package_names: set[str]) -> int:
    """Zip all CDN wheels into a single cdn.zip file.
    
    Args:
        cdn_package_names: Set of normalized package names from CDN
    
    Returns:
        Number of wheels zipped
    """
    print("\n[+] Zipping CDN dependencies into cdn.zip...")
    
    cdn_zip_path = PYODIDE_DIR / "cdn.zip"
    mb = 1024 * 1024
    zipped_count = 0
    total_original_size = 0
    
    with zipfile.ZipFile(cdn_zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for wheel_path in sorted(PYODIDE_DIR.glob("*.whl")):
            name, version = parse_wheel(wheel_path.name)
            if name in cdn_package_names:
                zf.write(wheel_path, wheel_path.name)
                total_original_size += wheel_path.stat().st_size
                zipped_count += 1
                print(f"  + {wheel_path.name}")
    
    if zipped_count > 0:
        # Remove original CDN wheel files after zipping
        for wheel_path in PYODIDE_DIR.glob("*.whl"):
            name, _ = parse_wheel(wheel_path.name)
            if name in cdn_package_names:
                wheel_path.unlink()
        
        zip_size = cdn_zip_path.stat().st_size
        print(f"  ✓ Created cdn.zip: {zipped_count} wheels ({total_original_size/mb:.2f} → {zip_size/mb:.2f} MB)")
    else:
        # Remove empty zip if no CDN wheels
        cdn_zip_path.unlink(missing_ok=True)
        print("  ✓ No CDN wheels to zip")
    
    return zipped_count


def generate_packages_json(cdn_package_names: set[str], zipped: bool = False) -> int:
    """Generate python-packages.json for worker integration.
    
    Args:
        cdn_package_names: Set of normalized package names from CDN
        zipped: Whether CDN packages are stored in cdn.zip
    
    Returns:
        Total number of packages
    """
    wheels = get_wheels(PYODIDE_DIR)
    packages: dict[str, dict] = {}
    
    # Add wheels from directory
    for w in wheels:
        name = normalize_name(w.split("-")[0])
        source = "cdn" if name in cdn_package_names else "local"
        packages[name] = {"file_name": w, "name": w.split("-")[0], "source": source}
    
    # Add CDN packages from cdn.zip if zipped mode
    if zipped:
        cdn_zip_path = PYODIDE_DIR / "cdn.zip"
        if cdn_zip_path.exists():
            with zipfile.ZipFile(cdn_zip_path, "r") as zf:
                for wheel_name in zf.namelist():
                    if wheel_name.endswith(".whl"):
                        name = normalize_name(wheel_name.split("-")[0])
                        packages[name] = {
                            "file_name": wheel_name,
                            "name": wheel_name.split("-")[0],
                            "source": "cdn",
                            "archive": "cdn.zip",
                        }
    
    PACKAGES_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    PACKAGES_JSON_PATH.write_text(json.dumps(packages, ensure_ascii=False, indent=2, sort_keys=True))
    
    return len(packages)


def verify_dependencies(resolved: dict[str, str]) -> None:
    """Verify all resolved dependencies are installed in the output directory.
    
    Args:
        resolved: Dict of resolved packages {name: version}
        
    Raises:
        SystemExit: If any required dependency is missing
    """
    print("\n[8/8] Verifying dependencies...")
    
    # Get installed packages from wheels
    installed: dict[str, str] = {}
    for wheel in get_wheels(PYODIDE_DIR):
        name, version = parse_wheel(wheel)
        installed[name] = version
    
    # Check all resolved dependencies are installed
    missing: list[tuple[str, str]] = []
    version_mismatch: list[tuple[str, str, str]] = []
    
    for pkg_name, pkg_version in resolved.items():
        if pkg_name not in installed:
            missing.append((pkg_name, pkg_version))
        elif installed[pkg_name] != pkg_version:
            version_mismatch.append((pkg_name, pkg_version, installed[pkg_name]))
    
    # Report issues
    if missing or version_mismatch:
        print(f"\n  ✗ ERROR: Dependency verification failed!")
        
        if missing:
            print(f"\n  Missing packages ({len(missing)}):")
            for name, version in sorted(missing):
                print(f"    - {name}=={version}")
        
        if version_mismatch:
            print(f"\n  Version mismatch ({len(version_mismatch)}):")
            for name, expected, actual in sorted(version_mismatch):
                print(f"    - {name}: expected {expected}, got {actual}")
        
        print("\n  The application will not work correctly with missing or incorrect dependencies.")
        raise SystemExit(1)
    
    print(f"  ✓ All {len(resolved)} dependencies verified")


# =============================================================================
# MAIN
# =============================================================================

def main() -> None:
    """Entry point."""
    parser = argparse.ArgumentParser(
        description="Set up Python packages for Pyodide (includes stellar-engine)"
    )
    parser.add_argument("--npm-registry-url", default="https://registry.npmjs.org/")
    parser.add_argument("--skip-compression", action="store_true")
    parser.add_argument(
        "--zip-cdn",
        action="store_true",
        help="Zip all CDN wheels into a single cdn.zip file",
    )
    parser.add_argument(
        "--local-cdn-dir",
        type=Path,
        help="Local directory containing CDN wheels (instead of downloading from CDN)",
    )
    parser.add_argument(
        "--local-mechaphlowers",
        type=Path,
        help="Path to local mechaphlowers wheel (for testing custom builds)",
    )
    args = parser.parse_args()
    
    # Validate local CDN directory
    if args.local_cdn_dir and not (args.local_cdn_dir / "pyodide-lock.json").exists():
        print(f"Error: {args.local_cdn_dir}/pyodide-lock.json not found")
        raise SystemExit(1)
    
    # Validate local mechaphlowers wheel
    if args.local_mechaphlowers and (
        not args.local_mechaphlowers.exists() or args.local_mechaphlowers.suffix != ".whl"
    ):
        print(f"Error: {args.local_mechaphlowers} is not a valid wheel file")
        raise SystemExit(1)
    
    # Load config
    config = get_config()
    cdn_url = get_cdn_url(config["pyodide_version"])
    
    # Override mechaphlowers version display if using local wheel
    if args.local_mechaphlowers:
        _, local_version = parse_wheel(args.local_mechaphlowers.name)
        mechaphlowers_display = f"{local_version} (local)"
    else:
        mechaphlowers_display = config["mechaphlowers_version"]
    
    print("=" * 60)
    print(f"Pyodide: {config['pyodide_version']}")
    print(f"Mechaphlowers: {mechaphlowers_display} | Thermohl: {config['thermohl_version']}")
    print("=" * 60)
    
    # Prepare output directory
    if PYODIDE_DIR.exists():
        shutil.rmtree(PYODIDE_DIR)
    PYODIDE_DIR.mkdir(parents=True)
    PACKAGES_JSON_PATH.unlink(missing_ok=True)
    
    # Execute steps
    stellar_engine_wheel = build_stellar_engine()
    resolved = resolve_dependencies(stellar_engine_wheel, args.local_mechaphlowers)
    download_pyodide_runtime(config["pyodide_version"], args.npm_registry_url)
    downloaded = download_packages(stellar_engine_wheel, args.local_mechaphlowers)
    cdn_wheels = replace_with_cdn_wheels(downloaded, cdn_url, args.local_cdn_dir)
    
    # Track CDN package names for deduplication and summary
    cdn_package_names = {parse_wheel(w)[0] for w in cdn_wheels}
    
    deduplicate_wheels(cdn_package_names)
    compile_wheels(cdn_package_names)
    deduplicate_wheels(cdn_package_names)  # Post-compilation cleanup
    
    if not args.skip_compression:
        compress_wheels(cdn_package_names)
    
    # Optionally zip CDN wheels into cdn.zip
    if args.zip_cdn:
        zip_cdn_wheels(cdn_package_names)
    
    num_packages = generate_packages_json(cdn_package_names, zipped=args.zip_cdn)
    
    # Verify all resolved dependencies are installed
    verify_dependencies(resolved)
    
    # Summary with package details
    print("\n" + "=" * 60)
    print("INSTALLED PACKAGES")
    print("=" * 60)
    
    cdn_count = 0
    pypi_count = 0
    local_count = 0
    
    # List wheels from directory
    for wheel in sorted(get_wheels(PYODIDE_DIR)):
        name, version = parse_wheel(wheel)
        if name in cdn_package_names:
            print(f"  {name:30} {version:15} [CDN]")
            cdn_count += 1
        elif name == "stellar-engine":
            print(f"  {name:30} {version:15} [LOCAL]")
            local_count += 1
        else:
            print(f"  {name:30} {version:15} [PyPI]")
            pypi_count += 1
    
    # List CDN wheels from cdn.zip if zipped mode
    if args.zip_cdn:
        cdn_zip_path = PYODIDE_DIR / "cdn.zip"
        if cdn_zip_path.exists():
            with zipfile.ZipFile(cdn_zip_path, "r") as zf:
                for wheel_name in sorted(zf.namelist()):
                    if wheel_name.endswith(".whl"):
                        name, version = parse_wheel(wheel_name)
                        print(f"  {name:30} {version:15} [CDN → cdn.zip]")
                        cdn_count += 1
    
    print("=" * 60)
    if args.zip_cdn:
        print(f"✓ Setup complete: {num_packages} packages ({cdn_count} CDN in cdn.zip, {pypi_count} PyPI, {local_count} local)")
    else:
        print(f"✓ Setup complete: {num_packages} packages ({cdn_count} CDN, {pypi_count} PyPI, {local_count} local)")
    print(f"  Config: {PACKAGES_JSON_PATH}")
    print("=" * 60)


if __name__ == "__main__":
    main()
