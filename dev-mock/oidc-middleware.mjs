/**
 * Dev OIDC mock middleware for @angular-builders/custom-esbuild dev server (v19+).
 *
 * Intercepts GET /auth/userinfo and returns OIDC claims from a local JSON file.
 * Reads `oidc-claims.json` if it exists, otherwise falls back to `oidc-claims.example.json`.
 *
 * Usage: referenced in angular.json `serve.options.middlewares`.
 *
 * To customise your dev claims, copy oidc-claims.example.json to oidc-claims.json
 * (gitignored) and edit it.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CLAIMS_FILE = resolve(__dirname, 'oidc-claims.json');
const EXAMPLE_FILE = resolve(__dirname, 'oidc-claims.example.json');

function loadClaims() {
  const file = existsSync(CLAIMS_FILE) ? CLAIMS_FILE : EXAMPLE_FILE;
  try {
    return JSON.parse(readFileSync(file, 'utf-8'));
  } catch (err) {
    console.warn('[oidc-mock] Failed to load claims file:', err);
    return {
      email: 'fallback@example.com',
      sub: 'sub-fallback',
      given_name: 'Fallback',
      family_name: 'User',
      roles: []
    };
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
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(claims));
    console.log('[oidc-mock] GET /auth/userinfo →', claims.email);
  } else {
    next();
  }
}
