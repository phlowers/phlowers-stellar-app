import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { extractManifestSpan } from '../scripts/sw-manifest.mjs';

const PORT = Number(process.env.E2E_PORT || 4310);
// A single build output (no per-locale dist/en, dist/fr): translations are
// runtime Transloco JSON, not build-time Angular i18n splitting.
const DIST_DIR = path.resolve(process.cwd(), process.env.E2E_DIST_DIR || 'dist');

if (!fs.existsSync(DIST_DIR)) {
  console.error(`[e2e-server] Dist directory does not exist: ${DIST_DIR}`);
  console.error('[e2e-server] Run "npm run build" before Playwright e2e tests.');
  process.exit(1);
}

// Identity baked into the built JS by `npm run build`; rewritten per scenario when served.
const BUILT_VERSION = JSON.parse(fs.readFileSync(path.join(DIST_DIR, 'version.json'), 'utf8'));

function stampBuildIdentity(body, filePath) {
  if (!filePath.endsWith('.js')) {
    return body;
  }
  const text = body.toString('utf8');
  if (!text.includes(BUILT_VERSION.git_hash)) {
    return body;
  }
  const stamp = SCENARIO_VERSIONS[state.scenario];
  return Buffer.from(
    text
      .replaceAll(BUILT_VERSION.git_hash, stamp.git_hash)
      .replaceAll(BUILT_VERSION.build_datetime_utc, stamp.build_datetime_utc)
      .replaceAll(`"${BUILT_VERSION.version}"`, `"${stamp.version}"`)
  );
}

function emptyFaults() {
  return {
    // Delay applied before answering every app file request.
    latencyMs: 0,
    // Paths that never answer (connection left open).
    stallPaths: new Set(),
    // path -> { status, remaining }: fails the next `remaining` requests with `status`.
    failures: new Map(),
    // Answers 302 -> /auth/login once more than N app files were requested since reset.
    redirectAfter: null,
    appFileRequestCount: 0,
    // `/assets_list.json` never answers (connection left open).
    stallManifest: false,
    // Paths answered 200 with bytes that differ from the manifest (integrity must reject them).
    tamperedPaths: new Set(),
    // Status answered to every page navigation outside /auth/ (e.g. 401: Apache refusing a stale session).
    navigationStatus: null
  };
}

const state = {
  scenario: 'v1',
  // Simulates an authenticated test session for `/auth/userinfo` without any
  // change to production auth code (see update-plan.md, Step 6.3).
  authenticated: true,
  faults: emptyFaults(),
  // Every app file path requested since the last reset (used to count re-downloads).
  requestLog: [],
  // Downlink (Mbit/s) seen by the service worker network rule, see SW_NETWORK_PRELUDE.
  downlinkMbps: 10,
  // Script served at /service-worker.js: 'workbox' (built), 'legacy' (previous system stand-in) or 'kill-switch'.
  serviceWorkerMode: 'workbox'
};

const csvVersions = {
  v1: {
    cables: ['name,data_source,section,diameter', 'E2E_CABLE_V1,e2e,100,10'].join('\n')
  },
  v2: {
    cables: ['name,data_source,section,diameter', 'E2E_CABLE_V2,e2e,120,12'].join('\n')
  },
  v3: {
    cables: ['name,data_source,section,diameter', 'E2E_CABLE_V3,e2e,140,14'].join('\n')
  }
};
// Both scenarios reuse the v2 cable content: 'v2-broken' fails on an unrelated
// app asset, 'v2-badhash' deliberately declares a wrong data_hashes entry.
csvVersions['v2-broken'] = csvVersions.v2;
csvVersions['v2-badhash'] = csvVersions.v2;
csvVersions['v1-rebuild'] = csvVersions.v1;
csvVersions['v2-slow'] = csvVersions.v2;
csvVersions['v2-big'] = csvVersions.v2;

const VALID_SCENARIOS = new Set(Object.keys(csvVersions));

const BIG_FILE_PATH = '/e2e-big.bin';
const BIG_FILE_SIZE_BYTES = 30 * 1024 * 1024;

// Per-scenario application version stamp + which JS asset(s) the manifest lists.
// git_hash must look like a commit SHA: the app and the SW refuse any other identity.
const SCENARIO_VERSIONS = {
  v1: {
    git_hash: 'e2e0001',
    version: '1.0.0-e2e',
    build_datetime_utc: '2026-03-10T09:00:00.000000+00:00',
    asset: '/e2e-app-v1.js'
  },
  v2: {
    git_hash: 'e2e0002',
    version: '2.0.0-e2e',
    build_datetime_utc: '2026-03-10T09:10:00.000000+00:00',
    asset: '/e2e-app-v2.js'
  },
  v3: {
    git_hash: 'e2e0003',
    version: '3.0.0-e2e',
    build_datetime_utc: '2026-03-10T09:20:00.000000+00:00',
    asset: '/e2e-app-v3.js'
  },
  'v2-broken': {
    git_hash: 'e2e0b02',
    version: '2.0.0-e2e-broken',
    build_datetime_utc: '2026-03-10T09:30:00.000000+00:00',
    asset: '/e2e-app-v2.js',
    // Listed in `files` but intentionally 404s (see the request handler below) to
    // simulate a candidate asset failing precache before activation.
    extraFile: '/e2e-app-v2-broken.js'
  },
  'v2-badhash': {
    git_hash: 'e2e0ba2',
    version: '2.0.0-e2e-badhash',
    build_datetime_utc: '2026-03-10T09:40:00.000000+00:00',
    asset: '/e2e-app-v2.js'
  },
  // Same commit as v1 built again (e.g. the daily dev redeploy): only the build date differs.
  'v1-rebuild': {
    git_hash: 'e2e0001',
    version: '1.0.0-e2e',
    build_datetime_utc: '2026-03-11T09:00:00.000000+00:00',
    asset: '/e2e-app-v1.js'
  },
  'v2-slow': {
    git_hash: 'e2e05a2',
    version: '2.0.0-e2e-slow',
    build_datetime_utc: '2026-03-10T10:00:00.000000+00:00',
    asset: '/e2e-app-v2.js',
    // Default per-file latency, overridable by the faults endpoint.
    latencyMs: 300
  },
  'v2-big': {
    git_hash: 'e2e0b19',
    version: '2.0.0-e2e-big',
    build_datetime_utc: '2026-03-10T10:10:00.000000+00:00',
    asset: '/e2e-app-v2.js',
    extraFile: BIG_FILE_PATH
  }
};

// Mirrors CATALOG_DATA_FILENAMES in create_assets_list_for_service_worker.py:
// catalogs are described by data_hashes and must never appear in `files`.
const CATALOG_DATA_FILENAMES = new Set([
  'attachments.csv',
  'cables.csv',
  'chains.csv',
  'lines.csv',
  'maintenance-teams.csv',
  'obstacle_configuration.json'
]);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function readFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath);
}

function listFilesRecursively(baseDir) {
  const files = [];
  for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
    const fullPath = path.join(baseDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(fullPath));
      continue;
    }
    const relativePath = '/' + path.relative(DIST_DIR, fullPath).replaceAll(path.sep, '/');
    if (path.basename(relativePath) === 'service-worker.js') {
      continue;
    }
    if (path.basename(relativePath) === 'assets_list.json') {
      continue;
    }
    if (CATALOG_DATA_FILENAMES.has(path.basename(relativePath))) {
      continue;
    }
    files.push(relativePath);
  }
  return files.sort();
}

const staticFiles = listFilesRecursively(DIST_DIR);

function readStaticCsvHash(fileName) {
  const filePath = path.join(DIST_DIR, 'data', fileName);
  const content = readFileIfExists(filePath);
  if (!content) {
    return sha256('');
  }
  return sha256(content);
}

function currentManifest() {
  const scenario = state.scenario;
  const versionInfo = SCENARIO_VERSIONS[scenario];
  const cablesCsv = csvVersions[scenario].cables;
  const files = [...staticFiles, versionInfo.asset];
  if (versionInfo.extraFile) {
    files.push(versionInfo.extraFile);
  }

  // 'v2-badhash' deliberately declares a hash that does not match the served
  // content, to exercise the SHA-256 mismatch rejection (no partial promotion).
  const cablesHash =
    scenario === 'v2-badhash' ? sha256('TAMPERED_CONTENT_DOES_NOT_MATCH_SERVED_BYTES') : sha256(cablesCsv);

  return {
    app_version: {
      git_hash: versionInfo.git_hash,
      build_datetime_utc: versionInfo.build_datetime_utc,
      version: versionInfo.version
    },
    data_hashes: {
      'attachments.csv': readStaticCsvHash('attachments.csv'),
      'cables.csv': cablesHash,
      'chains.csv': readStaticCsvHash('chains.csv'),
      'lines.csv': readStaticCsvHash('lines.csv'),
      'maintenance-teams.csv': readStaticCsvHash('maintenance-teams.csv'),
      'obstacle_configuration.json': readStaticCsvHash('obstacle_configuration.json')
    },
    files
  };
}

function contentTypeFor(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.csv')) return 'text/csv; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.ico')) return 'image/x-icon';
  if (filePath.endsWith('.wasm')) return 'application/wasm';
  return 'application/octet-stream';
}

function send(response, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  response.writeHead(statusCode, {
    'content-type': contentType,
    'cache-control': 'no-store'
  });
  response.end(body);
}

function sendJson(response, body) {
  send(response, 200, JSON.stringify(body), 'application/json; charset=utf-8');
}

function describeFaults() {
  const { faults } = state;
  return {
    latencyMs: faults.latencyMs,
    stallPaths: [...faults.stallPaths],
    failures: Object.fromEntries(faults.failures),
    redirectAfter: faults.redirectAfter,
    appFileRequestCount: faults.appFileRequestCount,
    stallManifest: faults.stallManifest,
    tamperedPaths: [...faults.tamperedPaths],
    navigationStatus: faults.navigationStatus
  };
}

/** Only precached app files are subject to faults; manifest, auth and control routes never are. */
function isFaultTarget(request, pathname) {
  return (
    request.method === 'GET' &&
    (currentManifest().files.includes(pathname) || scenarioServiceWorker().urls.has(pathname))
  );
}

/** Applies injected faults to an app file request; calls `proceed` (possibly delayed) when none applies. */
function applyFaults(request, response, pathname, proceed) {
  const { faults } = state;
  faults.appFileRequestCount += 1;
  state.requestLog.push(pathname);

  if (faults.redirectAfter !== null && faults.appFileRequestCount > faults.redirectAfter) {
    response.writeHead(302, { location: '/auth/login', 'cache-control': 'no-store' });
    response.end();
    return;
  }
  if (faults.stallPaths.has(pathname)) {
    // Leave the connection open on purpose.
    return;
  }
  const failure = faults.failures.get(pathname);
  if (failure && failure.remaining > 0) {
    failure.remaining -= 1;
    send(response, failure.status, `Injected failure ${failure.status} for ${pathname}`);
    return;
  }
  if (faults.tamperedPaths.has(pathname)) {
    send(response, 200, `/* tampered ${pathname} */`, contentTypeFor(pathname));
    return;
  }
  const latencyMs = faults.latencyMs || SCENARIO_VERSIONS[state.scenario].latencyMs || 0;
  if (latencyMs > 0) {
    setTimeout(proceed, latencyMs);
    return;
  }
  proceed();
}

/** Handles `/__e2e/faults` (query-string driven so it can be called with plain curl). */
function handleFaultsRoute(request, response, requestUrl) {
  if (request.method !== 'POST') {
    sendJson(response, describeFaults());
    return;
  }
  const params = requestUrl.searchParams;
  if (params.get('reset') === 'true') {
    state.faults = emptyFaults();
    state.requestLog = [];
  }
  if (params.has('latencyMs')) {
    state.faults.latencyMs = Number(params.get('latencyMs'));
  }
  if (params.has('stall')) {
    state.faults.stallPaths.add(params.get('stall'));
  }
  if (params.has('fail')) {
    state.faults.failures.set(params.get('fail'), {
      status: Number(params.get('status') || 502),
      remaining: Number(params.get('count') || 1)
    });
  }
  if (params.has('redirectAfter')) {
    state.faults.redirectAfter = Number(params.get('redirectAfter'));
    state.faults.appFileRequestCount = 0;
  }
  if (params.has('stallManifest')) {
    state.faults.stallManifest = params.get('stallManifest') === 'true';
  }
  if (params.has('tamper')) {
    state.faults.tamperedPaths.add(params.get('tamper'));
  }
  if (params.has('navigationStatus')) {
    state.faults.navigationStatus = Number(params.get('navigationStatus'));
  }
  sendJson(response, describeFaults());
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url || '/', `http://127.0.0.1:${PORT}`);
  const pathname = requestUrl.pathname;

  if (pathname === '/__e2e/faults') {
    handleFaultsRoute(request, response, requestUrl);
    return;
  }

  // App file paths requested since the last faults reset (count re-downloads on a retry).
  if (pathname === '/__e2e/requests') {
    sendJson(response, state.requestLog);
    return;
  }

  if (pathname === '/__e2e/network') {
    if (request.method === 'POST') {
      const downlink = Number(requestUrl.searchParams.get('downlink'));
      if (!Number.isFinite(downlink) || downlink < 0) {
        send(response, 400, 'Invalid downlink, expected a number of Mbit/s');
        return;
      }
      state.downlinkMbps = downlink;
    }
    sendJson(response, { downlinkMbps: state.downlinkMbps });
    return;
  }

  if (pathname === '/__e2e/service-worker') {
    if (request.method === 'POST') {
      const mode = requestUrl.searchParams.get('mode');
      if (!SERVICE_WORKER_MODES.has(mode)) {
        send(response, 400, `Invalid mode, expected one of: ${[...SERVICE_WORKER_MODES].join(', ')}`);
        return;
      }
      state.serviceWorkerMode = mode;
    }
    sendJson(response, { mode: state.serviceWorkerMode });
    return;
  }

  if (pathname === '/service-worker.js') {
    send(response, 200, servedServiceWorkerCode(), 'application/javascript; charset=utf-8');
    return;
  }

  const isNavigation = request.headers['sec-fetch-mode'] === 'navigate';
  if (state.faults.navigationStatus !== null && isNavigation && !pathname.startsWith('/auth/')) {
    send(response, state.faults.navigationStatus, `Injected ${state.faults.navigationStatus} for ${pathname}`);
    return;
  }

  // Stand-in for Apache's recovery endpoint (clears the OIDC session, then signs in again).
  if (pathname === '/auth/relogin') {
    send(response, 200, 'E2E relogin');
    return;
  }

  // Catalog downloads are logged (with their ?v= version) but never subject to faults.
  if (pathname.startsWith('/data/')) {
    state.requestLog.push(pathname + requestUrl.search);
  }

  if (isFaultTarget(request, pathname)) {
    applyFaults(request, response, pathname, () => handleRequest(request, response, requestUrl));
    return;
  }

  handleRequest(request, response, requestUrl);
});

function handleRequest(request, response, requestUrl) {
  const pathname = requestUrl.pathname;

  if (pathname === '/__e2e/scenario') {
    if (request.method === 'POST') {
      const requestedScenario = requestUrl.searchParams.get('v');
      if (!VALID_SCENARIOS.has(requestedScenario)) {
        send(response, 400, `Invalid scenario, expected one of: ${[...VALID_SCENARIOS].join(', ')}`);
        return;
      }
      state.scenario = requestedScenario;
      send(response, 200, JSON.stringify({ scenario: state.scenario }), 'application/json; charset=utf-8');
      return;
    }

    send(response, 200, JSON.stringify({ scenario: state.scenario }), 'application/json; charset=utf-8');
    return;
  }

  // Simulated authenticated test session, toggled by Playwright without any
  // change to production auth code (Apache/mod_auth_openidc is not involved).
  if (pathname === '/__e2e/auth') {
    if (request.method === 'POST') {
      const requestedAuth = requestUrl.searchParams.get('authenticated');
      if (requestedAuth !== 'true' && requestedAuth !== 'false') {
        send(response, 400, 'Invalid authenticated flag, expected true or false');
        return;
      }
      state.authenticated = requestedAuth === 'true';
      send(response, 200, JSON.stringify({ authenticated: state.authenticated }), 'application/json; charset=utf-8');
      return;
    }

    send(response, 200, JSON.stringify({ authenticated: state.authenticated }), 'application/json; charset=utf-8');
    return;
  }

  // Mirrors the shape of Apache/mod_auth_openidc's `/auth/userinfo` CGI
  // endpoint (see auth.service.ts) in fallback mode (`oidcEnabled: false`).
  if (pathname === '/auth/userinfo') {
    const body = state.authenticated
      ? {
          authenticated: true,
          oidcEnabled: false,
          email: 'e2e-test@example.com',
          sub: 'e2e-sub-001',
          given_name: 'E2E',
          family_name: 'Tester',
          roles: ['admin']
        }
      : { authenticated: false, oidcEnabled: false };
    send(response, 200, JSON.stringify(body), 'application/json; charset=utf-8');
    return;
  }

  if (pathname === '/assets_list.json') {
    if (state.faults.stallManifest) {
      return;
    }
    send(response, 200, JSON.stringify(currentManifest()), 'application/json; charset=utf-8');
    return;
  }

  if (pathname === '/catalog-manifest.json') {
    const { app_version, data_hashes } = currentManifest();
    sendJson(response, { app_version, data_hashes });
    return;
  }

  if (pathname === '/version.json') {
    const { git_hash, version, build_datetime_utc } = SCENARIO_VERSIONS[state.scenario];
    sendJson(response, { git_hash, version, build_datetime_utc });
    return;
  }

  const resolved = resolveScenarioBody(pathname);
  if (resolved) {
    send(response, resolved.status, resolved.body, resolved.contentType);
    return;
  }

  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    send(response, 200, fs.readFileSync(indexPath), 'text/html; charset=utf-8');
    return;
  }

  send(response, 404, 'Not found');
}

/** Bytes served for `pathname` under the current scenario (null for an unknown path: SPA fallback). */
function resolveScenarioBody(pathname) {
  const scenarioAssets = { '/e2e-app-v1.js': 'v1', '/e2e-app-v2.js': 'v2', '/e2e-app-v3.js': 'v3' };
  if (scenarioAssets[pathname]) {
    const body = `window.__E2E_APP_ASSET_VERSION = "${scenarioAssets[pathname]}";\n`;
    return { status: 200, body: Buffer.from(body), contentType: 'application/javascript; charset=utf-8' };
  }

  if (pathname === BIG_FILE_PATH) {
    return { status: 200, body: Buffer.alloc(BIG_FILE_SIZE_BYTES, 1), contentType: 'application/octet-stream' };
  }

  // Always 404s: simulates a candidate asset failing to precache (e.g. a 502
  // during a rolling redeploy), listed only for the 'v2-broken' scenario.
  if (pathname === '/e2e-app-v2-broken.js') {
    return { status: 404, body: Buffer.from('Not found (intentionally broken for e2e)'), contentType: 'text/plain' };
  }

  if (pathname === '/data/cables.csv') {
    const csv = csvVersions[state.scenario].cables;
    return { status: 200, body: Buffer.from(csv), contentType: 'text/csv; charset=utf-8' };
  }

  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  // Ensure the path stays relative to DIST_DIR on POSIX and Windows.
  const normalized = path
    .normalize(requestedPath)
    .replace(/^\.+/, '')
    .replace(/^[/\\]+/, '');
  const filePath = path.join(DIST_DIR, normalized);

  if (filePath.startsWith(DIST_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return {
      status: 200,
      body: stampBuildIdentity(fs.readFileSync(filePath), filePath),
      contentType: contentTypeFor(filePath)
    };
  }
  return null;
}

const BUILT_SW_PATH = path.join(DIST_DIR, 'service-worker.js');
const BUILT_SW_CODE = fs.existsSync(BUILT_SW_PATH) ? fs.readFileSync(BUILT_SW_PATH, 'utf8') : null;
const BUILT_SW_SPAN = BUILT_SW_CODE ? extractManifestSpan(BUILT_SW_CODE) : null;

// E2E only: navigator.connection.downlink of the worker comes from /__e2e/network, read before each install and
// message event (the network rule reads it synchronously at the start of these handlers).
const SW_NETWORK_PRELUDE = `(() => {
  const network = { downlink: 10 };
  Object.defineProperty(self.navigator, 'connection', { configurable: true, get: () => ({ downlink: network.downlink }) });
  const refresh = () => fetch('/__e2e/network', { cache: 'no-store' }).then((r) => r.json()).then((v) => { network.downlink = v.downlinkMbps; }).catch(() => undefined);
  const addEventListener = self.addEventListener.bind(self);
  self.addEventListener = (type, listener, options) => {
    if (type !== 'install' && type !== 'message') return addEventListener(type, listener, options);
    return addEventListener(type, (event) => event.waitUntil(refresh().then(() => listener(event))), options);
  };
})();
`;

const scenarioServiceWorkers = new Map();

/**
 * The built service worker with its precache manifest recomputed on the bytes served for the current scenario
 * (JS is stamped per scenario, so the build-time integrity would not match), plus the scenario-specific assets.
 */
function scenarioServiceWorker() {
  const cached = scenarioServiceWorkers.get(state.scenario);
  if (cached) {
    return cached;
  }
  if (!BUILT_SW_SPAN) {
    return { code: '', urls: new Set() };
  }
  const versionInfo = SCENARIO_VERSIONS[state.scenario];
  const urls = [...BUILT_SW_SPAN.manifest.map((entry) => entry.url), versionInfo.asset];
  if (versionInfo.extraFile) {
    urls.push(versionInfo.extraFile);
  }
  const manifest = [...new Set(urls)].sort().map((url) => {
    const body = resolveScenarioBody(url)?.body ?? Buffer.alloc(0);
    return {
      integrity: `sha256-${crypto.createHash('sha256').update(body).digest('base64')}`,
      revision: crypto.createHash('md5').update(body).digest('hex'),
      sizeBytes: body.length,
      url
    };
  });
  const code =
    SW_NETWORK_PRELUDE +
    BUILT_SW_CODE.slice(0, BUILT_SW_SPAN.start) +
    JSON.stringify(manifest) +
    BUILT_SW_CODE.slice(BUILT_SW_SPAN.end);
  const result = { code, urls: new Set(manifest.map((entry) => entry.url)) };
  scenarioServiceWorkers.set(state.scenario, result);
  return result;
}

const KILL_SWITCH_CODE = fs.readFileSync(path.resolve(process.cwd(), 'ops/kill-switch/service-worker.js'), 'utf8');

// Stand-in for the previous update system's worker, with the traits that matter for the transition: skipWaiting at
// install, clients.claim at activation, app-assets-* cache names, navigations served from its cached shell.
const LEGACY_SERVICE_WORKER_CODE = `const VERSION_CACHE = 'app-assets-v-e2e0001';
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    await (await caches.open('app-assets-control')).put('/__control', new Response('{}'));
    await (await caches.open(VERSION_CACHE)).add('/index.html');
  })());
});
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(caches.match('/index.html', { cacheName: VERSION_CACHE }).then((cached) => cached || fetch(event.request)));
});
`;

const SERVICE_WORKER_MODES = new Set(['workbox', 'legacy', 'kill-switch']);

function servedServiceWorkerCode() {
  if (state.serviceWorkerMode === 'legacy') {
    return LEGACY_SERVICE_WORKER_CODE;
  }
  if (state.serviceWorkerMode === 'kill-switch') {
    return KILL_SWITCH_CODE;
  }
  return scenarioServiceWorker().code;
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[e2e-server] listening on http://127.0.0.1:${PORT}`);
});
