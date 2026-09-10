# Application Update Process

The application has to function offline. Therefore, all assets should be downloaded and cached on the user's device. It also has to be able to update itself when a new version is available.

Catalog reference data (CSV/JSON files) is refreshed by a separate, independent
mechanism — see [Catalog Update Process](catalog_update.md).

## Service Worker Overview

Our application uses a service worker to enable offline capabilities and manage updates. The service worker:

1. Caches application assets during installation
2. Checks for new versions when the application loads
3. Manages the update process when a new version is available
4. Serves cached assets when the user is offline

Catalog files (`/data/*.csv`, `/data/obstacle_configuration.json`) are **excluded**
from the application asset manifest (`files`) — the service worker never
downloads or caches them. Only their SHA-256 hashes are listed, under
`data_hashes`, for the catalog update mechanism to consume.

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

### Authorization and entry points

`WorkerUpdateService` (`stellar/src/app/core/services/worker_update/worker_update.service.ts`)
is the only class allowed to send `install`/`update` commands to the service
worker, through three explicit, authenticated-only intents:

- `confirmUpdate()` — the user accepts the update popup (`pendingAction` must be
  `'first-install'` or `'update-available'`).
- `forceUpdateFromAdmin()` — an explicit click on the `/admin` page (requires
  `pendingAction === 'update-available'`).
- `installFirstLaunch()` — the only action allowed to run automatically, and only
  when the service worker cache is confirmed empty (`pendingAction === 'first-install'`)
  **and** the user is authenticated.

All three read `AuthService.currentUser()` (read-only) and return `false` without
posting any message if the user is not authenticated or the pending action does
not match.

### Versioned, atomic activation

Application versions are activated atomically to avoid any offline window with a
partially-populated cache:

- Each version is cached under its own `app-assets-v-*` name; a small control
  cache (`app-assets-control`) stores the pointer to the currently `active`
  cache and keeps the `previous` one for rollback.
- A candidate version is only fully prepared (including a check that
  `/index.html` and every manifest asset are present) **before** the control
  pointer is switched — a single write, done only on full success.
- On failure before activation, only the incomplete candidate is discarded; the
  active version keeps serving the app unaffected.
- Fetch handling resolves a single, consistent version per request (active, or
  previous as fallback) — it never mixes assets from two versions.

### Asset List Generation

The service worker relies on a pre-generated list of assets to cache in order to download the correct assets when an update is available. This list is created during the build process using the `create_assets_list_for_service_worker.py` script.

#### Python Package Management

Python packages (mechaphlowers and dependencies) are managed by the `set_up_mechaphlowers.py` script, which:
- Automatically detects all dependencies (26 packages)
- Prefers CDN versions when available (14/26 from Pyodide CDN)
- Downloads remaining packages via pip (12/26)
- Optimizes wheels with Brotli/Gzip compression
- Stores packages locally in `public/pyodide/`

Run the setup script before building:
```bash
npm run set-up-mechaphlowers
```

#### Asset List Commands

`npm run build` runs it automatically after `ng build`. It can also be run manually:

- `npm run create-assets-list-for-service-worker` - Generates the asset list for the single Transloco build output in `dist/`

This command runs the Python script that:
1. Recursively scans the `dist/` build directory
2. Creates a list of all files (excluding blacklisted items like the service worker itself)
3. Includes Python packages from `public/pyodide/` (managed by `set_up_mechaphlowers.py`)
4. Generates version information including:
   - Git commit hash
   - Build timestamp
   - Application version from package.json
5. Writes the complete asset list to `assets_list.json`
