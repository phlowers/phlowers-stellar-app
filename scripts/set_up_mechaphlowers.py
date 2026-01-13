# /// script
# requires-python = ">=3.13,<3.14"
# dependencies = ["requests == 2.32.3", "pyodide-build == 0.30.6", "brotli == 1.1.0"]
# ///
"""Configure mechaphlowers for Pyodide browser environment.

This script downloads mechaphlowers and its dependencies, replacing native
extension packages with WebAssembly-compatible versions from Pyodide CDN.

Strategy:
    1. Fetch CDN package list to identify available wasm32 versions
    2. Constrain pip to use CDN versions for native packages
    3. Download all dependencies via pip with these constraints
    4. Replace pip wheels with CDN wheels when versions match
    5. Compile, deduplicate, compress, and generate config

Why constraints matter:
    Native packages (numpy, pandas, pydantic-core, etc.) downloaded by pip are
    compiled for Linux/Windows (manylinux), not WebAssembly. We MUST use CDN
    versions. By constraining pip upfront, we ensure all transitive dependencies
    are compatible with the CDN versions we'll use.

Usage:
    uv run scripts/set_up_mechaphlowers.py
    uv run scripts/set_up_mechaphlowers.py --skip-compression
    uv run scripts/set_up_mechaphlowers.py --local-wheel ./my-wheel.whl
"""
from __future__ import annotations

import argparse
import gzip
import json
import shutil
import subprocess
import tarfile
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING
import re
import sys

import brotli

import requests
from pyodide_build.cli.py_compile import main as pyodide_compile

if TYPE_CHECKING:
    from collections.abc import Iterable

# =============================================================================
# CONFIGURATION
# =============================================================================

PACKAGE_JSON_PATH = Path(__file__).parent.parent / "package.json"
PYODIDE_DIR = Path("./public/pyodide")
PACKAGES_JSON_PATH = Path("./src/app/core/services/worker_python/python-packages.json")

PYODIDE_CORE_FILES = (
    "pyodide.asm.wasm",
    "pyodide.asm.js",
    "python_stdlib.zip",
    "pyodide-lock.json",
)

# Native extension packages that MUST use CDN wasm32 versions.
# pip downloads x86_64/manylinux binaries that won't run in WebAssembly.
# We constrain ONLY these packages - pure Python deps are resolved freely by pip.
NATIVE_PACKAGES = frozenset({
    "pydantic-core",  # Rust
    "numpy", "pandas", "pyyaml", "scipy", "pillow", "lxml",  # C/C++
    "wrapt", "xxhash",  # C
})


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass(frozen=True, slots=True)
class Config:
    """Script configuration loaded from package.json."""
    
    pyodide_version: str
    mechaphlowers_version: str
    
    @property
    def cdn_url(self) -> str:
        """Pyodide CDN base URL."""
        return f"https://cdn.jsdelivr.net/pyodide/v{self.pyodide_version}/full"
    
    @classmethod
    def from_package_json(cls) -> Config:
        """Load versions from package.json dependencies and config sections."""
        try:
            data = json.loads(PACKAGE_JSON_PATH.read_text(encoding="utf-8"))
        except (FileNotFoundError, json.JSONDecodeError) as e:
            sys.exit(f"Error reading package.json: {e}")
        
        pyodide_dep = data.get("dependencies", {}).get("pyodide")
        if not pyodide_dep:
            sys.exit("Error: 'pyodide' not found in package.json dependencies")
        
        mechaphlowers = data.get("config", {}).get("mechaphlowers")
        if not mechaphlowers:
            sys.exit("Error: 'mechaphlowers' not found in package.json config")
        
        # Strip version prefix (^, ~, >=, etc.)
        pyodide_version = re.sub(r"^[\^~>=<]+", "", pyodide_dep)
        return cls(pyodide_version, mechaphlowers)


@dataclass(frozen=True, slots=True)
class CdnPackage:
    """Package metadata from Pyodide CDN."""
    
    name: str
    version: str
    filename: str


# =============================================================================
# UTILITIES
# =============================================================================

def normalize_name(name: str) -> str:
    """Normalize package name per PEP 503 (lowercase, underscores to dashes)."""
    return name.lower().replace("_", "-")


def parse_wheel(filename: str) -> tuple[str, str]:
    """Extract (normalized_name, version) from wheel filename.
    
    Args:
        filename: Wheel filename like 'package_name-1.0.0-py3-none-any.whl'
        
    Returns:
        Tuple of (normalized_name, version)
    """
    parts = filename.split("-")
    return normalize_name(parts[0]), parts[1] if len(parts) > 1 else ""


def get_wheels(directory: Path) -> list[str]:
    """List all wheel filenames in directory."""
    return [f.name for f in directory.glob("*.whl") if f.is_file()]


def log_step(step: int, title: str) -> None:
    """Print formatted step header."""
    print(f"\n{'='*60}")
    print(f"STEP {step}: {title}")
    print("=" * 60)


def cleanup_old_files(directory: Path) -> None:
    """Remove .old files created by pyodide-build."""
    for old_file in directory.glob("*.old"):
        old_file.unlink()


# =============================================================================
# CDN OPERATIONS
# =============================================================================

def fetch_cdn_packages(cdn_url: str) -> dict[str, CdnPackage]:
    """Fetch available packages from Pyodide CDN.
    
    Args:
        cdn_url: Base URL of the Pyodide CDN
        
    Returns:
        Dict mapping normalized package name to CdnPackage
        
    Raises:
        SystemExit if CDN is not accessible (native packages require CDN versions)
    """
    try:
        response = requests.get(f"{cdn_url}/pyodide-lock.json", timeout=30)
        response.raise_for_status()
        packages = response.json().get("packages", {})
        
        return {
            normalize_name(p["name"]): CdnPackage(
                name=normalize_name(p["name"]),
                version=p["version"],
                filename=p["file_name"],
            )
            for p in packages.values()
            if p.get("name") and p.get("version") and p.get("file_name")
        }
    except requests.RequestException as e:
        sys.exit(
            f"\n❌ ERROR: Cannot fetch Pyodide CDN packages!\n\n"
            f"  URL: {cdn_url}/pyodide-lock.json\n"
            f"  Error: {e}\n\n"
            f"  Native packages (numpy, pandas, pydantic-core, etc.) MUST use\n"
            f"  WebAssembly versions from the Pyodide CDN. The versions from pip\n"
            f"  are compiled for Linux/Windows and will NOT work in the browser.\n\n"
            f"  Please check your internet connection and try again.\n"
        )


def build_native_constraints(cdn_packages: dict[str, CdnPackage]) -> dict[str, str]:
    """Build pip version constraints for native packages only.
    
    Native packages must use CDN versions because pip downloads platform-specific
    binaries (manylinux) incompatible with WebAssembly.
    
    Pure Python packages (like pydantic) are NOT constrained - pip resolves them
    freely to ensure compatibility with all dependencies (e.g., pandera).
    
    Args:
        cdn_packages: Available packages on CDN
        
    Returns:
        Dict mapping native package name to required CDN version
    """
    constraints: dict[str, str] = {}
    
    # Pin ONLY native packages to CDN versions
    for pkg_name in NATIVE_PACKAGES:
        if pkg_name in cdn_packages:
            constraints[pkg_name] = cdn_packages[pkg_name].version
    
    return constraints


def download_cdn_wheels(
    packages: Iterable[CdnPackage],
    cdn_url: str,
    target_dir: Path,
) -> set[str]:
    """Download wheels from Pyodide CDN.
    
    Args:
        packages: CDN packages to download
        cdn_url: Base URL of the Pyodide CDN
        target_dir: Directory to save wheels
        
    Returns:
        Set of successfully downloaded wheel filenames
    """
    downloaded: set[str] = set()
    
    for pkg in packages:
        try:
            response = requests.get(f"{cdn_url}/{pkg.filename}", timeout=60)
            response.raise_for_status()
            
            target_path = target_dir / pkg.filename
            target_path.write_bytes(response.content)
            downloaded.add(pkg.filename)
            
            size_mb = target_path.stat().st_size / (1024 * 1024)
            print(f"    ✓ {pkg.filename} ({size_mb:.2f} MB)")
        except requests.RequestException as e:
            print(f"    ✗ {pkg.filename}: {e}")
    
    return downloaded


def check_version_compatibility(
    installed: dict[str, str],
    cdn_packages: dict[str, CdnPackage],
) -> list[str]:
    """Check for potential version compatibility issues.
    
    Warns when a pure Python package version might not be compatible
    with the constrained native package versions from CDN.
    
    Args:
        installed: Downloaded packages {name: version}
        cdn_packages: Available CDN packages
        
    Returns:
        List of warning messages
    """
    warnings: list[str] = []
    
    # Check pydantic vs pydantic-core compatibility
    if "pydantic" in installed and "pydantic-core" in installed:
        pydantic_ver = installed["pydantic"]
        pydantic_core_ver = installed["pydantic-core"]
        
        # pydantic 2.10.x uses pydantic-core 2.27.x
        # pydantic 2.11+ uses pydantic-core 2.28+
        if pydantic_ver.startswith("2.10") and not pydantic_core_ver.startswith("2.27"):
            warnings.append(
                f"pydantic {pydantic_ver} typically uses pydantic-core 2.27.x, "
                f"but got {pydantic_core_ver}"
            )
        elif pydantic_ver.startswith("2.11") and pydantic_core_ver.startswith("2.27"):
            warnings.append(
                f"pydantic {pydantic_ver} may need pydantic-core 2.28+, "
                f"but CDN has {pydantic_core_ver}"
            )
    
    return warnings


# =============================================================================
# PIP OPERATIONS
# =============================================================================

def download_with_pip(
    package: str,
    target_dir: Path,
    constraints: dict[str, str],
    index_url: str | None = None,
) -> dict[str, str]:
    """Download package and dependencies using pip.
    
    Args:
        package: Package specifier (e.g., "mechaphlowers==0.5.1" or path)
        target_dir: Directory to save wheels
        constraints: Version constraints {package: version}
        index_url: Optional custom PyPI index URL
        
    Returns:
        Dict mapping normalized package name to downloaded version
        
    Raises:
        SystemExit if pip fails (likely due to incompatible constraints)
    """
    # Write constraints file for native packages
    constraints_file = target_dir / "constraints.txt"
    if constraints:
        constraints_file.write_text(
            "\n".join(f"{pkg}=={ver}" for pkg, ver in constraints.items())
        )
    
    # Build pip download command
    cmd = ["uvx", "--python", ">=3.13,<3.14", "pip", "download", "-d", str(target_dir)]
    if index_url:
        cmd.extend(["--index-url", index_url])
    if constraints:
        cmd.extend(["-c", str(constraints_file)])
    cmd.append(package)
    
    # Execute
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    constraints_file.unlink(missing_ok=True)
    
    if result.returncode != 0:
        print("\n⚠ pip download failed!")
        print("  This usually means a dependency requires a newer version of a")
        print("  native package than what's available on Pyodide CDN.")
        print("\n  Constraints applied:")
        for pkg, ver in sorted(constraints.items()):
            print(f"    {pkg}=={ver}")
        print(f"\n  Error:\n{result.stderr}")
        sys.exit(1)
    
    # Parse downloaded wheels
    installed: dict[str, str] = {}
    for wheel in sorted(get_wheels(target_dir)):
        name, version = parse_wheel(wheel)
        installed[name] = version
        print(f"    {name} ({version})")
    
    return installed


# =============================================================================
# PYODIDE RUNTIME
# =============================================================================

def download_pyodide_runtime(npm_registry: str, version: str, target_dir: Path) -> None:
    """Download and extract Pyodide runtime from NPM registry.
    
    Args:
        npm_registry: NPM registry base URL
        version: Pyodide version to download
        target_dir: Directory to extract runtime to
    """
    url = f"{npm_registry}/pyodide/-/pyodide-{version}.tgz"
    
    with tempfile.TemporaryDirectory() as temp_dir:
        tgz_path = Path(temp_dir) / "pyodide.tgz"
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        tgz_path.write_bytes(response.content)
        
        with tarfile.open(tgz_path, "r:gz") as tar:
            tar.extractall(path=target_dir, filter="data")
    
    # Move core files from package/ subdirectory to target
    package_dir = target_dir / "package"
    if package_dir.exists():
        for filename in PYODIDE_CORE_FILES:
            src = package_dir / filename
            if src.exists():
                shutil.move(str(src), str(target_dir / filename))
        shutil.rmtree(package_dir)
    
    print(f"✓ Downloaded Pyodide runtime v{version}")


# =============================================================================
# WHEEL PROCESSING
# =============================================================================

def deduplicate_wheels(directory: Path, cdn_wheels: set[str]) -> int:
    """Remove duplicate wheels, keeping best version for Pyodide.
    
    Priority order:
        1. CDN pyodide-compiled (wasm32) - best performance
        2. cp313 compiled - good performance
        3. CDN generic (py3-none-any) - pure Python from CDN
        4. pip generic - fallback
    
    Args:
        directory: Directory containing wheels
        cdn_wheels: Set of wheel filenames from CDN
        
    Returns:
        Number of duplicates removed
    """
    # Group wheels by package name
    packages: dict[str, list[str]] = {}
    for wheel in get_wheels(directory):
        name, _ = parse_wheel(wheel)
        packages.setdefault(name, []).append(wheel)
    
    removed = 0
    for wheels in packages.values():
        if len(wheels) <= 1:
            continue
        
        # Select best wheel by priority
        cdn_wasm = [w for w in wheels if w in cdn_wheels and "pyodide" in w.lower()]
        cp313 = [w for w in wheels if "-cp313-" in w and w not in cdn_wheels]
        cdn_generic = [w for w in wheels if w in cdn_wheels]
        
        keep = (cdn_wasm or cp313 or cdn_generic or wheels)[0]
        
        for wheel in wheels:
            if wheel != keep:
                (directory / wheel).unlink()
                print(f"    Removed: {wheel} (kept {keep})")
                removed += 1
    
    return removed


def compile_wheels(directory: Path) -> None:
    """Compile wheels to .pyc bytecode for faster loading.
    
    Protects Pyodide core files during compilation, then restores them.
    
    Args:
        directory: Directory containing wheels
    """
    # Move core files to temp location
    temp_dir = directory / ".core_temp"
    temp_dir.mkdir(exist_ok=True)
    
    for filename in PYODIDE_CORE_FILES:
        src = directory / filename
        if src.exists():
            shutil.move(str(src), str(temp_dir / filename))
    
    # Compile with pyodide-build
    pyodide_compile(directory, False, True, 6, "")
    
    # Restore core files
    for filename in PYODIDE_CORE_FILES:
        src = temp_dir / filename
        if src.exists():
            shutil.move(str(src), str(directory / filename))
    temp_dir.rmdir()
    
    cleanup_old_files(directory)


def compress_wheels(
    directory: Path,
    cdn_wheels: set[str],
    min_size_mb: float = 1.0,
) -> float:
    """Compress large non-CDN wheels with Brotli and Gzip.
    
    CDN wheels are already optimized, so only pip wheels are compressed.
    
    Args:
        directory: Directory containing wheels
        cdn_wheels: Set of CDN wheel filenames to skip
        min_size_mb: Minimum file size threshold for compression
        
    Returns:
        Total MB saved by compression
    """
    min_bytes = min_size_mb * 1024 * 1024
    to_compress = [
        f for f in directory.glob("*.whl")
        if f.name not in cdn_wheels and f.stat().st_size >= min_bytes
    ]
    
    if not to_compress:
        return 0.0
    
    total_saved = 0.0
    for wheel_path in sorted(to_compress):
        original_data = wheel_path.read_bytes()
        original_mb = len(original_data) / (1024 * 1024)
        
        # Compress with brotli (best compression, quality 11)
        br_path = wheel_path.with_suffix(wheel_path.suffix + ".br")
        br_data = brotli.compress(original_data, quality=11)
        br_path.write_bytes(br_data)
        
        # Compress with gzip (fallback, level 9)
        gz_path = wheel_path.with_suffix(wheel_path.suffix + ".gz")
        with gzip.open(gz_path, "wb", compresslevel=9) as f:
            f.write(original_data)
        
        compressed_mb = len(br_data) / (1024 * 1024)
        saved = original_mb - compressed_mb
        total_saved += saved
        print(f"    {wheel_path.name}: {original_mb:.2f} → {compressed_mb:.2f} MB")
    
    return total_saved


def generate_packages_json(directory: Path, output_path: Path) -> int:
    """Generate python-packages.json for worker integration.
    
    Args:
        directory: Directory containing wheels
        output_path: Path for output JSON file
        
    Returns:
        Number of packages in generated config
    """
    wheels = get_wheels(directory)
    
    packages = {
        normalize_name(w.split("-")[0]): {
            "file_name": w,
            "name": w.split("-")[0],
            "source": "local",
        }
        for w in wheels
    }
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(packages, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    
    return len(packages)


# =============================================================================
# MAIN
# =============================================================================

def main() -> None:
    """Entry point: set up mechaphlowers with Pyodide dependencies."""
    parser = argparse.ArgumentParser(
        description="Set up mechaphlowers with Pyodide dependencies",
    )
    parser.add_argument("--uv-index", help="Custom PyPI index URL")
    parser.add_argument(
        "--npm-registry-url",
        default="https://registry.npmjs.org/",
        help="NPM registry URL (default: npmjs.org)",
    )
    parser.add_argument(
        "--skip-compression",
        action="store_true",
        help="Skip Brotli/Gzip compression step",
    )
    parser.add_argument(
        "--local-wheel",
        help="Path to local mechaphlowers wheel for testing",
    )
    args = parser.parse_args()
    
    # Validate local wheel if provided
    if args.local_wheel:
        wheel_path = Path(args.local_wheel)
        if not wheel_path.exists() or wheel_path.suffix != ".whl":
            sys.exit(f"Error: Invalid wheel file: {args.local_wheel}")
    
    # Load configuration from package.json
    config = Config.from_package_json()
    
    print(f"\n{'='*60}")
    print("CONFIGURATION")
    print("=" * 60)
    print(f"  Pyodide:       {config.pyodide_version}")
    print(f"  Mechaphlowers: {config.mechaphlowers_version}")
    print("=" * 60)
    
    # Prepare output directory
    if PYODIDE_DIR.exists():
        shutil.rmtree(PYODIDE_DIR)
    PYODIDE_DIR.mkdir(parents=True)
    PACKAGES_JSON_PATH.unlink(missing_ok=True)
    
    # Step 1: Download Pyodide runtime
    log_step(1, "PYODIDE RUNTIME")
    download_pyodide_runtime(args.npm_registry_url, config.pyodide_version, PYODIDE_DIR)
    
    # Step 2: Fetch CDN packages and build constraints
    log_step(2, "CDN PACKAGES & CONSTRAINTS")
    cdn_packages = fetch_cdn_packages(config.cdn_url)
    constraints = build_native_constraints(cdn_packages)
    
    if constraints:
        print("  Native package constraints:")
        for pkg, ver in sorted(constraints.items()):
            print(f"    {pkg}=={ver}")
    
    # Step 3: Download dependencies with pip
    log_step(3, "PIP DOWNLOAD")
    package_spec = args.local_wheel or f"mechaphlowers=={config.mechaphlowers_version}"
    print(f"  Package: {package_spec}\n")
    
    installed = download_with_pip(package_spec, PYODIDE_DIR, constraints, args.uv_index)
    print(f"\n✓ Downloaded {len(installed)} packages")
    
    # Check for compatibility issues
    compat_warnings = check_version_compatibility(installed, cdn_packages)
    if compat_warnings:
        print("\n⚠ Compatibility warnings:")
        for warning in compat_warnings:
            print(f"    {warning}")
        print("  The application may have runtime errors. Test thoroughly!")
    
    # Step 4: Download matching CDN wheels
    log_step(4, "CDN WHEEL DOWNLOAD")
    matching = [
        cdn_packages[name]
        for name, version in installed.items()
        if name in cdn_packages and cdn_packages[name].version == version
    ]
    
    print(f"  {len(matching)}/{len(installed)} packages match CDN\n")
    cdn_wheel_names = download_cdn_wheels(matching, config.cdn_url, PYODIDE_DIR)
    # Track CDN packages by normalized name (not filename, which changes after compilation)
    cdn_package_names = {parse_wheel(w)[0] for w in cdn_wheel_names}
    print(f"\n✓ Downloaded {len(cdn_wheel_names)} CDN wheels")
    
    # Step 5: Deduplicate and compile
    log_step(5, "DEDUPLICATE & COMPILE")
    removed = deduplicate_wheels(PYODIDE_DIR, cdn_wheel_names)
    if removed:
        print(f"✓ Removed {removed} duplicates")
    
    print("\n  Compiling to .pyc...")
    compile_wheels(PYODIDE_DIR)
    print("✓ Compilation complete")
    
    # Post-compilation deduplication (py3 → cp313)
    removed = deduplicate_wheels(PYODIDE_DIR, cdn_wheel_names)
    if removed:
        print(f"✓ Removed {removed} post-compilation duplicates")
    
    # Step 6: Compress (optional, skipped for local wheels)
    if args.local_wheel:
        print("\n  Skipping compression (local wheel mode)")
    elif not args.skip_compression:
        log_step(6, "COMPRESSION")
        saved = compress_wheels(PYODIDE_DIR, cdn_wheel_names)
        if saved > 0:
            print(f"\n✓ Saved {saved:.1f} MB")
    
    # Step 7: Generate config
    num_packages = generate_packages_json(PYODIDE_DIR, PACKAGES_JSON_PATH)
    
    # Summary - count by package name since filenames change after compilation
    final_wheels = get_wheels(PYODIDE_DIR)
    cdn_count = len([w for w in final_wheels if parse_wheel(w)[0] in cdn_package_names])
    
    print(f"\n{'='*60}")
    print("✓ SETUP COMPLETE")
    print("=" * 60)
    print(f"  Packages:  {num_packages}")
    print(f"  From CDN:  {cdn_count}")
    print(f"  From pip:  {num_packages - cdn_count}")
    print(f"  Config:    {PACKAGES_JSON_PATH}")
    print("=" * 60)
    
    # List all installed packages with versions
    print(f"\n{'='*60}")
    print("INSTALLED PACKAGES")
    print("=" * 60)
    for name, version in sorted(installed.items()):
        source = "CDN" if name in cdn_package_names else "pip"
        print(f"  {name:30} {version:15} ({source})")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
