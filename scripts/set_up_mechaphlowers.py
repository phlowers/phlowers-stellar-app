# /// script
# requires-python = ">=3.12,<3.13"
# dependencies = ["requests == 2.32.3", "pyodide-build == 0.30.6"]
# ///
"""Script to set up mechaphlowers with Pyodide dependencies."""
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import tarfile
import tempfile
from pathlib import Path
from typing import Dict, List

import requests
from pyodide_build.cli.py_compile import main as pyodide_build  # type: ignore

PYODIDE_VERSION = "0.27.4"
MECHAPHLOWERS_VERSION = "0.4.3"
PYODIDE_DIRECTORY_PATH = "./public/pyodide"
PYODIDE_LOCK_PATH = "./public/pyodide/pyodide-lock.json"
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


def download_file_in_directory(url: str, directory: str) -> None:
    """Download a file from a URL to a directory.
    
    Args:
        url: URL to download from
        directory: Directory to save the file to
    """
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    filename = url.split("/")[-1]
    file_path = Path(directory) / filename
    file_path.write_bytes(response.content)
    print(f"Downloaded {filename}")

def download_cdn_files(target_dir: str) -> None:
    """Download CDN files from external_assets.json.
    
    Args:
        target_dir: Directory to save downloaded files to
    """
    extra_assets_file = Path("scripts/external_assets.json")
    
    with extra_assets_file.open("r", encoding="utf-8") as f:
        extra_assets = json.load(f)

    for url in extra_assets.get("files", []):
        download_file_in_directory(url, target_dir)

def sha256sum(filename: str) -> str:
    """Calculate SHA256 hash of a file.
    
    Args:
        filename: Path to file to hash
        
    Returns:
        Hexadecimal SHA256 hash
    """
    with open(filename, "rb", buffering=0) as f:
        return hashlib.file_digest(f, "sha256").hexdigest()


def delete_files_starting_with(directory: str, start_string: str) -> None:
    """Delete all files starting with a specific string.
    
    Args:
        directory: Directory to search in
        start_string: String prefix to match
    """
    dir_path = Path(directory)
    for file_path in dir_path.glob(f"{start_string}*"):
        if file_path.is_file():
            file_path.unlink()
            print(f"Deleted {file_path.name}")


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


def main() -> None:
    """Main function to set up mechaphlowers with Pyodide."""
    parser = argparse.ArgumentParser(
        description="Set up mechaphlowers with Pyodide dependencies"
    )
    parser.add_argument("--uv-index", type=str, help="Custom UV index URL")
    parser.add_argument(
        "--npm-registry-url",
        type=str,
        default="https://registry.npmjs.org/",
        help="NPM registry URL"
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

    # Load the Pyodide lock file
    with open(PYODIDE_LOCK_PATH, encoding="utf-8") as f:
        pyodide_lock_content = json.load(f)

    # download extra cdn files
    download_cdn_files(PYODIDE_DIRECTORY_PATH)

    wheel_names = get_all_wheel_file_names_in_directory(PYODIDE_DIRECTORY_PATH)
    mechaphlowers_packages: Dict[str, Dict[str, str]] = {}
    for wheel in wheel_names:
        name = wheel.split("-")[0]
        normalized_name = name.replace("_", "-")
        mechaphlowers_packages[normalized_name] = {
            "name": name,
            "file_name": wheel,
            "source": "local",
        }

    # List the packages and their dependencies
    all_packages: Dict[str, Dict[str, str]] = dict(mechaphlowers_packages)
    
    for package_name, package_info in mechaphlowers_packages.items():
        print(f"Processing package: {package_name}")
        
        if package_name not in pyodide_lock_content.get("packages", {}):
            continue
            
        pyodide_package = pyodide_lock_content["packages"][package_name]
        
        # Use remote version instead of local
        all_packages[package_name] = {
            "name": package_name,
            "file_name": pyodide_package["file_name"],
            "source": "remote",
        }
        
        # Remove local package file since we use the remote one
        local_file = Path(PYODIDE_DIRECTORY_PATH) / package_info["file_name"]
        if local_file.exists():
            local_file.unlink()

        # Add dependencies
        for dependency in pyodide_package.get("depends", []):
            dep_name = dependency.replace("_", "-")
            if dep_name in pyodide_lock_content["packages"]:
                all_packages[dep_name] = {
                    "name": dependency,
                    "file_name": pyodide_lock_content["packages"][dep_name]["file_name"],
                    "source": "remote",
                }
    # Write packages to file
    packages_output = Path(PYODIDE_PACKAGES_PATH)
    packages_output.parent.mkdir(parents=True, exist_ok=True)
    
    with packages_output.open("w", encoding="utf-8") as f:
        json.dump(all_packages, f, ensure_ascii=False, indent=4, sort_keys=True)
    
    print(f"\nSuccessfully created {PYODIDE_PACKAGES_PATH} with {len(all_packages)} packages")


if __name__ == "__main__":
    main()
