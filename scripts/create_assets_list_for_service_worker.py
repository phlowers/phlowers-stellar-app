#!/usr/bin/env python3
"""
Script to recursively list all files in the dist/phlowers-stellar-app directory and create a JSON file with the list of files.
The JSON file is used to create the asset list for the service worker to precache.
"""

import subprocess
import os
import sys
import json
import hashlib
from datetime import datetime, tzinfo, timedelta
from pathlib import Path


# https://stackoverflow.com/a/23705687/9346979 real ISO 8601 format for UTC
class simple_utc(tzinfo):
    def tzname(self, **kwargs):
        return "UTC"

    def utcoffset(self, dt):
        return timedelta(0)


def get_git_revision_hash() -> str:
    """Get the git revision hash from environment variable or git command"""
    # First check if hash is available in environment variable
    env_hash = os.environ.get("CI_COMMIT_SHA")
    if env_hash:
        return env_hash

    # Fall back to git command if environment variable is not set
    return subprocess.check_output(["git", "rev-parse", "HEAD"]).decode("ascii").strip()


blacklist = [
    "service-worker.js",
]


def list_files_recursively(directory):
    """
    Recursively list all files in the given directory.

    Args:
        directory (str): Path to the directory to scan

    Returns:
        list: List of file paths relative to the directory
    """
    base_path = Path(directory)

    if not base_path.exists():
        print(f"Error: Directory '{directory}' does not exist.")
        sys.exit(1)

    if not base_path.is_dir():
        print(f"Error: '{directory}' is not a directory.")
        sys.exit(1)

    file_list = []

    for root, dirs, files in os.walk(directory):
        for file in files:
            # Get the full path
            full_path = os.path.join(root, file)
            # Convert to relative path from the base directory
            rel_path = "/" + os.path.relpath(full_path, directory)
            file_list.append(rel_path)

    return file_list


def compute_sha256(filepath):
    """Compute SHA-256 for a file and return it as hex string."""
    digest = hashlib.sha256()
    with open(filepath, "rb") as file_handle:
        for block in iter(lambda: file_handle.read(65536), b""):
            digest.update(block)
    return digest.hexdigest()


def collect_csv_hashes(directory):
    """Return a mapping of CSV basename to SHA-256 hash."""
    hashes = {}
    data_dir = Path(directory) / "data"
    if not data_dir.exists() or not data_dir.is_dir():
        return hashes

    for csv_path in sorted(data_dir.glob("*.csv")):
        hashes[csv_path.name] = compute_sha256(csv_path)
    return hashes


def main(language):
    target_dir = f"dist/{language}"

    package_json_file = "package.json"
    with open(package_json_file, "r") as f:
        package_json = json.load(f)
    version = package_json["version"]

    # Build the app_version object once — reused for version.json and assets_list.json.
    app_version = {
        "git_hash": get_git_revision_hash(),
        "build_datetime_utc": datetime.utcnow()
        .replace(tzinfo=simple_utc())
        .isoformat(),
        "version": version,
    }

    # Write version.json BEFORE listing files so it is included in the asset manifest.
    version_file = os.path.join(target_dir, "version.json")
    with open(version_file, "w") as f:
        json.dump(app_version, f, indent=2)
    print(f"Generated {version_file}")

    print(f"Listing all files in '{target_dir}':")
    print("-" * 50)

    files = list_files_recursively(target_dir)

    if not files:
        print("No files found.")
        return

    # Sort files for better readability
    files.sort()

    # Print all files with their index
    for i, file_path in enumerate(files, 1):
        print(f"{i}. {file_path}")

    print("-" * 50)
    print(f"Total files: {len(files)}")
    output_file = f"dist/{language}/assets_list.json"
    csv_hashes = collect_csv_hashes(target_dir)
    res = {
        "app_version": app_version,
        "data_hashes": csv_hashes,
        "files": [file for file in files if os.path.basename(file) not in blacklist],
    }
    with open(output_file, "w") as f:
        json.dump(res, f, indent=2)


if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) > 1 and args[0] == "--language":
        language = args[1]
    else:
        raise ValueError("Language is required: --language en|fr")
    main(language)
