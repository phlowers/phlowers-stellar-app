# /// script
# requires-python = ">=3.12,<3.13"
# dependencies = ["requests == 2.32.3", "pyodide-build == 0.30.6"]
# ///
import hashlib
import json
import os
import shutil
from pathlib import Path
import subprocess
import tarfile
import tempfile
import argparse

import requests
from pyodide_build.cli.py_compile import main as pyodide_build  # type: ignore

PYODIDE_VERSION = "0.27.4"
MECHAPHLOWERS_VERSION = "0.3.0"
PYODIDE_DIRECTORY_PATH = "./public/pyodide"
PYODIDE_LOCK_PATH = "./public/pyodide/pyodide-lock.json"
PYODIDE_PACKAGES_PATH = "./src/app/core/services/worker_python/python-packages.json"
NEEDED_PYODIDE_SOURCE_FILES = [
    "pyodide.asm.wasm",
    "pyodide.asm.js",
    "python_stdlib.zip",
    "pyodide-lock.json",
]


def recreate_directory(directory):
    if os.path.exists(directory):
        shutil.rmtree(directory)
        print(f"Removed directory: {directory}")
    os.makedirs(directory)
    print(f"Recreated directory: {directory}")


def get_all_wheel_file_names_in_directory(directory):
    return [
        f
        for f in os.listdir(directory)
        if os.path.isfile(os.path.join(directory, f)) and f.endswith(".whl")
    ]


def download_file_in_directory(url, directory):
    response = requests.get(url, timeout=10)
    response.raise_for_status()  # Raise an exception for HTTP errors
    name = os.path.join(directory, url.split("/")[-1])
    with open(name, "wb") as file:
        file.write(response.content)
    print(f"Downloaded {name}")


def sha256sum(filename):
    with open(filename, "rb", buffering=0) as f:
        return hashlib.file_digest(f, "sha256").hexdigest()


def delete_files_starting_with(directory, start_string):
    for name in os.listdir(directory):
        if name.startswith(start_string) and os.path.isfile(
            os.path.join(directory, name)
        ):
            os.remove(os.path.join(directory, name))
            print(f"Deleted {name}")


def download_and_extract_tgz(url, target_dir):
    # Create a temporary directory to store the downloaded file
    with tempfile.TemporaryDirectory() as temp_dir:
        # Download the .tgz file
        tgz_path = os.path.join(temp_dir, "pyodide.tgz")
        response = requests.get(url, timeout=10, verify=False)
        response.raise_for_status()
        with open(tgz_path, "wb") as f:
            f.write(response.content)

        # Extract the .tgz file
        with tarfile.open(tgz_path, "r:gz") as tar:
            tar.extractall(path=target_dir)
        print(f"Downloaded and extracted {url} to {target_dir}")


def keep_only_needed_files(directory, needed_files):
    """Keep only the specified files in the directory and move them from package subdirectory."""
    package_dir = os.path.join(directory, "package")
    if not os.path.exists(package_dir):
        print(f"Warning: package directory not found at {package_dir}")
        return

    # Move needed files from package directory to main directory
    for filename in needed_files:
        source_path = os.path.join(package_dir, filename)
        if os.path.exists(source_path):
            dest_path = os.path.join(directory, filename)
            shutil.move(source_path, dest_path)
            print(f"Moved {filename} to {directory}")

    # Remove the package directory and all other files
    shutil.rmtree(package_dir)
    print(f"Removed package directory")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--uv-index", type=str, default=None)
    parser.add_argument(
        "--npm-registry-url", type=str, default="https://registry.npmjs.org/"
    )
    args = parser.parse_args()

    npm_registry_url = args.npm_registry_url
    pyodide_url = f"{npm_registry_url}/pyodide/-/pyodide-{PYODIDE_VERSION}.tgz"
    pyodide_lock_url = f"{pyodide_url}/pyodide-lock.json"

    uv_index = args.uv_index
    recreate_directory(PYODIDE_DIRECTORY_PATH)
    # delete the pyodide packages file if it exists
    if os.path.exists(PYODIDE_PACKAGES_PATH):
        os.remove(PYODIDE_PACKAGES_PATH)

    # Download and extract the pyodide .tgz file
    print("Downloading pyodide")
    download_and_extract_tgz(pyodide_url, PYODIDE_DIRECTORY_PATH)

    # Keep only the needed files
    keep_only_needed_files(PYODIDE_DIRECTORY_PATH, NEEDED_PYODIDE_SOURCE_FILES)

    print("Downloading mechaphlowers wheel files")
    # get the wheel file for mechaphlowers
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
    if uv_index:
        process_args.append(f"--index-url={uv_index}")
    subprocess.run(process_args)
    print("Building wheel files")
    # compile the wheel files to pyc
    pyodide_build(Path(PYODIDE_DIRECTORY_PATH), False, False, 6, "")

    with open(PYODIDE_LOCK_PATH) as f:
        pyodide_lock_content = json.load(f)
    # get the lock file for pyodide

    wheel_names = get_all_wheel_file_names_in_directory(PYODIDE_DIRECTORY_PATH)
    mechaphlowers_packages = {}
    for wheel in wheel_names:
        name = wheel.split("-")[0]
        mechaphlowers_packages[name.replace("_", "-")] = {
            "name": name,
            "file_name": wheel,
            "source": "local",
        }
    # print(f"mechaphlowers_packages: {mechaphlowers_packages}")

    # # list the packages and their dependencies
    all_packages = {}
    for package_name in mechaphlowers_packages.keys():
        all_packages[package_name] = mechaphlowers_packages[package_name]
        print(f"package_name: {package_name}")
        if package_name in pyodide_lock_content["packages"]:
            all_packages[package_name] = {
                "name": package_name,
                "file_name": pyodide_lock_content["packages"][package_name][
                    "file_name"
                ],
                "source": "remote",
            }
            # remove packages from PYODIDE_DIRECTORY_PATH because we don't need them as they are remote packages
            os.remove(
                os.path.join(
                    PYODIDE_DIRECTORY_PATH,
                    mechaphlowers_packages[package_name]["file_name"],
                )
            )

            if "depends" in pyodide_lock_content["packages"][package_name]:
                for package in pyodide_lock_content["packages"][package_name][
                    "depends"
                ]:
                    name_key = package.replace("_", "-")
                    all_packages[name_key] = {
                        "name": package,
                        "file_name": pyodide_lock_content["packages"][name_key][
                            "file_name"
                        ],
                        "source": "remote",
                    }
    # write to file
    with open(PYODIDE_PACKAGES_PATH, "w", encoding="utf-8") as pyodide_packages:
        json.dump(
            all_packages, pyodide_packages, ensure_ascii=False, indent=4, sort_keys=True
        )
