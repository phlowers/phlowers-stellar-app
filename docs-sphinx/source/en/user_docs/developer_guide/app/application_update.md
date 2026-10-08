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

1. When a user navigates to the application, `UpdateService` fetches `/assets_list.json` and compares the `git_hash` (commit SHA) of the running build (baked into the JS at build time) with the `git_hash` of the server manifest. The build timestamp and `version` are display-only: rebuilding and redeploying the same commit (e.g. the daily dev deployment) does not trigger an update. A server manifest without a valid `git_hash` is ignored (no popup).

2. If the two differ, the application shows the update popup (`pendingAction === 'update-available'`).

3. The user accepts the popup, or clicks the "Update" button of the /admin page, to download the new version.

4. During the update process, the service worker:
   - Downloads the new assets into their own cache (the active version is never touched)
   - Writes `/app_version` last, which marks the cache as complete
   - Switches the activation pointer, keeps the previous version for rollback and deletes older caches
   - Sends `update_complete` to every open tab (for a first install, `install_complete` is only sent to the requesting tab)

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

- Each version is cached under its own `app-assets-v-<git_hash>` name; a small control
  cache (`app-assets-control`) stores the pointer to the currently `active`
  cache and keeps the `previous` one for rollback.
- A candidate version is only fully prepared (including a check that
  `/index.html` and every manifest asset are present) **before** the control
  pointer is switched — a single write, done only on full success.
- A cache is never written twice: a single install/update runs at a time, including across two Service Worker instances (Web Lock `app-assets-precache`); an already complete cache (`/app_version` marker) is reused without any download, or reported as already active; a file listed twice in the manifest is downloaded once. A download into an incomplete active cache is refused (`Refusing to precache into the active cache`), and a manifest without a valid `git_hash` is refused too. If the active cache no longer exists (deleted while `/control` still points to it), the version is reinstalled normally instead of being refused. An incomplete `previous` cache is deleted and rebuilt, never completed in place.
- On failure before activation, only the incomplete candidate is discarded; the
  active version keeps serving the app unaffected.
- Fetch handling resolves a single, consistent version per request (active, or
  previous as fallback) — it never mixes assets from two versions. The only exception is a
  content-hashed Angular file (`chunk-XXXXXXXX.js`, `*.css`) missing from the active cache:
  it is looked up in the `previous` cache before the network, so a tab still running the old
  version can load its lazy chunks.

### Download robustness (service worker)

- One install/update at a time: a request received during a run joins it. Every handler is
  passed to `event.waitUntil()` so the browser does not stop the service worker mid-download.
- The manifest (`/assets_list.json`) is fetched without following redirects and must answer
  within 13 s (headers and body); otherwise the update fails at once instead of staying at 0 %.
- 5 files are downloaded in parallel. A file fails when **no byte** (headers or body) arrives for
  30 s; a stalled file is not retried and the error names it.
- Network errors and 5xx are retried 3 times (1 s, 2 s, 4 s). 401, 403, redirects (expired OIDC
  session) and other 4xx are never retried: the error contains "authentication required" and the
  page asks the user to sign in again. A full storage quota (`QuotaExceededError`) is not retried
  either.
- Resume: a cache without the `/app_version` marker is a partial earlier attempt (e.g. the service
  worker was stopped); the files it already holds are not downloaded again.

### Page-side monitoring

While an update runs, `UpdateService`:

- Sends a `keepalive` message every 10 s. The service worker answers with a `progress` message
  (`run: null` when it has no update in progress, e.g. it was stopped and restarted by the browser).
  `progress` is also sent to every page each time the whole percentage of cached files changes; it
  feeds the progress bar (`updateProgress`, 0-100).
- Leaves the loading state at once on `run: null`, and after 45 s without any message from the
  service worker (`UPDATE_WATCHDOG_TIMEOUT_MS`, kept above the 30 s per-file timeout so the
  service worker reports its own error first). It then logs the error and shows "Update interrupted".
  The dialog shows its "Later" / "Update now" buttons again: it can be closed, or the update retried
  (the partial cache is resumed).
- Also leaves the loading state when the service worker keeps answering but no file is cached for
  180 s (`UPDATE_NO_PROGRESS_TIMEOUT_MS`, above the worst case of one file: 4 attempts x 30 s +
  retry delays). Keepalive answers restart the 45 s countdown, not this one.
- Gives up after 10 s when `navigator.serviceWorker.ready` never settles
  (`UPDATE_SW_READY_TIMEOUT_MS`), for an update as well as for the automatic first install.
- Notifies the user when the "Update now" button of the popup could not start the update
  (`AppComponent.onConfirmUpdate()`).

### Other open tabs

`update_complete` is sent to every open tab, once. The tab that started the update goes to `/`;
the other tabs reload in place, since they still run the old code. `install_complete` and errors
are only sent to the page that asked for them.

### Build identity

`scripts/set-env-variables.py` is the only generator of the build identity: the `git_hash`
(commit SHA, the version identity) and the UTC build time (display only). It injects them into the
JS and writes `dist/version.json`; `create_assets_list_for_service_worker.py` copies that file into
`assets_list.json`. The build fails when the git hash is not a commit SHA (`unknown`, empty...):
the build pipeline must provide `CI_COMMIT_SHA` with the built commit SHA, or build from a git
checkout.

### Logs

Every step of an update is logged, in the console only:

- `[UPDATE <runId>] <step> +<ms>ms` — emitted by the service worker (manifest, precache start,
  `progress` every 10 %, `file-retry` / `file-failed` with path, HTTP status, attempt and duration,
  activation, cleanup, `done` / `failed`) and relayed to the page console. All the lines of one
  update share the same `runId`.
- `[UPDATE page] ...` — emitted by the page (version check, refused actions, messages received,
  timeouts, interruptions).

Filter the page console on `[UPDATE`. The service worker's own console is available in
`chrome://serviceworker-internals` (or DevTools > Application > Service Workers > inspect). To find
where and why an update stopped, read the last `[UPDATE <runId>]` line: `file-failed` names the
file and the cause, a missing `done` / `failed` after `precache-start` means the service worker
stopped, and `[UPDATE page] update interrupted` gives the reason seen by the page.

### Testing locally

The service worker is disabled under `ng serve` (`!isDevMode()` in `src/main.ts`), so updates are
tested on a production build served by a simulation server:

```bash
npm run build
npm run update:sim   # serves dist/ on http://localhost:4310 (E2E_PORT to change it)
```

Open `http://localhost:4310`, then publish another version and reload the page:

```bash
curl -X POST "localhost:4310/__e2e/scenario?v=v2"
```

Scenarios: `v1`, `v2`, `v3`, `v2-broken` (one asset 404s), `v2-badhash` (wrong catalog hash),
`v1-rebuild` (same commit as `v1` rebuilt: same `git_hash`, new build date), `v2-slow` (300 ms per
file) and `v2-big` (30 MB file). Fault injection (`/__e2e/faults`, query string):

| Parameter | Effect |
|---|---|
| `latencyMs=N` | delay every app file by N ms |
| `stall=/path` | the file never answers (connection left open) |
| `stallManifest=true` | `/assets_list.json` never answers |
| `fail=/path&status=502&count=2` | the next `count` requests of the file fail with `status` |
| `redirectAfter=N` | answer 302 to `/auth/login` once more than N app files were requested |
| `reset=true` | remove every fault and clear the request log |

`GET /__e2e/requests` returns the app files requested since the last reset (to count re-downloads
on a retry), `POST /__e2e/auth?authenticated=false` simulates an expired session. To simulate the
service worker being stopped, click "Stop" in `chrome://serviceworker-internals` during the
update.

Automated tests (run `npm run build` first, the service worker is recompiled):

- `npm run e2e:update` — the update flow (first install, popup, rollback, catalogs, offline).
- `npm run e2e:update-faults` — the failures: service worker stopped mid-download, stalled file,
  transient 502, rebuild of the same commit (no popup), manifest that never answers, other tab
  reloaded, resume after a retry.

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
4. Generates version information, read from `dist/version.json` (written by `set-env-variables.py`), including:
   - Git commit hash (`git_hash`, the version identity)
   - Build timestamp
   - Application version from package.json
5. Writes the complete asset list to `assets_list.json`
