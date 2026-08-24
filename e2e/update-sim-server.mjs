import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const PORT = Number(process.env.E2E_PORT || 4310);
// A single build output (no per-locale dist/en, dist/fr): translations are
// runtime Transloco JSON, not build-time Angular i18n splitting.
const DIST_DIR = path.resolve(process.cwd(), process.env.E2E_DIST_DIR || 'dist');

if (!fs.existsSync(DIST_DIR)) {
  console.error(`[e2e-server] Dist directory does not exist: ${DIST_DIR}`);
  console.error('[e2e-server] Run "npm run build" before Playwright e2e tests.');
  process.exit(1);
}

const state = {
  scenario: 'v1',
  // Simulates an authenticated test session for `/auth/userinfo` without any
  // change to production auth code (see update-plan.md, Step 6.3).
  authenticated: true
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

const VALID_SCENARIOS = new Set(['v1', 'v2', 'v3', 'v2-broken', 'v2-badhash']);

// Per-scenario application version stamp + which JS asset(s) the manifest lists.
const SCENARIO_VERSIONS = {
  v1: {
    git_hash: 'e2e-hash-v1',
    version: '1.0.0-e2e',
    build_datetime_utc: '2026-03-10T09:00:00.000000+00:00',
    asset: '/e2e-app-v1.js'
  },
  v2: {
    git_hash: 'e2e-hash-v2',
    version: '2.0.0-e2e',
    build_datetime_utc: '2026-03-10T09:10:00.000000+00:00',
    asset: '/e2e-app-v2.js'
  },
  v3: {
    git_hash: 'e2e-hash-v3',
    version: '3.0.0-e2e',
    build_datetime_utc: '2026-03-10T09:20:00.000000+00:00',
    asset: '/e2e-app-v3.js'
  },
  'v2-broken': {
    git_hash: 'e2e-hash-v2-broken',
    version: '2.0.0-e2e-broken',
    build_datetime_utc: '2026-03-10T09:30:00.000000+00:00',
    asset: '/e2e-app-v2.js',
    // Listed in `files` but intentionally 404s (see the request handler below) to
    // simulate a candidate asset failing precache before activation.
    extraFile: '/e2e-app-v2-broken.js'
  },
  'v2-badhash': {
    git_hash: 'e2e-hash-v2-badhash',
    version: '2.0.0-e2e-badhash',
    build_datetime_utc: '2026-03-10T09:40:00.000000+00:00',
    asset: '/e2e-app-v2.js'
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
  return 'application/octet-stream';
}

function send(response, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  response.writeHead(statusCode, {
    'content-type': contentType,
    'cache-control': 'no-store'
  });
  response.end(body);
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url || '/', `http://127.0.0.1:${PORT}`);
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
    send(response, 200, JSON.stringify(currentManifest()), 'application/json; charset=utf-8');
    return;
  }

  if (pathname === '/e2e-app-v1.js') {
    send(response, 200, 'window.__E2E_APP_ASSET_VERSION = "v1";\n', 'application/javascript; charset=utf-8');
    return;
  }

  if (pathname === '/e2e-app-v2.js') {
    send(response, 200, 'window.__E2E_APP_ASSET_VERSION = "v2";\n', 'application/javascript; charset=utf-8');
    return;
  }

  if (pathname === '/e2e-app-v3.js') {
    send(response, 200, 'window.__E2E_APP_ASSET_VERSION = "v3";\n', 'application/javascript; charset=utf-8');
    return;
  }

  // Always 404s: simulates a candidate asset failing to precache (e.g. a 502
  // during a rolling redeploy), listed in `files` only for the 'v2-broken' scenario.
  if (pathname === '/e2e-app-v2-broken.js') {
    send(response, 404, 'Not found (intentionally broken for e2e)');
    return;
  }

  if (pathname === '/data/cables.csv') {
    const csv = csvVersions[state.scenario].cables;
    send(response, 200, csv, 'text/csv; charset=utf-8');
    return;
  }

  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  // Ensure the path stays relative to DIST_DIR on POSIX and Windows.
  const normalized = path
    .normalize(requestedPath)
    .replace(/^\.+/, '')
    .replace(/^[/\\]+/, '');
  const filePath = path.join(DIST_DIR, normalized);

  if (filePath.startsWith(DIST_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const body = fs.readFileSync(filePath);
    send(response, 200, body, contentTypeFor(filePath));
    return;
  }

  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    send(response, 200, fs.readFileSync(indexPath), 'text/html; charset=utf-8');
    return;
  }

  send(response, 404, 'Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[e2e-server] listening on http://127.0.0.1:${PORT}`);
});
