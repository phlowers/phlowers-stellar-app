/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Vite Connect middleware that mocks an OIDC authentication server for local development.
 *
 * Provides:
 *   GET  /oidc/login    → Login form (email + display name)
 *   POST /oidc/callback → 302 redirect to app with identity as query params
 *
 * The Angular AuthService reads the query params, stores the user in IndexedDB,
 * and cleans the URL. No JWT, no localStorage, no cookies.
 */

/** HTML page served at /oidc/login */
function loginPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OIDC Mock Login – Stellar Dev</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5}
    .card{background:#fff;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.1);padding:2rem;width:360px}
    h1{font-size:1.25rem;margin-bottom:.25rem;color:#333}
    p.sub{font-size:.85rem;color:#888;margin-bottom:1.5rem}
    label{display:block;font-size:.875rem;font-weight:500;margin-bottom:.25rem;color:#555}
    input{width:100%;padding:.5rem .75rem;border:1px solid #ccc;border-radius:4px;font-size:.875rem;margin-bottom:1rem}
    input:focus{outline:none;border-color:#4f46e5;box-shadow:0 0 0 2px rgba(79,70,229,.15)}
    button{width:100%;padding:.625rem;background:#4f46e5;color:#fff;border:none;border-radius:4px;font-size:.875rem;font-weight:600;cursor:pointer}
    button:hover{background:#4338ca}
    button:disabled{background:#9ca3af;cursor:not-allowed}
    .badge{display:inline-block;background:#fef3c7;color:#92400e;font-size:.7rem;font-weight:600;padding:.15rem .5rem;border-radius:9999px;margin-bottom:1rem}
  </style>
</head>
<body>
  <form class="card" method="POST" action="/oidc/callback">
    <span class="badge">DEV MOCK OIDC</span>
    <h1>Sign in to Stellar</h1>
    <p class="sub">This login form only appears in development mode.</p>
    <label for="email">Email</label>
    <input id="email" name="email" type="email" required placeholder="dev@stellar.local" value="dev@stellar.local" />
    <label for="displayName">Display name</label>
    <input id="displayName" name="displayName" type="text" placeholder="Dev User" value="Dev User" />
    <button type="submit" id="submit-btn">Sign in</button>
  </form>
  <script>
    document.querySelector('.card').addEventListener('submit', function() {
      document.getElementById('submit-btn').disabled = true;
    });
  </script>
</body>
</html>`;
}

/**
 * Parse URL-encoded form body from a Connect/http IncomingMessage.
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<Record<string, string>>}
 */
function parseFormBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString();
      const params = new URLSearchParams(body);
      resolve(Object.fromEntries(params.entries()));
    });
    req.on('error', reject);
  });
}

/**
 * Connect middleware function for the OIDC mock.
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {() => void} next
 */
export default function oidcMockMiddleware(req, res, next) {
  if (req.url === '/oidc/login' && req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(loginPage());
    return;
  }

  if (req.url === '/oidc/callback' && req.method === 'POST') {
    parseFormBody(req).then((fields) => {
      const email = fields.email || 'dev@stellar.local';
      const displayName = fields.displayName || 'Dev User';

      // Redirect to app with identity as query params.
      // AuthService will read these, store in IndexedDB, and clean the URL.
      const params = new URLSearchParams({ oidc_email: email, oidc_name: displayName });
      res.writeHead(302, { Location: `/?${params.toString()}` });
      res.end();
    });
    return;
  }

  next();
}
