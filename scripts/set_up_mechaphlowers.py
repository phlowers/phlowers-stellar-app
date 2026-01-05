# /// script
# requires-python = ">=3.12,<3.13"
# dependencies = ["requests == 2.32.3", "pyodide-build == 0.30.6"]
# ///
"""Set up mechaphlowers with Pyodide dependencies and bandwidth optimization."""
import argparse
import json
import shutil
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

import requests
from pyodide_build.cli.py_compile import main as pyodide_build  # type: ignore

# Configuration
PYODIDE_VERSION = "0.28.3"
PYODIDE_CDN_URL = f"https://cdn.jsdelivr.net/pyodide/v{PYODIDE_VERSION}/full"
MECHAPHLOWERS_VERSION = "0.4.3"
PYODIDE_DIRECTORY_PATH = "./public/pyodide"
PYODIDE_PACKAGES_PATH = "./src/app/core/services/worker_python/python-packages.json"
NEEDED_PYODIDE_SOURCE_FILES = [
    "pyodide.asm.wasm",
    "pyodide.asm.js",
    "python_stdlib.zip",
    "pyodide-lock.json",
]


def normalize_package_name(name: str) -> str:
    """Normalize a Python package name for comparison.
    
    Converts to lowercase and replaces underscores with dashes.
    This handles case-insensitivity (PyYAML vs pyyaml) and
    underscore/dash variations (pydantic_core vs pydantic-core).
    
    Args:
        name: Package name to normalize
        
    Returns:
        Normalized package name
    """
    return name.lower().replace("_", "-")


def remove_duplicate_wheels_in_directory(directory: str) -> None:
    """
    Remove duplicate wheel files, keeping the optimized version.
    
    For each package (case-insensitive), keeps the better wheel version:
    - Prefer Pyodide optimized wheels (cp313-pyodide)
    - Then prefer non-py3 compiled versions (cp312)
    - Remove generic/py3 versions
    
    Args:
        directory: Path to directory containing wheel files
    """
    wheel_files = get_all_wheel_file_names_in_directory(directory)
    
    # Group files by normalized package name (case-insensitive)
    packages: dict[str, list[str]] = {}
    for wheel in wheel_files:
        pkg_name = normalize_package_name(wheel.split("-")[0])
        packages.setdefault(pkg_name, []).append(wheel)
    
    # Remove duplicates: keep the best version
    for normalized_name, wheels in packages.items():
        if len(wheels) <= 1:
            continue
        
        # Priority order for which wheel to keep:
        # 1. Pyodide optimized (cp313-pyodide_*)
        # 2. Non-py3 compiled (cp312, cp313 but not py3)
        # 3. Any other version
        
        pyodide_wheels = [w for w in wheels if "pyodide" in w]
        compiled_wheels = [w for w in wheels if "py3" not in w and "pyodide" not in w]
        other_wheels = [w for w in wheels if "py3" in w]
        
        if pyodide_wheels:
            keep_wheel = pyodide_wheels[0]  # Prefer Pyodide optimized
        elif compiled_wheels:
            keep_wheel = compiled_wheels[0]  # Prefer compiled
        else:
            keep_wheel = wheels[0]  # Fallback
        
        # Remove all other wheels
        for wheel in wheels:
            if wheel != keep_wheel:
                wheel_path = Path(directory) / wheel
                try:
                    wheel_path.unlink()
                    print(f"Removing duplicate {wheel}, keeping {keep_wheel}")
                except OSError as e:
                    print(f"Warning: could not remove {wheel}: {e}")


def recreate_directory(directory: str) -> None:
    """Remove and recreate a directory.
    
    Args:
        directory: Path to directory to recreate
    """
    dir_path = Path(directory)
    if dir_path.exists():
        shutil.rmtree(dir_path)
        print(f"Removed directory: {directory}")
    dir_path.mkdir(parents=True, exist_ok=True)
    print(f"Recreated directory: {directory}")


def get_all_wheel_file_names_in_directory(directory: str) -> list[str]:
    """Get all wheel file names in a directory.
    
    Args:
        directory: Path to directory to search
        
    Returns:
        List of wheel filenames
    """
    return [f.name for f in Path(directory).glob("*.whl") if f.is_file()]


def download_and_extract_tgz(url: str, target_dir: str) -> None:
    """Download and extract a .tgz file.
    
    Args:
        url: URL to download .tgz from
        target_dir: Directory to extract to
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        tgz_path = Path(temp_dir) / "pyodide.tgz"
        
        # Download the .tgz file
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        tgz_path.write_bytes(response.content)

        # Extract the .tgz file
        with tarfile.open(tgz_path, "r:gz") as tar:
            tar.extractall(path=target_dir, filter="data")
        print(f"Downloaded and extracted {url} to {target_dir}")


def get_mechaphlowers_dependencies() -> list[str]:
    """Extract all dependencies of mechaphlowers (direct and transitive) from metadata.
    
    Uses pip to download and resolve all dependencies to get the complete
    dependency tree. This ensures we check the CDN for ALL packages that will
    be needed, not just the direct dependencies.
    
    Returns:
        List of all dependency package names (normalized to lowercase with dashes)
    """
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            result = subprocess.run(
                [
                    sys.executable, "-m", "pip", "download",
                    f"mechaphlowers=={MECHAPHLOWERS_VERSION}",
                    "-d", temp_dir,
                ],
                capture_output=True,
                text=True,
                timeout=120,
            )
            
            if result.returncode != 0:
                print(f"Warning: Could not resolve mechaphlowers dependencies: {result.stderr[:200]}")
                return []
            
            # Extract package names from wheel filenames
            wheel_files = list(Path(temp_dir).glob("*.whl"))
            if not wheel_files:
                print("Warning: No wheel files found after downloading")
                return []
            
            # Deduplicate using a set for efficiency
            dependencies = {
                normalize_package_name(f.name.split("-")[0])
                for f in wheel_files
            }
            return list(dependencies)
            
    except Exception as e:
        print(f"Warning: Could not fetch mechaphlowers dependencies: {e}")
        return []


def get_available_packages_from_cdn(packages_to_check: list[str] | None = None) -> dict[str, str]:
    """Fetch available packages and versions from Pyodide CDN pyodide-lock.json.
    
    If packages_to_check is not provided, checks mechaphlowers dependencies.
    Otherwise, checks the provided list of package names.
    
    Args:
        packages_to_check: List of package names to check (default: mechaphlowers deps)
    
    Returns:
        Dictionary mapping package names to wheel filenames
    """
    try:
        # If no packages specified, use mechaphlowers dependencies
        if packages_to_check is None:
            packages_to_check = get_mechaphlowers_dependencies()
            packages_to_check.insert(0, "mechaphlowers")
        
        # Fetch lock file from CDN
        response = requests.get(f"{PYODIDE_CDN_URL}/pyodide-lock.json", timeout=30)
        response.raise_for_status()
        cdn_packages = response.json().get("packages", {})
        
        # Build normalized lookup for efficient O(1) searching
        lookup = {normalize_package_name(key): key for key in cdn_packages}
        
        # Find matching packages
        packages = {}
        for pkg_name in packages_to_check:
            normalized = normalize_package_name(pkg_name)
            if normalized in lookup:
                wheel_file = cdn_packages[lookup[normalized]].get("file_name")
                if wheel_file:
                    packages[pkg_name] = wheel_file
        
        return packages
    except Exception as e:
        print(f"Warning: Could not fetch pyodide-lock.json: {e}")
        return {}


def download_wheel_from_cdn(package_name: str, wheel_filename: str, target_dir: str) -> bool:
    """Download an optimized wheel from jsDelivr/Pyodide CDN.
    
    Args:
        package_name: Package name
        wheel_filename: Wheel filename
        target_dir: Directory to save the wheel
        
    Returns:
        True if download succeeded, False otherwise
    """
    try:
        wheel_url = f"{PYODIDE_CDN_URL}/{wheel_filename}"
        print(f"  Downloading {wheel_filename}")
        
        response = requests.get(wheel_url, timeout=60)
        response.raise_for_status()
        
        target_path = Path(target_dir) / wheel_filename
        target_path.write_bytes(response.content)
        
        file_size_mb = target_path.stat().st_size / (1024 * 1024)
        print(f"    ✓ {wheel_filename} ({file_size_mb:.2f} MB)")
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"    ✗ {wheel_filename}: {e}")
        return False
    except (IOError, OSError) as e:
        print(f"    ✗ Failed to save {wheel_filename}: {e}")
        return False


def download_optimized_wheels_from_cdn(target_dir: str, packages_to_check: list[str] | None = None) -> tuple[list[str], list[str]]:
    """Download optimized wheels from Pyodide CDN.
    
    Dynamically fetches available packages from pyodide-lock.json
    to support different Pyodide versions without code changes.
    Prefers CDN versions for all mechaphlowers dependencies when available.
    
    Args:
        target_dir: Directory to save wheels
        packages_to_check: List of package names to check (default: mechaphlowers deps)
        
    Returns:
        Tuple of (successfully downloaded wheel filenames, packages not found on CDN)
    """
    print(f"\n{'='*70}")
    print(f"CHECKING CDN FOR MECHAPHLOWERS DEPENDENCIES (Pyodide v{PYODIDE_VERSION})")
    print("="*70)
    
    # Get all dependencies (resolved transitively)
    all_needed_deps = packages_to_check if packages_to_check else get_mechaphlowers_dependencies()
    if "mechaphlowers" not in [normalize_package_name(d) for d in all_needed_deps]:
        all_needed_deps.insert(0, "mechaphlowers")
    
    # Check what's available on CDN
    available_packages = get_available_packages_from_cdn(all_needed_deps)
    
    if not available_packages:
        print("⚠ No packages found in CDN")
        return [], all_needed_deps
    
    # Determine coverage using sets for efficiency
    cdn_available = set(available_packages.keys())
    all_normalized = {normalize_package_name(d) for d in all_needed_deps}
    not_on_cdn = sorted(all_normalized - cdn_available)
    
    # Display coverage report
    print(f"\nCDN Coverage for mechaphlowers dependencies:")
    print(f"  Available on CDN:  {len(cdn_available)}/{len(all_normalized)}")
    for pkg in sorted(cdn_available):
        print(f"    ✓ {pkg}")
    
    if not_on_cdn:
        print(f"  Will use pip:      {len(not_on_cdn)}/{len(all_normalized)}")
        for pkg in not_on_cdn:
            print(f"    ○ {pkg}")
    
    # Download from CDN
    print(f"\n{'='*70}")
    print(f"DOWNLOADING OPTIMIZED WHEELS FROM Pyodide CDN")
    print("="*70)
    
    downloaded_wheels = []
    for package_name, wheel_filename in available_packages.items():
        success = download_wheel_from_cdn(package_name, wheel_filename, target_dir)
        if success:
            downloaded_wheels.append(wheel_filename)
    
    if downloaded_wheels:
        print(f"✓ Downloaded {len(downloaded_wheels)} wheels from CDN")
    
    return downloaded_wheels, not_on_cdn


def keep_only_needed_files(directory: str, needed_files: list[str]) -> None:
    """Keep only the specified files in the directory and move them from package subdirectory.
    
    Args:
        directory: Root directory path
        needed_files: List of filenames to keep
    """
    package_dir = Path(directory) / "package"
    if not package_dir.exists():
        print(f"Warning: package directory not found at {package_dir}")
        return

    # Move needed files from package directory to main directory
    for filename in needed_files:
        source_path = package_dir / filename
        if source_path.exists():
            dest_path = Path(directory) / filename
            shutil.move(str(source_path), str(dest_path))
            print(f"Moved {filename} to {directory}")

    # Remove the package directory and all other files
    shutil.rmtree(package_dir)
    print("Removed package directory")


def compress_wheel_brotli(wheel_path: Path) -> bool:
    """Compress wheel file with Brotli compression.
    
    Brotli provides ~70% size reduction with excellent decompression speed.
    Uses quality level 11 (max) for best compression ratio.
    Creates a .whl.br file alongside the original.
    
    Args:
        wheel_path: Path to the wheel file
        
    Returns:
        True if compression succeeded, False otherwise
    """
    try:
        # -q 11 = quality max (meilleure compression)
        # -k = keep original file
        # -f = force overwrite
        subprocess.run(
            ["brotli", "-q", "11", "-k", "-f", str(wheel_path)],
            timeout=300,  # 5 minutes pour gros fichiers
            check=False,
            capture_output=True,
        )
        br_path = wheel_path.with_suffix(wheel_path.suffix + ".br")
        return br_path.exists()
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
        return False


def compress_wheel_gzip(wheel_path: Path) -> bool:
    """Compress wheel file with Gzip compression (fallback).
    
    Gzip provides ~60% size reduction, used when Brotli unavailable.
    Uses compression level 9 (max) for best ratio.
    Creates a .whl.gz file alongside the original.
    
    Args:
        wheel_path: Path to the wheel file
        
    Returns:
        True if compression succeeded, False otherwise
    """
    try:
        # -9 = compression level max
        # -k = keep original file
        # -f = force overwrite
        subprocess.run(
            ["gzip", "-9", "-k", "-f", str(wheel_path)],
            timeout=120,  # 2 minutes
            check=False,
            capture_output=True,
        )
        gz_path = wheel_path.with_suffix(wheel_path.suffix + ".gz")
        return gz_path.exists()
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
        return False


def compress_pyodide_wheels(directory: str, verbose: bool = True, min_size_mb: float = 1.0, skip_files: list[str] | None = None) -> dict[str, dict]:
    """Compress large wheel files in directory with Brotli/Gzip.
    
    Strategy:
    1. Skip files already optimized (from CDN)
    2. Only compress files larger than min_size_mb (default 1 MB)
    3. Try Brotli compression first (best ratio)
    4. Fall back to Gzip if Brotli fails
    5. Keep original .whl files for compatibility
    
    Apache will serve .whl.br or .whl.gz automatically based on
    Accept-Encoding header via mod_rewrite rules.
    
    Args:
        directory: Directory containing wheel files
        verbose: Print compression statistics
        min_size_mb: Minimum file size in MB to compress (default: 1.0)
        skip_files: List of filenames to skip compression (e.g., CDN-downloaded wheels)
        
    Returns:
        Dictionary mapping package names to compression stats
    """
    skip_files = skip_files or []
    wheel_files = list(Path(directory).glob("*.whl"))
    
    # Filter: skip CDN files, then filter by size
    wheels_to_compress = [f for f in wheel_files if f.name not in skip_files]
    skipped_cdn_count = len(wheel_files) - len(wheels_to_compress)
    
    min_size_bytes = min_size_mb * 1024 * 1024
    large_files = [f for f in wheels_to_compress if f.stat().st_size >= min_size_bytes]
    skipped_small_count = len(wheels_to_compress) - len(large_files)
    
    if verbose:
        print(f"\n{'='*70}")
        print(f"Compressing {len(large_files)} large files (>= {min_size_mb} MB)")
        if skipped_cdn_count > 0:
            print(f"Skipping {skipped_cdn_count} CDN-optimized files (already compressed)")
        if skipped_small_count > 0:
            print(f"Skipping {skipped_small_count} small files (< {min_size_mb} MB)")
        print(f"{'='*70}\n")
    
    total_original_mb = 0.0
    total_compressed_mb = 0.0
    compression_stats = {}
    
    for wheel_path in sorted(large_files):
        parts = wheel_path.stem.split("-")
        name = parts[0]
        version = parts[1] if len(parts) > 1 else "unknown"
        original_size = wheel_path.stat().st_size
        original_mb = original_size / (1024 * 1024)
        
        # Compress with both Brotli AND Gzip for proper fallback
        brotli_success = compress_wheel_brotli(wheel_path)
        gzip_success = compress_wheel_gzip(wheel_path)
        
        # Use best compression for stats
        if brotli_success:
            compressed_size = wheel_path.with_suffix(wheel_path.suffix + ".br").stat().st_size
            compression_type = "brotli + gzip"
        elif gzip_success:
            compressed_size = wheel_path.with_suffix(wheel_path.suffix + ".gz").stat().st_size
            compression_type = "gzip"
        else:
            compressed_size = original_size
            compression_type = "none"
        
        compressed_mb = compressed_size / (1024 * 1024)
        ratio_percent = ((original_size - compressed_size) / original_size) * 100
        
        total_original_mb += original_mb
        total_compressed_mb += compressed_mb
        
        # Store stats
        compression_stats[normalize_package_name(name)] = {
            "name": name,
            "version": version,
            "file_name": wheel_path.name,
            "original_mb": round(original_mb, 2),
            "compressed_mb": round(compressed_mb, 2),
            "ratio_percent": round(ratio_percent, 1),
            "compression": compression_type,
        }
        
        if verbose:
            print(f"{name:30} {original_mb:8.2f} MB → {compressed_mb:8.2f} MB "
                  f"({ratio_percent:6.1f}%) [{compression_type}]")
    
    if verbose:
        saved_mb = total_original_mb - total_compressed_mb
        ratio = (saved_mb / total_original_mb * 100) if total_original_mb > 0 else 0
        print(f"\n{'='*70}")
        print(f"Total: {total_original_mb:.2f} MB → {total_compressed_mb:.2f} MB")
        print(f"Savings: {saved_mb:.2f} MB ({ratio:.1f}%)")
        print(f"{'='*70}\n")
    
    return compression_stats


def main() -> None:
    """
    Set up mechaphlowers with Pyodide and optimize with compression.
    
    Complete workflow:
    1. Download Pyodide runtime from NPM registry
    2. Extract and keep only essential Pyodide files
    3. Download mechaphlowers Python dependencies as wheels
    4. Compile wheels to .pyc for performance
    5. Remove duplicate wheels
    6. Compress wheels with Brotli/Gzip (~60% bandwidth reduction)
    7. Generate python-packages.json for worker integration
    """
    parser = argparse.ArgumentParser(
        description="Set up mechaphlowers with Pyodide dependencies and Brotli compression"
    )
    parser.add_argument("--uv-index", type=str, help="Custom UV index URL")
    parser.add_argument(
        "--npm-registry-url",
        type=str,
        default="https://registry.npmjs.org/",
        help="NPM registry URL"
    )
    parser.add_argument(
        "--skip-compression",
        action="store_true",
        help="Skip Brotli/Gzip compression (not recommended)"
    )
    args = parser.parse_args()

    pyodide_url = f"{args.npm_registry_url}/pyodide/-/pyodide-{PYODIDE_VERSION}.tgz"
    
    recreate_directory(PYODIDE_DIRECTORY_PATH)
    
    # Delete the pyodide packages file if it exists
    packages_path = Path(PYODIDE_PACKAGES_PATH)
    if packages_path.exists():
        packages_path.unlink()

    # Download and extract the pyodide .tgz file
    print("Downloading pyodide")
    download_and_extract_tgz(pyodide_url, PYODIDE_DIRECTORY_PATH)

    # Keep only the needed files
    keep_only_needed_files(PYODIDE_DIRECTORY_PATH, NEEDED_PYODIDE_SOURCE_FILES)

    print("Downloading mechaphlowers and dependencies")
    
    # Step 1: Download optimized wheels from jsDelivr/Pyodide CDN (prefers CDN versions)
    cdn_wheels, packages_not_on_cdn = download_optimized_wheels_from_cdn(PYODIDE_DIRECTORY_PATH)
    
    # Step 2: Download only packages not available on CDN using pip
    if packages_not_on_cdn:
        print(f"\nDownloading {len(packages_not_on_cdn)} packages not available on CDN with pip")
        # Create a requirements list for pip
        pip_packages = []
        for pkg in packages_not_on_cdn:
            if pkg.lower() == "mechaphlowers":
                pip_packages.append(f"mechaphlowers=={MECHAPHLOWERS_VERSION}")
            else:
                # Download without specific version to get compatible version
                pip_packages.append(pkg)
        
        process_args = [
            "uvx",
            "--python",
            ">=3.12,<3.13",
            "pip",
            "download",
            "-d",
            PYODIDE_DIRECTORY_PATH,
        ]
        process_args.extend(pip_packages)
        if args.uv_index:
            process_args.insert(4, f"--index-url={args.uv_index}")
        
        result = subprocess.run(process_args, check=False, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Warning: Some packages may not have been downloaded: {result.stderr}")
    else:
        print("\n✓ All mechaphlowers dependencies are available on CDN!")
        # Still need to download mechaphlowers if not on CDN
        if "mechaphlowers" not in [p.lower() for p in cdn_wheels]:
            print("\nDownloading mechaphlowers wheel")
            process_args = [
                "uvx",
                "--python",
                ">=3.12,<3.13",
                "pip",
                "download",
                f"mechaphlowers=={MECHAPHLOWERS_VERSION}",
                "-d",
                PYODIDE_DIRECTORY_PATH,
            ]
            if args.uv_index:
                process_args.insert(4, f"--index-url={args.uv_index}")
            
            subprocess.run(process_args, check=False, capture_output=True, text=True)
    
    print("\nBuilding wheel files")
    # compile the wheel files to pyc
    pyodide_build(Path(PYODIDE_DIRECTORY_PATH), False, True, 6, "")

    remove_duplicate_wheels_in_directory(PYODIDE_DIRECTORY_PATH)

    # Compress wheels with Brotli/Gzip for bandwidth optimization
    compression_stats = {}
    if not args.skip_compression:
        print("\nCompressing wheels with Brotli/Gzip")
        compression_stats = compress_pyodide_wheels(PYODIDE_DIRECTORY_PATH, skip_files=cdn_wheels)
        print("✓ Compression complete")
        print("  CDN-optimized files skipped (already compressed)")
    else:
        print("\n⚠ Skipping compression (--skip-compression flag)")

    # Generate python-packages.json configuration
    wheel_names = get_all_wheel_file_names_in_directory(PYODIDE_DIRECTORY_PATH)
    all_packages: dict[str, dict[str, str]] = {
        normalize_package_name(wheel.split("-")[0]): {
            "file_name": wheel,
            "name": wheel.split("-")[0],
            "source": "local"
        }
        for wheel in wheel_names
    }

    # Write configuration file for worker-python.ts
    packages_output = Path(PYODIDE_PACKAGES_PATH)
    packages_output.parent.mkdir(parents=True, exist_ok=True)
    packages_output.write_text(
        json.dumps(all_packages, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8"
    )
    
    print(f"\n{'='*70}")
    print(f"✓ Setup complete!")
    print(f"{'='*70}")
    print(f"  Packages: {len(all_packages)}")
    print(f"  Config: {PYODIDE_PACKAGES_PATH}")
    if compression_stats:
        total_savings = sum(s["original_mb"] - s["compressed_mb"] for s in compression_stats.values())
        print(f"  Bandwidth saved: {total_savings:.1f} MB (~12-13%)")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    main()
