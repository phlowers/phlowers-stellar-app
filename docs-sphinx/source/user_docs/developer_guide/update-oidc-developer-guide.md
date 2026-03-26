# Update flow & OIDC integration — Developer guide

## Overview

This document describes the application update architecture and the OIDC integration
implemented in the Stellar PWA. It covers how updates are detected, how tokens are
injected, and how to validate the integration without a live OIDC server.

---

## Architecture

### Responsibility split

| Layer | Responsibility |
|---|---|
| **Service Worker** | Cache serving, offline fallback, install/update execution on command |
| **Angular (`AppUpdateOrchestratorService`)** | Version detection, user consent flow, OIDC-aware manifest fetch |
| **Angular (`oidcTokenInterceptor`)** | Bearer token injection for protected HTTP requests |
| **AppComponent** | Wiring startup flow, showing consent dialog, calling orchestrator |

### Why the Service Worker does not own updates

The Service Worker runs in an isolated context with no access to the DOM, Angular
dependency injection, or `localStorage`. It therefore cannot participate in an OIDC
token flow. The Angular main thread — which has access to all three — owns the
version decision.

### Why `HttpClient` is required for the manifest

The `/assets_list.json` manifest is the only network request that must carry an OIDC
Bearer token. Using Angular's `HttpClient` is the only way to intercept that request
and inject the token automatically. A raw `fetch()` inside the Service Worker cannot
do this, which is why the previous architecture was incompatible with Apache OIDC.

---

## Startup update flow

```
App boots
  └─ AppComponent.ngOnInit()
       └─ setupWorker()
  └─ storageReady$ signal becomes true
       └─ AppComponent effect fires
            ├─ userService.getUser() → show login dialog if needed
            ├─ setupData()
            │    ├─ captureProtectedDataSnapshot()     ← count users + studies
            │    ├─ fetchLatestManifestSafe()           ← HttpClient → interceptor injects token
            │    ├─ for each CSV: compare hash → import if changed
            │    └─ assertProtectedDataSnapshot()       ← verify users + studies unchanged
            └─ appUpdateOrchestratorService.initiateStartupCheck()
                 ├─ if already checked this session → return (single-check-per-boot)
                 ├─ GET /assets_list.json (via HttpClient + interceptor)
                 ├─ compare server version vs cached version
                 ├─ if different → updateService.needUpdate$.next(true)
                 │     └─ AppComponent shows update dialog
                 │          ├─ user clicks "Update now"
                 │          │    └─ AppComponent.onUpdateClick()
                 │          │         └─ orchestrator.acceptUpdate()
                 │          │              └─ SW.postMessage({ type: 'update' })
                 │          │                   └─ SW fetches manifest, updates cache
                 │          │                        └─ SW posts update_complete
                 │          │                             └─ UpdateService → location.reload()
                 │          └─ user clicks "Later"
                 │               └─ dialog closes, app stays on current version
                 └─ if same version → no dialog
```

---

## OIDC token integration

### Token source

The token is read from `localStorage` under the key `oidc_token`.

```typescript
// src/app/core/interceptors/oidc-token.interceptor.ts
const OIDC_TOKEN_KEY = 'oidc_token';
```

This key is expected to be set by the Apache OIDC module or by the post-login flow
before the Angular application initializes.

### Interceptor behavior

The interceptor `oidcTokenInterceptor` is a functional Angular 19 interceptor
registered in `app.config.ts`:

```typescript
provideHttpClient(withFetch(), withInterceptors([oidcTokenInterceptor]))
```

It intercepts only requests to protected paths:

```typescript
const PROTECTED_PATHS = ['/assets_list.json'];
```

When a protected request is detected and a token is present:

```typescript
req = req.clone({
  setHeaders: { Authorization: `Bearer ${token}` }
});
```

When no token is present, the request proceeds unchanged — this preserves the offline
and unauthenticated fallback path.

### Token format normalization

The token may be stored as a raw value or with a `Bearer ` prefix. The interceptor
normalizes it:

```typescript
if (tokenValue.startsWith('Bearer ')) {
  return tokenValue.substring(7);
}
return tokenValue;
```

### Failure handling

If `localStorage` throws (e.g. private browsing mode with storage blocked), the
interceptor logs a warning and continues without injecting a token:

```typescript
} catch (error) {
  console.warn('OIDC INTERCEPTOR: Could not read token from localStorage:', error);
  return null;
}
```

---

## Testing without a live OIDC server

Because the OIDC integration is limited to token injection into a standard
`Authorization` header, the application can be validated at multiple levels without
a real identity provider.

### Level 1 — Unit tests (already in place)

The file `src/app/core/interceptors/oidc-token.interceptor.spec.ts` already covers:

| Case | What is tested |
|---|---|
| Token present in `localStorage` | `Authorization: Bearer <token>` header added to request |
| Token stored with `Bearer ` prefix | Prefix stripped, correct header emitted |
| No token | Request forwarded unchanged, no `Authorization` header |
| Non-protected path | No token injected even if token is present |
| `localStorage` throws | Request forwarded, no crash |
| Original request not mutated | Token added only to the cloned request |

Run with:

```bash
npx vitest run src/app/core/interceptors/oidc-token.interceptor.spec.ts
```

### Level 2 — Manual browser test (no server change needed)

This validates that the interceptor is wired correctly end-to-end in the running
application:

1. Start the development server: `npm run start`
2. Open the browser DevTools → Application → Local Storage
3. Set the token manually:
   ```js
   localStorage.setItem('oidc_token', 'fake-dev-token')
   ```
4. Hard-reload the page (Ctrl+Shift+R)
5. Open DevTools → Network
6. Find the request to `/assets_list.json`
7. Inspect the **Request Headers**

Expected result with token set:
```
Authorization: Bearer fake-dev-token
```

Expected result without token:
```
(no Authorization header)
```

To remove the token:
```js
localStorage.removeItem('oidc_token')
```

The application must not crash or block startup in either case.

### Level 3 — Simulated protected server (strongest local test)

This validates the full contract: the server enforces authentication, the app supplies
the correct token, and degrades cleanly when the token is absent.

Extend `e2e/update-sim-server.mjs` to require an `Authorization` header on
`/assets_list.json`:

```js
if (pathname === '/assets_list.json') {
  if (state.requireAuth) {
    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      send(response, 401, JSON.stringify({ error: 'Unauthorized' }), 'application/json');
      return;
    }
  }
  state.manifestFetchCount++;
  send(response, 200, JSON.stringify(currentManifest()), 'application/json; charset=utf-8');
  return;
}
```

Add a control endpoint to toggle auth requirement:
```js
if (pathname === '/__e2e/require-auth' && request.method === 'POST') {
  state.requireAuth = requestUrl.searchParams.get('enabled') === 'true';
  send(response, 200, JSON.stringify({ requireAuth: state.requireAuth }));
  return;
}
```

Scenarios to validate:

| Scenario | Token in `localStorage` | Server auth required | Expected result |
|---|---|---|---|
| S1 — Normal authenticated update | `fake-token` | yes | Dialog shows, update completes |
| S2 — No token, unprotected server | (none) | no | Dialog shows, update completes |
| S3 — No token, protected server | (none) | yes | Server returns `401`, app continues without update (graceful degradation) |
| S4 — Expired/invalid token, protected server | `bad-token` | yes | Server returns `401` or `403`, app continues without update |

### Level 4 — Real Apache OIDC (future)

When the Apache OIDC module is available:

1. The module will set the session cookie and expose the token to the front-end.
2. The Angular login flow or post-redirect handler must write the token to
   `localStorage.setItem('oidc_token', ...)` after successful authentication.
3. Verify that `localStorage.oidc_token` is populated before the app bootstraps.
4. Run manual browser test (Level 2) to confirm the header is present.
5. Run the Playwright E2E suite: `npm run e2e:update`

---

## Files involved

| File | Role |
|---|---|
| `src/app/core/interceptors/oidc-token.interceptor.ts` | Bearer token injection |
| `src/app/core/interceptors/oidc-token.interceptor.spec.ts` | Unit tests for the interceptor |
| `src/app/core/services/worker_update/app-update-orchestrator.service.ts` | Startup version check, user acceptance |
| `src/app/core/services/worker_update/app-update-orchestrator.service.spec.ts` | Unit tests for the orchestrator |
| `src/app/core/services/worker_update/worker_update.service.ts` | Version signals, SW messaging, HttpClient manifest fetch |
| `src/app/core/services/worker_update/service-worker.ts` | Cache install and update execution |
| `src/app/app.component.ts` | Startup wiring, dialog, catalog sync, data safety |
| `src/app/app.component.html` | Update dialog UI (`data-testid="update-dialog"`) |
| `src/app/app.config.ts` | Interceptor registration |
| `e2e/update-flow.spec.ts` | Playwright E2E update scenarios |
| `e2e/update-sim-server.mjs` | Local simulation server for E2E |
| `scripts/create_assets_list_for_service_worker.py` | Build manifest generator |

---

## Key invariants

- **One manifest fetch per boot.** `startupCheckCompleted` is set to `true` after the
  first check and the orchestrator skips all subsequent calls in the same session.
- **Token injection is optional.** If no token is available the app functions normally
  in offline or unauthenticated mode.
- **User data is never mutated during catalog sync.** `captureProtectedDataSnapshot()`
  and `assertProtectedDataSnapshot()` enforce this at runtime.
- **The Service Worker never fetches the manifest autonomously** after the initial
  install. All manifest access in the update path goes through Angular.

---

## Console log reference

These log lines can be observed in the browser DevTools console to trace the flow:

| Log message | Where |
|---|---|
| `OIDC INTERCEPTOR: Token injected for /assets_list.json` | Token found and injected |
| `OIDC INTERCEPTOR: No token available for /assets_list.json` | No token, proceeding without auth |
| `ORCHESTRATOR: Starting single startup version check` | Startup check begins |
| `ORCHESTRATOR: New version available, triggering update dialog` | Version mismatch found |
| `ORCHESTRATOR: Application is up to date` | Versions match, no dialog |
| `ORCHESTRATOR: User accepted update, posting update message to Service Worker` | User clicked "Update now" |
| `ORCHESTRATOR: Startup check already completed, skipping` | Second call in same session, no-op |
| `SERVICE WORKER: Update requested` | SW received the update command |
| `SERVICE WORKER: Update complete (version …)` | SW finished updating cache |
