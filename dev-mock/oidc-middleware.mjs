/**
 * Dev OIDC mock middleware for @angular-builders/custom-esbuild dev server (v19+).
 *
 * Intercepts GET /auth/userinfo and returns OIDC claims from a local JSON file.
 * Reads `oidc-claims.json` (gitignored) if it exists, otherwise returns 401.
 *
 * Usage: referenced in angular.json `serve.options.middlewares`.
 *
 * To set up your dev claims, copy oidc-claims.example.json to oidc-claims.json
 * and edit it with your own values.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CLAIMS_FILE = resolve(__dirname, 'oidc-claims.json');

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
    if (!claims) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify({ authenticated: false }));
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(claims));
    console.log('[oidc-mock] GET /auth/userinfo →', claims.email);
  } else {
    next();
  }
}
