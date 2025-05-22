#!/usr/bin/env python3
"""
Script to recursively list all files in the dist/phlowers-stellar-app directory and create a JSON file with the list of files.
The JSON file is used to create the asset list for the service worker to precache.
"""

import subprocess
import os
import sys
import json
from datetime import datetime
from pathlib import Path

def get_git_revision_hash() -> str:
    """Get the git revision hash from environment variable or git command"""
    # First check if hash is available in environment variable
    env_hash = os.environ.get('CI_COMMIT_SHA')
    if env_hash:
        return env_hash
    
    # Fall back to git command if environment variable is not set
    return subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode('ascii').strip()


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

def main(language):
    target_dir = f"dist/{language}"
    
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
    extra_assets_file = "scripts/external_assets.json"
    with open(extra_assets_file, 'r') as f:
        extra_assets = json.load(f)
    res = {
        "app_version": {
            "git_hash": get_git_revision_hash(),
            "build_datetime_utc": datetime.utcnow().isoformat()
        },
        "files": [file for file in files if os.path.basename(file) not in blacklist] + extra_assets["files"]
    }
    with open(output_file, 'w') as f:
        json.dump(res, f, indent=2)
    

if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) > 1 and args[0] == "--language":
        language = args[1]
    else:
        raise ValueError("Language is required: --language en|fr")
    main(language)