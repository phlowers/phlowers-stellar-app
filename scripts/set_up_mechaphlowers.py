# /// script
# requires-python = ">=3.12"
# dependencies = ["requests == 2.32.3", "pip == 24.3.1", "pyodide-build == 0.29.3"]
# ///


import hashlib
import json
import os
import shutil
from pathlib import Path
import subprocess

import pip
import requests
from pyodide_build.cli.py_compile import main as pyodide_build  # type: ignore

PYODIDE_VERSION = "0.27.4"
MECHAPHLOWERS_VERSION = "0.3.0"
PYODIDE_URL = f"https://cdn.jsdelivr.net/pyodide/v{PYODIDE_VERSION}/full"
PYODIDE_LOCK_URL = f"{PYODIDE_URL}/pyodide-lock.json"
PYODIDE_DIRECTORY_PATH = "./public/pyodide"
PYODIDE_LOCK_PATH = "./public/pyodide/pyodide-lock.json"
PYODIDE_PACKAGES_PATH = "./src/app/core/engine/worker/python-packages.json"
NEEDED_PYODIDE_SOURCE_FILES = [
    "pyodide.asm.wasm", "pyodide.asm.js", "python_stdlib.zip"]


def recreate_directory(directory):
    if os.path.exists(directory):
        shutil.rmtree(directory)
        print(f"Removed directory: {directory}")
    os.makedirs(directory)
    print(f"Recreated directory: {directory}")


def get_all_file_names_in_directory(direct):
    return [f for f in os.listdir(direct) if os.path.isfile(os.path.join(direct, f))]


def download_file_in_directory(url, directory):
    response = requests.get(url, timeout=10)
    response.raise_for_status()  # Raise an exception for HTTP errors
    name = os.path.join(directory, url.split("/")[-1])
    with open(name, "wb") as file:
        file.write(response.content)
    print(f"Downloaded {name}")


def sha256sum(filename):
    with open(filename, 'rb', buffering=0) as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


def delete_files_starting_with(directory, start_string):
    for name in os.listdir(directory):
        if name.startswith(start_string) and os.path.isfile(os.path.join(directory, name)):
            os.remove(os.path.join(directory, name))
            print(f"Deleted {name}")


if __name__ == "__main__":
    recreate_directory(PYODIDE_DIRECTORY_PATH)
    # delete the pyodide packages file if it exists
    if os.path.exists(PYODIDE_PACKAGES_PATH):
        os.remove(PYODIDE_PACKAGES_PATH)
    # get the wheel file for mechaphlowers
    subprocess.run(["pip", "wheel", f"mechaphlowers=={MECHAPHLOWERS_VERSION}", "-w", PYODIDE_DIRECTORY_PATH])
    # compile the wheel files to pyc
    pyodide_build(Path(PYODIDE_DIRECTORY_PATH), False, False, 6, "")

    pyodide_lock_content = requests.get(PYODIDE_LOCK_URL, timeout=10).json()

    wheel_names = get_all_file_names_in_directory(PYODIDE_DIRECTORY_PATH)
    mechaphlowers_packages = {}
    for wheel in wheel_names:
        name = wheel.split("-")[0]
        mechaphlowers_packages[name.replace("_", "-")] = {
            "name": name,
            "file_name": wheel,
            "sha256": sha256sum(os.path.join(PYODIDE_DIRECTORY_PATH, wheel)),
            "source": "local"
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
                "file_name": pyodide_lock_content["packages"][package_name]["file_name"],
                "sha256": pyodide_lock_content["packages"][package_name]["sha256"],
                "source": "remote"
            }
            # remove packages from PYODIDE_DIRECTORY_PATH because we don't need them as they are remote packages
            os.remove(os.path.join(PYODIDE_DIRECTORY_PATH, mechaphlowers_packages[package_name]["file_name"]))
            
            if "depends" in pyodide_lock_content["packages"][package_name]:
                for package in pyodide_lock_content["packages"][package_name]["depends"]:
                    name_key = package.replace("_", "-")    
                    all_packages[name_key] = {
                        "name": package,
                        "file_name": pyodide_lock_content["packages"][name_key]["file_name"],
                        "sha256": pyodide_lock_content["packages"][name_key]["sha256"],
                        "source": "remote"
                    }
    # write to file
    with open(PYODIDE_PACKAGES_PATH, "w", encoding="utf-8") as pyodide_packages:
        json.dump(all_packages, pyodide_packages, ensure_ascii=False, indent=4)
    # download the pyodide source files
    for pyodide_source_file in NEEDED_PYODIDE_SOURCE_FILES:
        download_file_in_directory(
            f"{PYODIDE_URL}/{pyodide_source_file}", PYODIDE_DIRECTORY_PATH)
