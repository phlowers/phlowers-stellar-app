#!/usr/bin/env python3
"""
Script to recursively list all files in the dist/phlowers-stellar-app directory and create a JSON file with the list of files.
The JSON file is used to create the asset list for the service worker to precache.
"""

import os
import sys
import json
import hashlib
from pathlib import Path


blacklist = [
    "service-worker.js",
]

# Catalog data files (CSV/JSON under dist/data) are described by data_hashes
# and updated independently of the app version — they must never be part of
# the applicative manifest (files), which drives the atomic app update.
CATALOG_DATA_FILENAMES = {
    "attachments.csv",
    "cables.csv",
    "chains.csv",
    "lines.csv",
    "maintenance-teams.csv",
    "obstacle_configuration.json",
}


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


def collect_data_file_hashes(directory):
    """Return a mapping of data CSV basename to SHA-256 hash."""
    hashes = {}
    data_dir = Path(directory) / "data"
    if not data_dir.exists() or not data_dir.is_dir():
        return hashes

    for catalog_path in sorted(
        list(data_dir.glob("*.csv")) + list(data_dir.glob("*.json"))
    ):
        hashes[catalog_path.name] = compute_sha256(catalog_path)
    return hashes


def main():
    target_dir = "dist"

    # version.json is written by set-env-variables.py, the single source of the build
    # identity (build_id, build time): never generate a second one here.
    version_file = os.path.join(target_dir, "version.json")
    if not os.path.exists(version_file):
        print(f"Error: {version_file} is missing. Run set-env-variables.py first.")
        sys.exit(1)
    with open(version_file, "r") as f:
        app_version = json.load(f)
    if not app_version.get("build_id"):
        print(f"Error: {version_file} has no build_id.")
        sys.exit(1)

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
    output_file = os.path.join(target_dir, "assets_list.json")
    csv_hashes = collect_data_file_hashes(target_dir)

    missing_hashes = CATALOG_DATA_FILENAMES - csv_hashes.keys()
    if missing_hashes:
        print(f"Error: missing data hash for catalog file(s): {sorted(missing_hashes)}")
        sys.exit(1)

    app_files = [
        file
        for file in files
        if os.path.basename(file) not in blacklist
        and os.path.basename(file) not in CATALOG_DATA_FILENAMES
    ]

    if "/index.html" not in app_files:
        print("Error: /index.html is missing from the application manifest.")
        sys.exit(1)

    res = {
        "app_version": app_version,
        "data_hashes": csv_hashes,
        "files": app_files,
    }
    with open(output_file, "w") as f:
        json.dump(res, f, indent=2)


if __name__ == "__main__":
    main()
