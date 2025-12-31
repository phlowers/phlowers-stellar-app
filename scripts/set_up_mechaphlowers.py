# /// script
# requires-python = ">=3.12,<3.13"
# dependencies = ["requests == 2.32.3", "pyodide-build == 0.30.6"]
# ///
"""
Set up mechaphlowers with Pyodide dependencies and optimize with Brotli compression.

This script:
1. Downloads and extracts Pyodide runtime
2. Downloads mechaphlowers Python packages as wheels
3. Compiles wheels to .pyc for performance
4. Compresses only large wheel files (>= 1 MB) with Brotli/Gzip for faster setup
5. Generates python-packages.json configuration for the worker

Bandwidth optimization:
- Brotli compression: Applied to large files (numpy, pandas, plotly, pydantic_core)
- Expected savings: ~12-13% on large packages, up to 26% on data-heavy files
- Small packages (<1 MB) are not compressed (negligible gain, slower build)
- Apache serves .br files automatically via mod_rewrite
"""
import argparse
import json
import shutil
import subprocess
import tarfile
import tempfile
from pathlib import Path
from typing import Dict, List, Tuple

import requests
from pyodide_build.cli.py_compile import main as pyodide_build  # type: ignore

PYODIDE_VERSION = "0.27.4"
MECHAPHLOWERS_VERSION = "0.4.3"
PYODIDE_DIRECTORY_PATH = "./public/pyodide"
PYODIDE_PACKAGES_PATH = "./src/app/core/services/worker_python/python-packages.json"
NEEDED_PYODIDE_SOURCE_FILES = [
    "pyodide.asm.wasm",
    "pyodide.asm.js",
    "python_stdlib.zip",
    "pyodide-lock.json",
]


def remove_duplicate_wheels_in_directory(directory: str) -> None:
    """
    Remove duplicate wheel files, keeping the one without 'py3' tag.
    
    For each package name, keeps the wheel without 'py3' in its filename
    and removes other variants to avoid conflicts.
    
    Args:
        directory: Path to directory containing wheel files
    """
    wheel_files = get_all_wheel_file_names_in_directory(directory)
    
    # Group files by package name
    packages: Dict[str, List[str]] = {}
    for wheel in wheel_files:
        package_name = wheel.split("-")[0]
        packages.setdefault(package_name, []).append(wheel)
    
    # Remove duplicates: keep the one without 'py3', remove others
    for package_name, wheels in packages.items():
        if len(wheels) <= 1:
            continue
            
        # Prefer non-py3 versions
        non_py3_wheels = [w for w in wheels if "py3" not in w]
        keep_wheel = non_py3_wheels[0] if non_py3_wheels else wheels[0]
        
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


def get_all_wheel_file_names_in_directory(directory: str) -> List[str]:
    """Get all wheel file names in a directory.
    
    Args:
        directory: Path to directory to search
        
    Returns:
        List of wheel filenames
    """
    dir_path = Path(directory)
    return [f.name for f in dir_path.glob("*.whl") if f.is_file()]


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


def keep_only_needed_files(directory: str, needed_files: List[str]) -> None:
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


def normalize_package_name(name: str) -> str:
    """Normalize package name: lowercase and replace underscores with dashes.
    
    Args:
        name: Package name to normalize
        
    Returns:
        Normalized package name
    """
    return name.lower().replace("_", "-")


def parse_wheel_filename(wheel: str) -> Tuple[str, str]:
    """Parse wheel filename to extract package name and version.
    
    Args:
        wheel: Wheel filename (e.g., 'numpy-1.24.0-cp312-cp312-linux_x86_64.whl')
        
    Returns:
        Tuple of (package_name, version)
    """
    parts = wheel.replace(".whl", "").split("-")
    return parts[0], (parts[1] if len(parts) > 1 else "unknown")


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


def compress_pyodide_wheels(directory: str, verbose: bool = True, min_size_mb: float = 1.0) -> Dict[str, Dict]:
    """Compress large wheel files in directory with Brotli/Gzip.
    
    Strategy:
    1. Only compress files larger than min_size_mb (default 1 MB)
    2. Try Brotli compression first (best ratio)
    3. Fall back to Gzip if Brotli fails
    4. Keep original .whl files for compatibility
    
    Apache will serve .whl.br or .whl.gz automatically based on
    Accept-Encoding header via mod_rewrite rules.
    
    Args:
        directory: Directory containing wheel files
        verbose: Print compression statistics
        min_size_mb: Minimum file size in MB to compress (default: 1.0)
        
    Returns:
        Dictionary mapping package names to compression stats
    """
    wheel_files = [f for f in Path(directory).glob("*.whl")]
    
    # Filter files by size
    large_files = [f for f in wheel_files if f.stat().st_size / (1024 * 1024) >= min_size_mb]
    skipped_count = len(wheel_files) - len(large_files)
    
    if verbose:
        print(f"\n{'='*70}")
        print(f"Compressing {len(large_files)} large files (>= {min_size_mb} MB)")
        if skipped_count > 0:
            print(f"Skipping {skipped_count} small files (< {min_size_mb} MB)")
        print(f"{'='*70}\n")
    
    total_original_mb = 0.0
    total_compressed_mb = 0.0
    compression_stats = {}
    
    for wheel_path in sorted(large_files):
        name, version = parse_wheel_filename(wheel_path.name)
        original_size = wheel_path.stat().st_size
        original_mb = original_size / (1024 * 1024)
        
        # Always compress with both Brotli AND Gzip for proper fallback
        brotli_success = compress_wheel_brotli(wheel_path)
        gzip_success = compress_wheel_gzip(wheel_path)
        
        # Use Brotli size for stats (best compression)
        if brotli_success:
            br_path = wheel_path.with_suffix(wheel_path.suffix + ".br")
            compressed_size = br_path.stat().st_size
            compression_type = "brotli + gzip"
        elif gzip_success:
            gz_path = wheel_path.with_suffix(wheel_path.suffix + ".gz")
            compressed_size = gz_path.stat().st_size
            compression_type = "gzip"
        else:
            compressed_size = original_size
            compression_type = "none"
        
        compressed_mb = compressed_size / (1024 * 1024)
        ratio_percent = ((original_size - compressed_size) / original_size) * 100
        
        total_original_mb += original_mb
        total_compressed_mb += compressed_mb
        
        # Store stats
        normalized_name = normalize_package_name(name)
        compression_stats[normalized_name] = {
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

    print("Downloading mechaphlowers wheel files")
    # Get the wheel file for mechaphlowers
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
        process_args.append(f"--index-url={args.uv_index}")
    
    result = subprocess.run(process_args, check=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error downloading wheels: {result.stderr}")
        return
    print("Building wheel files")
    # compile the wheel files to pyc
    pyodide_build(Path(PYODIDE_DIRECTORY_PATH), False, True, 6, "")

    remove_duplicate_wheels_in_directory(PYODIDE_DIRECTORY_PATH)

    # Compress wheels with Brotli/Gzip for bandwidth optimization
    compression_stats = {}
    if not args.skip_compression:
        print("\n" + "="*70)
        print("BANDWIDTH OPTIMIZATION: Compressing wheels with Brotli/Gzip")
        print("="*70)
        compression_stats = compress_pyodide_wheels(PYODIDE_DIRECTORY_PATH, verbose=True)
        print("✓ Compression complete")
        print("  Apache serves .whl.br files via mod_rewrite")
        print("  Only large files (>= 1 MB) compressed for faster setup")
    else:
        print("\n⚠ Skipping compression (--skip-compression flag)")

    # Generate python-packages.json configuration
    wheel_names = get_all_wheel_file_names_in_directory(PYODIDE_DIRECTORY_PATH)
    all_packages: Dict[str, Dict[str, str]] = {}
    
    for wheel in wheel_names:
        name = wheel.split("-")[0]
        normalized_name = normalize_package_name(name)
        all_packages[normalized_name] = {
            "file_name": wheel,
            "name": name,
            "source": "local",
        }

    # Write configuration file for worker-python.ts
    packages_output = Path(PYODIDE_PACKAGES_PATH)
    packages_output.parent.mkdir(parents=True, exist_ok=True)
    
    with packages_output.open("w", encoding="utf-8") as f:
        json.dump(all_packages, f, ensure_ascii=False, indent=2, sort_keys=True)
    
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
