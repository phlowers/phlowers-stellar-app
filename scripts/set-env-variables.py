# /// script
# requires-python = ">=3.12,<3.13"
# ///
import datetime
import json
import os

# Read package.json file
with open("package.json", "r") as file:
    package_json = json.load(file)
    version = package_json["version"]

# Get current time in ISO format
build_time = datetime.datetime.now().isoformat()

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
                *env_variables,
            ]
        ):
            content = content.replace("{BUILD_VERSION}", version)
            content = content.replace("{BUILD_TIME}", build_time)
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
    print("Updated all files in dist folder")
else:
    print("dist directory not found")
