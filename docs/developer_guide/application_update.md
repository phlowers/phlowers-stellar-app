# Application Update Process

The application has to function offline. Therefore, all assets should be downloaded and cached on the user's device. It also has to be able to update itself when a new version is available.

## Service Worker Overview

Our application uses a service worker to enable offline capabilities and manage updates. The service worker:

1. Caches application assets during installation
2. Checks for new versions when the application loads
3. Manages the update process when a new version is available
4. Serves cached assets when the user is offline

## Update Mechanism

### How Updates Work

1. When a user navigates to the application, the service worker checks for a new version by comparing:
   - The Git hash of the current version (stored in cache) and the Git hash of the latest version (from the server manifest)
   - The build timestamp of the current version (stored in cache) and the build timestamp of the latest version (from the server manifest)

2. If a new version is detected, the service worker notifies the application via a message event.

3. The application can then show a message to the user in the UI in order to let them know that an update is available.

4. The user can then go the the /admin page and click on the "Update" button to download the new version.

5. During the update process, the service worker:
   - Downloads new assets
   - Removes outdated assets
   - Updates the cached version information

### Asset List Generation

The service worker relies on a pre-generated list of assets to cache in order to download the correct assets when an update is available. This list is created during the build process using the `create_assets_list_for_service_worker.py` script.

#### Asset List Commands

We have two commands for generating asset lists, one for each supported language:

- `npm run create-assets-list-for-service-worker:fr` - Generates the French asset list
- `npm run create-assets-list-for-service-worker:en` - Generates the English asset list

These commands run the Python script that:
1. Recursively scans the build directory for the specified language
2. Creates a list of all files (excluding blacklisted items like the service worker itself)
3. Adds external assets from `scripts/external_assets.json`
4. Generates version information including:
   - Git commit hash
   - Build timestamp
5. Writes the complete asset list to `assets_list.json`
