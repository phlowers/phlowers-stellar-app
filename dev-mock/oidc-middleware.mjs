/**
 * Dev OIDC mock middleware for @angular-builders/custom-esbuild dev server (v19+).
 *
 * Intercepts GET /auth/userinfo and returns OIDC claims from a local JSON file.
 * Reads `oidc-claims.json` (gitignored) if it exists, otherwise returns 401.
 * Also serves a generated GET /catalog-manifest.json (hashes of public/data) so that a fresh
 * database is populated by the catalog update flow; only `dist/` has a real manifest otherwise.
 *
 * Usage: referenced in angular.json `serve.options.middlewares`.
 *
 * To set up your dev claims, copy oidc-claims.example.json to oidc-claims.json
 * and edit it with your own values.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CLAIMS_FILE = resolve(__dirname, 'oidc-claims.json');
const CATALOG_DATA_DIR = resolve(__dirname, '..', 'public', 'data');

/**
 * Dev counterpart of `dist/catalog-manifest.json` (written by create_assets_list_for_service_worker.py):
 * SHA-256 of every CSV/JSON under public/data, computed on each request so edits are picked up.
 */
function buildCatalogManifest() {
  const dataHashes = {};
  for (const fileName of readdirSync(CATALOG_DATA_DIR).sort()) {
    if (fileName.endsWith('.csv') || fileName.endsWith('.json')) {
      dataHashes[fileName] = createHash('sha256')
        .update(readFileSync(resolve(CATALOG_DATA_DIR, fileName)))
        .digest('hex');
    }
  }
  return { data_hashes: dataHashes };
}

function loadClaims() {
  if (!existsSync(CLAIMS_FILE)) {
    console.warn(
      '[oidc-mock] No oidc-claims.json found, returning 401. Copy oidc-claims.example.json to oidc-claims.json and edit it.'
    );
    return null;
  }
  try {
    return JSON.parse(readFileSync(CLAIMS_FILE, 'utf-8'));
  } catch (err) {
    console.warn('[oidc-mock] Failed to load claims file:', err);
    return null;
  }
}

/**
 * Connect-compatible middleware for Angular 19+ Vite dev server.
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {() => void} next
 */
export default function (req, res, next) {
  if (req.method === 'GET' && req.url === '/auth/userinfo') {
    const claims = loadClaims();
    // Mode parity with production:
    //   oidc-claims.json present → simulates OIDC mode (oidcEnabled=true)
    //   oidc-claims.json absent  → simulates fallback mode (oidcEnabled=false)
    const oidcEnabled = claims !== null;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    if (!claims) {
      res.end(JSON.stringify({ authenticated: false, oidcEnabled }));
      return;
    }
    res.end(JSON.stringify({ authenticated: true, oidcEnabled, ...claims }));
    console.log('[oidc-mock] GET /auth/userinfo →', claims.email);
    return;
  }
  if (req.method === 'GET' && req.url === '/auth/login') {
    // Simulates the Apache /auth/login CGI 302 → / behaviour.
    res.statusCode = 302;
    res.setHeader('Location', '/');
    res.setHeader('Cache-Control', 'no-store');
    res.end();
    return;
  }
  if (req.method === 'GET' && req.url?.split('?')[0] === '/catalog-manifest.json') {
    try {
      const manifest = buildCatalogManifest();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(manifest));
    } catch (err) {
      console.warn('[oidc-mock] Failed to build catalog manifest:', err);
      res.statusCode = 500;
      res.end();
    }
    return;
  }
  next();
}
