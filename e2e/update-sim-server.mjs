import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const PORT = Number(process.env.E2E_PORT || 4310);
const DIST_DIR = path.resolve(process.cwd(), process.env.E2E_DIST_DIR || 'dist/en');

if (!fs.existsSync(DIST_DIR)) {
  console.error(`[e2e-server] Dist directory does not exist: ${DIST_DIR}`);
  console.error('[e2e-server] Run "npm run build:en" before Playwright e2e tests.');
  process.exit(1);
}

const state = {
  scenario: 'v1'
};

const csvVersions = {
  v1: {
    cables: ['name,data_source,section,diameter', 'E2E_CABLE_V1,e2e,100,10'].join('\n')
  },
  v2: {
    cables: ['name,data_source,section,diameter', 'E2E_CABLE_V2,e2e,120,12'].join('\n')
  }
};

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
    if (relativePath.endsWith('.csv')) {
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
  const cablesCsv = csvVersions[scenario].cables;
  const files = [...staticFiles, scenario === 'v1' ? '/e2e-app-v1.js' : '/e2e-app-v2.js'];

  return {
    app_version: {
      git_hash: scenario === 'v1' ? 'e2e-hash-v1' : 'e2e-hash-v2',
      build_datetime_utc: scenario === 'v1' ? '2026-03-10T09:00:00.000000+00:00' : '2026-03-10T09:10:00.000000+00:00',
      version: scenario === 'v1' ? '1.0.0-e2e' : '2.0.0-e2e'
    },
    data_hashes: {
      'attachments.csv': readStaticCsvHash('attachments.csv'),
      'cables.csv': sha256(cablesCsv),
      'chains.csv': readStaticCsvHash('chains.csv'),
      'lines.csv': readStaticCsvHash('lines.csv'),
      'maintenance-teams.csv': readStaticCsvHash('maintenance-teams.csv'),
      'obstacle_type_rte.csv': readStaticCsvHash('obstacle_type_rte.csv')
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
      if (requestedScenario !== 'v1' && requestedScenario !== 'v2') {
        send(response, 400, 'Invalid scenario, expected v1 or v2');
        return;
      }
      state.scenario = requestedScenario;
      send(response, 200, JSON.stringify({ scenario: state.scenario }), 'application/json; charset=utf-8');
      return;
    }

    send(response, 200, JSON.stringify({ scenario: state.scenario }), 'application/json; charset=utf-8');
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
