# /// script
# requires-python = ">=3.12,<3.13"
# ///
import datetime
import json
# Read package.json file
with open('package.json', 'r') as file:
    package_json = json.load(file)
    version = package_json['version']

# Get current time in ISO format
build_time = datetime.datetime.now().isoformat()

# Read the environment file
env_file_path = 'src/environments/environment.ts'
with open(env_file_path, 'r') as file:
    content = file.read()

# Replace the build version and build time
content = content.replace('{BUILD_VERSION}', version)
content = content.replace('{BUILD_TIME}', build_time)

# Write the updated content back to the file
with open(env_file_path, 'w') as file:
    file.write(content)

print(f"Updated {env_file_path} with version {version} and build time {build_time}")