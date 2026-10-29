// Verifies the precache manifest injected into dist/service-worker.js (see scripts/build-service-worker.mjs).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { extractManifestSpan } from './sw-manifest.mjs';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const SW_FILE = path.join(DIST_DIR, 'service-worker.js');
const PYTHON_PACKAGES = path.join(ROOT, 'src', 'app', 'core', 'services', 'worker_python', 'python-packages.json');

const REQUIRED_URLS = [
  '/index.html',
  '/pyodide/pyodide.asm.wasm',
  '/pyodide/python_stdlib.zip',
  '/pyodide/pyodide-lock.json'
];
const EXCLUDED_PATTERNS = [
  /^\/service-worker\.js$/,
  /^\/version\.json$/,
  /^\/assets_list\.json$/,
  /^\/catalog-manifest\.json$/,
  /^\/assets\/config\//,
  /^\/data\//,
  /^\/docs\//,
  /\.map$/
];

function main() {
  const errors = [];
  const { manifest } = extractManifestSpan(readFileSync(SW_FILE, 'utf8'));
  const urls = new Set(manifest.map((entry) => entry.url));

  const wheels = Object.values(JSON.parse(readFileSync(PYTHON_PACKAGES, 'utf8'))).map(
    (pkg) => `/pyodide/${pkg.file_name}`
  );
  for (const url of [...REQUIRED_URLS, ...wheels]) {
    if (!urls.has(url)) errors.push(`missing from the manifest: ${url}`);
  }
  for (const url of urls) {
    if (EXCLUDED_PATTERNS.some((pattern) => pattern.test(url))) errors.push(`must not be precached: ${url}`);
  }
  for (const entry of manifest) {
    const filePath = path.join(DIST_DIR, entry.url);
    if (!existsSync(filePath)) {
      errors.push(`listed but absent from dist/: ${entry.url}`);
      continue;
    }
    const integrity = `sha256-${createHash('sha256').update(readFileSync(filePath)).digest('base64')}`;
    if (entry.integrity !== integrity) errors.push(`integrity mismatch: ${entry.url}`);
    if (entry.sizeBytes !== statSync(filePath).size) errors.push(`size mismatch: ${entry.url}`);
    if (!entry.revision) errors.push(`missing revision: ${entry.url}`);
  }

  if (errors.length > 0) {
    errors.forEach((error) => console.error(`[check-sw-manifest] ${error}`));
    process.exit(1);
  }
  console.log(`[check-sw-manifest] OK: ${manifest.length} entries verified`);
}

main();
