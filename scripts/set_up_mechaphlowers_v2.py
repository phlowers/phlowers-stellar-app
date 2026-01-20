# /// script
# requires-python = ">=3.13,<3.14"
# dependencies = ["requests == 2.32.3", "brotli == 1.1.0"]
# ///
"""Configure mechaphlowers for Pyodide browser environment (simplified version).

This script uses uv pip compile with constraints to resolve dependencies,
then downloads and prepares them for Pyodide.

Usage:
    uv run scripts/set_up_mechaphlowers_v2.py
    uv run scripts/set_up_mechaphlowers_v2.py --skip-compression
    uv run scripts/set_up_mechaphlowers_v2.py --local-cdn-dir /path/to/cdn
    uv run scripts/set_up_mechaphlowers_v2.py --local-wheel /path/to/mechaphlowers.whl
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
PACKAGE_JSON_PATH = SCRIPTS_DIR.parent / "package.json"
PYODIDE_DIR = Path("./public/pyodide")
PACKAGES_JSON_PATH = Path("./src/app/core/services/worker_python/python-packages.json")

CONSTRAINTS_FILE = SCRIPTS_DIR / "constraints.in"
REQUIREMENTS_FILE = SCRIPTS_DIR / "requirements.in"
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
def get_config() -> tuple[str, str]:
    """Load pyodide and mechaphlowers versions from package.json."""
    data = json.loads(PACKAGE_JSON_PATH.read_text())
    pyodide_version = data["dependencies"]["pyodide"].lstrip("^~")
    mechaphlowers_version = data["config"]["mechaphlowers"]
    return pyodide_version, mechaphlowers_version


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


# =============================================================================
# STEP 1: RESOLVE DEPENDENCIES
# =============================================================================

def resolve_dependencies(local_wheel: Path | None = None) -> dict[str, str]:
    """Use uv pip compile to resolve dependencies with constraints.
    
    Args:
        local_wheel: Optional path to local mechaphlowers wheel
    
    Returns:
        Dict mapping package name to version
    """
    print("\n[1/6] Resolving dependencies with uv pip compile...")
    
    temp_req = SCRIPTS_DIR / "requirements-temp.txt"
    
    if local_wheel:
        name, version = parse_wheel(local_wheel.name)
        print(f"  Using local wheel: {local_wheel.name}")
        
        # Extract dependencies from local wheel
        wheel_deps = get_wheel_dependencies(local_wheel)
        print(f"  Wheel dependencies: {', '.join(wheel_deps) if wheel_deps else 'none'}")
        
        # Create temp requirements with:
        # 1. Other packages from requirements.in (excluding the local wheel package)
        # 2. Dependencies from the local wheel
        reqs = REQUIREMENTS_FILE.read_text().splitlines()
        filtered_reqs = [r for r in reqs if r.strip() and not r.strip().lower().startswith(name)]
        all_reqs = filtered_reqs + wheel_deps
        temp_req.write_text("\n".join(all_reqs))
        input_file = str(temp_req)
    else:
        input_file = str(REQUIREMENTS_FILE)
    
    cmd = [
        "uv", "pip", "compile",
        "--constraint", str(CONSTRAINTS_FILE),
        input_file,
        "-o", str(RESOLVED_FILE),
        "--python-version", "3.13",
    ]
    
    run_cmd(cmd)
    
    # Cleanup temp file
    if temp_req.exists():
        temp_req.unlink()
    
    # Parse resolved requirements
    resolved: dict[str, str] = {}
    for line in RESOLVED_FILE.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "==" in line:
            pkg_name, pkg_version = line.split("==")
            resolved[normalize_name(pkg_name)] = pkg_version
    
    # Add local wheel to resolved (it won't be in the compiled output)
    if local_wheel:
        name, version = parse_wheel(local_wheel.name)
        resolved[name] = version
    
    print(f"  ✓ Resolved {len(resolved)} packages")
    return resolved


# =============================================================================
# STEP 2: DOWNLOAD PYODIDE RUNTIME
# =============================================================================

def download_pyodide_runtime(version: str, npm_registry: str) -> None:
    """Download and extract Pyodide runtime from NPM."""
    print(f"\n[2/6] Downloading Pyodide runtime v{version}...")
    
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

def download_packages(local_wheel: Path | None = None) -> dict[str, str]:
    """Download resolved packages with pip.
    
    Args:
        local_wheel: Optional path to local mechaphlowers wheel (will be copied)
    
    Returns:
        Dict mapping package name to version
    """
    print("\n[3/6] Downloading packages...")
    
    cmd = [
        "uvx", "--python", ">=3.13,<3.14", "pip", "download",
        "-r", str(RESOLVED_FILE),
        "-d", str(PYODIDE_DIR),
    ]
    
    run_cmd(cmd)
    
    # If using local wheel, replace the downloaded mechaphlowers wheel
    if local_wheel:
        local_name, _ = parse_wheel(local_wheel.name)
        for wheel in PYODIDE_DIR.glob(f"{local_name.replace('-', '_')}*.whl"):
            wheel.unlink()
        shutil.copy(local_wheel, PYODIDE_DIR / local_wheel.name)
        print(f"  Using local wheel: {local_wheel.name}")
    
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
    """
    source = f"local ({local_cdn_dir})" if local_cdn_dir else "CDN"
    print(f"\n[4/6] Replacing with {source} wheels...")
    
    cdn_packages = fetch_cdn_lock(cdn_url, local_cdn_dir)
    cdn_wheel_names: set[str] = set()
    
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
                    src = local_cdn_dir / cdn_filename
                    if src.exists():
                        shutil.copy(src, PYODIDE_DIR / cdn_filename)
                        cdn_wheel_names.add(cdn_filename)
                        print(f"  ✓ {name} ({cdn_version})")
                    else:
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


def compile_wheels() -> None:
    """Compile wheels to .pyc bytecode using pyodide py-compile.
    
    This renames py3-none-any wheels to cp313-none-any after compilation.
    """
    print("\n[5/6] Compiling wheels...")
    
    # Protect core files
    temp_dir = PYODIDE_DIR / ".core_temp"
    temp_dir.mkdir(exist_ok=True)
    
    for filename in PYODIDE_CORE_FILES:
        if (src := PYODIDE_DIR / filename).exists():
            shutil.move(str(src), str(temp_dir / filename))
    
    # Compile using pyodide CLI via uvx (without --keep to replace py3 with cp313)
    cmd = ["uvx", "--from", "pyodide-build", "pyodide", "py-compile", "--compression-level", "6", str(PYODIDE_DIR)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ⚠ Compilation warning: {result.stderr}")
    
    # Restore core files
    for filename in PYODIDE_CORE_FILES:
        if (src := temp_dir / filename).exists():
            shutil.move(str(src), str(PYODIDE_DIR / filename))
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
    print("\n[6/6] Compressing large wheels...")
    
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


def generate_packages_json() -> int:
    """Generate python-packages.json for worker integration."""
    wheels = get_wheels(PYODIDE_DIR)
    packages = {
        normalize_name((name := w.split("-")[0])): {"file_name": w, "name": name, "source": "local"}
        for w in wheels
    }
    
    PACKAGES_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    PACKAGES_JSON_PATH.write_text(json.dumps(packages, ensure_ascii=False, indent=2, sort_keys=True))
    
    return len(packages)


# =============================================================================
# MAIN
# =============================================================================

def main() -> None:
    """Entry point."""
    parser = argparse.ArgumentParser(description="Set up mechaphlowers for Pyodide")
    parser.add_argument("--npm-registry-url", default="https://registry.npmjs.org/")
    parser.add_argument("--skip-compression", action="store_true")
    parser.add_argument(
        "--local-cdn-dir",
        type=Path,
        help="Local directory containing CDN wheels (instead of downloading from CDN)",
    )
    parser.add_argument(
        "--local-wheel",
        type=Path,
        help="Path to local mechaphlowers wheel (for testing custom builds)",
    )
    args = parser.parse_args()
    
    # Validate local CDN directory
    if args.local_cdn_dir and not (args.local_cdn_dir / "pyodide-lock.json").exists():
        print(f"Error: {args.local_cdn_dir}/pyodide-lock.json not found")
        raise SystemExit(1)
    
    # Validate local wheel
    if args.local_wheel and (not args.local_wheel.exists() or args.local_wheel.suffix != ".whl"):
        print(f"Error: {args.local_wheel} is not a valid wheel file")
        raise SystemExit(1)
    
    # Load config
    pyodide_version, mechaphlowers_version = get_config()
    cdn_url = get_cdn_url(pyodide_version)
    
    # Override mechaphlowers version display if using local wheel
    if args.local_wheel:
        _, local_version = parse_wheel(args.local_wheel.name)
        mechaphlowers_display = f"{local_version} (local)"
    else:
        mechaphlowers_display = mechaphlowers_version
    
    print("=" * 50)
    print(f"Pyodide: {pyodide_version} | Mechaphlowers: {mechaphlowers_display}")
    print("=" * 50)
    
    # Prepare output directory
    if PYODIDE_DIR.exists():
        shutil.rmtree(PYODIDE_DIR)
    PYODIDE_DIR.mkdir(parents=True)
    PACKAGES_JSON_PATH.unlink(missing_ok=True)
    
    # Execute steps
    resolved = resolve_dependencies(args.local_wheel)
    download_pyodide_runtime(pyodide_version, args.npm_registry_url)
    downloaded = download_packages(args.local_wheel)
    cdn_wheels = replace_with_cdn_wheels(downloaded, cdn_url, args.local_cdn_dir)
    
    # Track CDN package names for deduplication and summary
    cdn_package_names = {parse_wheel(w)[0] for w in cdn_wheels}
    
    deduplicate_wheels(cdn_package_names)
    compile_wheels()
    deduplicate_wheels(cdn_package_names)  # Post-compilation cleanup
    
    if not args.skip_compression:
        compress_wheels(cdn_package_names)
    
    num_packages = generate_packages_json()
    
    # Summary with package details
    print("\n" + "=" * 50)
    print("INSTALLED PACKAGES")
    print("=" * 50)
    
    final_wheels = sorted(get_wheels(PYODIDE_DIR))
    cdn_count = 0
    pypi_count = 0
    
    for wheel in final_wheels:
        name, version = parse_wheel(wheel)
        if name in cdn_package_names:
            source = "CDN"
            cdn_count += 1
        else:
            source = "PyPI"
            pypi_count += 1
        print(f"  {name:30} {version:15} [{source}]")
    
    print("=" * 50)
    print(f"✓ Setup complete: {num_packages} packages ({cdn_count} CDN, {pypi_count} PyPI)")
    print(f"  Config: {PACKAGES_JSON_PATH}")
    print("=" * 50)


if __name__ == "__main__":
    main()
