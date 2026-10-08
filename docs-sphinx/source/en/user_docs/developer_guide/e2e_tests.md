# End-to-end tests

The end-to-end (e2e) tests check the application update flow in a real Chromium browser with
[Playwright](https://playwright.dev). They run against a production build served by a simulation
server, since the service worker is disabled under `ng serve`.

Sources: `e2e/` (specs, helpers and simulation server) and `playwright.config.ts`.

## Installation

`@playwright/test` is already a dev dependency. Install the project dependencies, then the
Chromium browser used by Playwright:

```shell
npm ci
npx playwright install chromium
```

## Build

The tests serve the `dist/` folder: build the application first (the service worker is recompiled
by the same command):

```shell
CI_COMMIT_SHA=$(git rev-parse HEAD) npm run build
```

`CI_COMMIT_SHA` is the version identity of the build. From a git checkout, `git rev-parse HEAD` is
used when it is not set; outside a git checkout, the build fails without it.

## Simulation server and scenarios

`e2e/update-sim-server.mjs` serves `dist/` on `http://127.0.0.1:4310` (`E2E_PORT` to change the
port, `E2E_DIST_DIR` to serve another folder). Playwright starts it automatically
(`webServer` in `playwright.config.ts`) and reuses an already running one outside CI. To start it
by hand:

```shell
npm run update:sim
```

The server rewrites the build identity (`git_hash`, `version`, build date) according to the
current scenario, set with `POST /__e2e/scenario?v=<scenario>`:

| Scenario | Content |
|---|---|
| `v1`, `v2`, `v3` | three distinct versions, each with its own cable catalog |
| `v2-broken` | one asset of the manifest answers 404 |
| `v2-badhash` | wrong catalog hash |
| `v1-rebuild` | same commit as `v1` rebuilt: same `git_hash`, new build date |
| `v2-slow` | 300 ms per file |
| `v2-big` | 30 MB file |

Faults (stalled file, transient 502, OIDC redirect, manifest that never answers...) are injected
with `POST /__e2e/faults`, `POST /__e2e/auth?authenticated=false` simulates an expired session and
`GET /__e2e/requests` lists the requested files. The full parameter list is in
[Application Update Process](app/application_update.md), "Testing locally" section.

## Running the tests

```shell
npm run e2e:update          # update flow: first install, popup, rollback, catalogs, offline
npm run e2e:update-faults   # failures: stopped service worker, stalled file, 502, same commit...
npm run e2e:headed          # every spec, with a visible browser
```

The tests run one at a time (`workers: 1`) with one retry; a trace is recorded on the first retry
(`npx playwright show-trace <trace.zip>` to open it).

## Adding a test

1. Add a `test()` to `e2e/update-flow.spec.ts` (nominal flow) or `e2e/update-faults.spec.ts`
   (failures), or create a new `e2e/*.spec.ts` file.
2. Reuse the helpers of `e2e/update-flow.helpers.ts`: `setScenario`, `setAuthenticated`,
   `waitForFirstInstall`, `readSnapshot` (active cache, `previous` cache, version, catalog),
   `setFaults` / `resetFaults` and `getRequestLog`.
3. Target UI elements through their `data-testid` (`page.getByTestId(...)`) or their ARIA role.
4. Reset the server state in `afterEach` (`resetFaults`, `setScenario(request, 'v1')`): the server
   is shared by every test.
5. A new scenario is declared in `e2e/update-sim-server.mjs`, in `SCENARIO_VERSIONS` (its
   `git_hash` must look like a commit SHA: 7 to 40 hexadecimal characters) and in `csvVersions`.
6. Rebuild (`npm run build`) whenever application code changed, then run the spec:
   `npx playwright test e2e/<file>.spec.ts`.
