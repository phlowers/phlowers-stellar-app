# /// script
# requires-python = ">=3.12,<3.13"
# ///
import datetime
import json
import os
import re
import subprocess
import sys

# Read package.json file
with open("package.json", "r") as file:
    package_json = json.load(file)
    version = package_json["version"]

# This script is the single source of the build identity: the JS placeholders and
# dist/version.json (read back by create_assets_list_for_service_worker.py) share it.
# git_hash identifies the version: rebuilding the same commit must not trigger an app update.
build_time = datetime.datetime.now(datetime.timezone.utc).isoformat()

GIT_HASH_PATTERN = re.compile(r"^[0-9a-f]{7,40}$")


def get_git_revision_hash() -> str:
    """Get the git revision hash from environment variable or git command"""
    env_hash = os.environ.get("CI_COMMIT_SHA")
    if env_hash:
        return env_hash
    try:
        return (
            subprocess.check_output(["git", "rev-parse", "HEAD"])
            .decode("ascii")
            .strip()
        )
    except Exception:
        return "unknown"


git_hash = get_git_revision_hash()
if not GIT_HASH_PATTERN.match(git_hash):
    print(f"Error: invalid git hash '{git_hash}'. Set CI_COMMIT_SHA to the built commit SHA or build from a git checkout.")
    sys.exit(1)

env_variables = [
    "{API_URL}",
    "{APP_NAME}",
]


def replace_in_file(file_path):
    """Replace placeholders in a single file"""
    try:
        with open(file_path, "r") as file:
            content = file.read()

        # Check if file contains any placeholders
        if any(
            placeholder in content
            for placeholder in [
                "{BUILD_VERSION}",
                "{BUILD_TIME}",
                "{GIT_HASH}",
                *env_variables,
            ]
        ):
            content = content.replace("{BUILD_VERSION}", version)
            content = content.replace("{BUILD_TIME}", build_time)
            content = content.replace("{GIT_HASH}", git_hash)
            for env_variable in env_variables:
                variable_key = env_variable.replace("{", "").replace("}", "")
                if os.getenv(variable_key):
                    content = content.replace(env_variable, os.getenv(variable_key))

            with open(file_path, "w") as file:
                file.write(content)
    except Exception as e:
        print(f"Error processing {file_path}: {e}")


def process_directory_recursively(directory):
    """Recursively process all files in a directory"""
    # processed_files = 0
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".js"):
                file_path = os.path.join(root, file)
                replace_in_file(file_path)


# Process all files in dist folder recursively
if os.path.exists("dist"):
    process_directory_recursively("dist")
    with open(os.path.join("dist", "version.json"), "w") as file:
        json.dump(
            {
                "git_hash": git_hash,
                "build_datetime_utc": build_time,
                "version": version,
            },
            file,
            indent=2,
        )
    print("Updated all files in dist folder")
else:
    print("dist directory not found")
