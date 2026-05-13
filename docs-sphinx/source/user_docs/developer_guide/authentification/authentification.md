# Authentication mechanism — phlowers-stellar-app

The application **does not embed any client-side OIDC library** (no `angular-auth-oidc-client`, no `oidc-client-ts`, etc.). All OAuth/OIDC complexity is delegated to **Apache `mod_auth_openidc`** on the server side. Angular acts only as a thin client that:

1. **Probes the server** to discover which authentication mode is active.
2. **Reads pre-authenticated claims** from a CGI endpoint.
3. **Caches the user in IndexedDB** to keep working offline.
4. **Forces a top-level redirect** to G@IA when an OIDC sign-in prompt is needed.

---

## 1. Overall architecture

```
┌──────────┐   1. GET /auth/userinfo  ┌────────┐  (no session)   ┌─────┐
│ Browser  │ ───────────────────────► │ Apache │ ──────────────► │ IdP │
│ (Angular)│                          │ mod_   │                 │G@IA │
│          │ ◄─────────────────────── │ auth_  │ ◄────────────── │     │
│          │  { authenticated, oidcEnabled,   │   Auth Code      └─────┘
│          │     email?, sub?, given_name?,   │   + PKCE (S256)
│          │     family_name?, roles?,        │
│          │     rte_group? }                 │
│          │                          │ openidc│
│          │   2. GET /auth/login     │        │
│          │   (top-level navigation) │        │
│          │ ───────────────────────► │        │ → G@IA prompt
│          │ ◄─────────────────────── │        │ → callback → 302 "/"
│          │   Set-Cookie HTTP-only   │        │
│          │                          └────────┘
│ IndexedDB│  ← cached User (offline-first)
└──────────┘
```

- Apache enforces OIDC sign-in (Authorization Code + PKCE S256) and stores tokens in **HTTP-only cookies** invisible to JS.
- Apache exposes two CGI endpoints:
  - `/auth/userinfo` — returns the current session state and OIDC claims as JSON. Always responds with `200 OK` (even when unauthenticated) to avoid noisy console errors and to advertise the server-side mode.
  - `/auth/login` — dedicated entry point that triggers the G@IA prompt and 302-redirects to `/` once authenticated.
- Angular reads `/auth/userinfo`, persists the user in IndexedDB (Dexie) and exposes a `signal<User | null>`.

---

## 2. Key files

| Role | File |
|---|---|
| Main service | [src/app/core/services/auth/auth.service.ts](src/app/core/services/auth/auth.service.ts) |
| Constants (`USERINFO_URL`, `LOGIN_URL`) | [src/app/core/services/auth/auth.constants.ts](src/app/core/services/auth/auth.constants.ts) |
| Claims interface | [src/app/core/services/auth/oidc-claims.interface.ts](src/app/core/services/auth/oidc-claims.interface.ts) |
| Route guard | [src/app/core/guards/auth.guard.ts](src/app/core/guards/auth.guard.ts) |
| Login page | [src/app/features/auth/presentation/pages/login-page/login-page.component.ts](src/app/features/auth/presentation/pages/login-page/login-page.component.ts) |
| User model | [src/app/shared/domain/models/user.model.ts](src/app/shared/domain/models/user.model.ts) |
| Bootstrap | [src/app/app.config.ts](src/app/app.config.ts) |
| Protected routes | [src/app/app.routes.ts](src/app/app.routes.ts) |
| User display | [src/app/shared/components/layout/topbar/topbar.component.ts](src/app/shared/components/layout/topbar/topbar.component.ts) |
| Service Worker bypass | [src/app/core/services/worker_update/service-worker.ts](src/app/core/services/worker_update/service-worker.ts) |
| Apache OIDC config | [httpd-oidc.conf.template](httpd-oidc.conf.template) |
| `userinfo` CGI | [docker/cgi-bin/userinfo.sh](docker/cgi-bin/userinfo.sh) |
| `login` CGI | [docker/cgi-bin/login.sh](docker/cgi-bin/login.sh) |
| Dev mock | [stellar/dev-mock/oidc-middleware.mjs](stellar/dev-mock/oidc-middleware.mjs) · [stellar/dev-mock/oidc-claims.example.json](stellar/dev-mock/oidc-claims.example.json) |

---

## 3. Two mutually exclusive modes

The mode is decided **server-side** and discovered by the SPA through `/auth/userinfo`.

| Mode | `oidcEnabled` | Server | Email fallback form | Sign-in path |
|---|---|---|---|---|
| **OIDC mode** | `true` | Apache + `mod_auth_openidc` | Forbidden | Top-level navigation to `/auth/login` → G@IA prompt |
| **Fallback mode** | `false` | Plain dev server / Apache without OIDC | Allowed | Local `loginWithEmail()` (no password) |

Defence in depth: a user document cached in fallback mode (no `sub` claim) is **rejected** if the server later reports OIDC mode.

---

## 4. End-to-end flow

### 4.1 App startup (`provideAppInitializer`)

The enforced sequence in [app.config.ts](src/app/app.config.ts) is:

1. `storageService.setPersistentStorage()`
2. `storageService.createDatabase()`
3. **`authService.initialize()`** ← the auth entry point
4. `updateService.checkForUpdateOnce()`

### 4.2 `AuthService.initialize()` — probe-first then cache

1. **Probe `/auth/userinfo`** (`probeUserinfo()`):
   - Updates the `oidcEnabled` and `modeResolved` signals.
   - On success with `authenticated: true` → returns the OIDC claims.
2. **Active OIDC session** → upsert the user, set `currentUser`, done.
3. **No session** → load the cached user from IndexedDB.
   - In OIDC mode (or when the probe failed and the mode is unknown), a cached user **without `sub`** is ignored (it would be a stale email-only user).
   - Otherwise → restore the cached user.

Defaults until the first probe completes: `oidcEnabled = true`, `modeResolved = false`. Strict by default so the email form is never displayed before the server contract is known.

### 4.3 `probeUserinfo()` — server contract

`fetch('/auth/userinfo', { cache: 'no-store' })` — handled cases:

| Outcome | `oidcEnabled` signal | `modeResolved` | Returned claims |
|---|---|---|---|
| Network error | unchanged (default `true`) | `true` | `null` |
| HTTP `401` (legacy) | `true` | `true` | `null` |
| Non-OK HTTP status | unchanged | `true` | `null` |
| Invalid JSON | unchanged | `true` | `null` |
| `{ authenticated: false, oidcEnabled }` | from response | `true` | `null` |
| `{ authenticated: true, oidcEnabled, email, … }` | from response | `true` | claims |
| Missing/blank `email` | from response | `true` | `null` (logged warning) |

### 4.4 `refreshFromNetwork()`

Public method that re-runs the probe and upserts the user when claims are returned. Available to force a fresh check (not currently called by the initializer).

### 4.5 Route guard

[auth.guard.ts](src/app/core/guards/auth.guard.ts):

1. If `currentUser()` is non-null → allow.
2. Otherwise call `tryRestoreFromCache()`:
   - Loads the first cached user.
   - In OIDC mode, rejects email-only cached users (no `sub`).
   - On success, sets `currentUser` and allows.
3. Otherwise → redirects to `/login`.

All children of `LoggedLayoutComponent` carry `canActivate: [authGuard]` ([app.routes.ts](src/app/app.routes.ts)).

### 4.6 `/login` page

[login-page.component.ts](src/app/features/auth/presentation/pages/login-page/login-page.component.ts) renders one of three states based on `AuthService` signals:

| State | Condition | UI |
|---|---|---|
| Resolving | `!modeResolved()` | Spinner / "checking sign-in mode" message |
| OIDC redirect | `modeResolved() && oidcEnabled()` | An `effect()` calls `redirectToOidcLogin()` → `globalThis.location.assign('/auth/login')`. The form is **never** rendered. |
| Email fallback | `modeResolved() && !oidcEnabled()` | Reactive `email` form. `onSubmit()` → `authService.loginWithEmail(email)` → navigate to `/`. |

`loginWithEmail()` itself throws if called while `oidcEnabled() === true` (defence in depth — the UI also hides the form).

---

## 5. Storage and model

```typescript
// oidc-claims.interface.ts
interface OidcClaims {
  email: string;        // mandatory — primary key
  sub?: string;         // unique IdP identifier (presence == "real OIDC user")
  given_name?: string;
  family_name?: string;
  roles?: string[];
}
```

Dexie schema: `users: '&email, sub'` (primary key = `email`, secondary index = `sub`).

`upsertUser(claims)` preserves the existing `uuid` and `studies` fields when overwriting. Users are **never deleted** (deliberate policy: studies remain attached to their owner).

> Note: the CGI also returns `rte_group`, which is currently not part of `OidcClaims` and is therefore not persisted by the SPA.

---

## 6. Tokens, refresh, logout

| Aspect | Where it is handled |
|---|---|
| Access / refresh tokens | **Apache only**, in HTTP-only cookies — JS has no access |
| Silent refresh | Apache (`OIDCRefreshAccessTokenBeforeExpiry 300`). Angular only re-probes `/auth/userinfo` |
| Expiration detection | `/auth/userinfo` → `{ authenticated: false }` (or HTTP `401` for legacy servers) |
| `Authorization` header | **No HTTP interceptor** — everything flows through cookies |
| Logout | **No Angular method, no UI button** — by design (`connexion-gaia.md` §2). Session lifetime is enforced by Apache (`OIDCSessionInactivityTimeout 28800`, `OIDCSessionMaxDuration 604800`). |

---

## 7. Server-side configuration

### 7.1 Apache directives ([httpd-oidc.conf.template](httpd-oidc.conf.template))

- `OIDCResponseType code` + `OIDCPKCEMethod S256`
- `OIDCSessionType server-cache`, inactivity 8h, max duration 7d
- `OIDCPassClaimsAs environment` — claims surfaced as `OIDC_CLAIM_*` env vars to CGIs
- `OIDCCookieSameSite Lax`, `OIDCCookieHTTPOnly On`, cookies forced to `Secure`
- `OIDCSSLValidateServer On`, `OIDCRefreshAccessTokenBeforeExpiry 300`
- `<Location />` → `Require valid-user` (whole app protected)
- `<Location /auth/userinfo>` → `OIDCUnAuthAction pass` so the CGI can answer `{ authenticated: false }` instead of returning `401`
- `<Location /auth/login>` → **no** `OIDCUnAuthAction pass`, so unauthenticated requests trigger the G@IA redirect

### 7.2 CGI scripts

- [docker/cgi-bin/userinfo.sh](docker/cgi-bin/userinfo.sh) — always returns `200 OK` with `{ authenticated, oidcEnabled, … }`. The `oidcEnabled` flag comes from the `OIDC_ENABLED` env var injected by the entrypoint. Claims are JSON-encoded with `jq` (no string interpolation, no injection risk).
- [docker/cgi-bin/login.sh](docker/cgi-bin/login.sh) — runs only after a successful G@IA callback; emits `302 Location: /`. Returning here (instead of directly to `/`) guarantees a known landing URL that the Service Worker bypasses.

---

## 8. PWA / Service Worker interactions

[service-worker.ts](src/app/core/services/worker_update/service-worker.ts) enforces three rules critical to authentication correctness:

1. **Full bypass of `/auth/*`** — passes the request straight to `fetch(event.request)` with no read/write to the cache. Otherwise the SW could serve a stale `userinfo` response and hide a session expiration.
2. **3xx responses are never cached** — preserves Apache's redirects to G@IA.
3. **Network-first for navigation/HTML** — the home page must reach Apache so its 302 to the IdP is actually performed.

---

## 9. Dev OIDC mock

[stellar/dev-mock/oidc-middleware.mjs](stellar/dev-mock/oidc-middleware.mjs) is wired through `angular.json` (`serve.options.middlewares`) and emulates the production contract:

- `GET /auth/userinfo`:
  - If `dev-mock/oidc-claims.json` exists → `{ authenticated: true, oidcEnabled: true, …claims }` (simulates **OIDC mode**).
  - If absent → `{ authenticated: false, oidcEnabled: false }` (simulates **fallback mode**, the email form is shown).
- `GET /auth/login` → `302 Location: /` (mirrors the Apache CGI).

Enable a dev OIDC user:

```bash
cp stellar/dev-mock/oidc-claims.example.json stellar/dev-mock/oidc-claims.json
npm start
```

---

## 10. What is intentionally absent

- ❌ No client-side OIDC library, no PKCE handling in Angular.
- ❌ No `HttpInterceptor` injecting a Bearer token.
- ❌ No OIDC environment variables in Angular (`clientId`, `redirectUri`, scopes…). All OIDC config lives in Apache.
- ❌ No `/.well-known/openid-configuration` consumed on the front.
- ❌ No logout button or route in the UI (deliberate — see `connexion-gaia.md`).
- ❌ No client-side token storage (`localStorage`, `sessionStorage`, in-memory tokens).
- ❌ No automatic deletion of cached users (the table preserves attached studies).

---

## 11. One-sentence summary

> Apache handles all of OIDC (PKCE, tokens, cookies, refresh, redirects). Angular **probes `/auth/userinfo`** to discover the server-side mode, **caches OIDC claims in IndexedDB** for offline use, exposes `currentUser` / `oidcEnabled` / `modeResolved` signals, redirects the browser to **`/auth/login`** when an OIDC prompt is required, and offers a **degraded email login** only when the server reports `oidcEnabled: false`.
