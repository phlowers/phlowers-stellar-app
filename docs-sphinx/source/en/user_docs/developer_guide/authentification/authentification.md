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
- Apache exposes three relevant endpoints:
  - `/auth/userinfo` — returns the current session state and OIDC claims as JSON. Always responds with `200 OK` (even when unauthenticated) to avoid noisy console errors and to advertise the server-side mode.
  - `/auth/login` — dedicated entry point that triggers the G@IA prompt and 302-redirects to `/` once authenticated.
  - `/auth/relogin` — last-resort recovery endpoint: clears the local `mod_auth_openidc` session cookie, then chains to `/auth/login`. Invoked only by the Service Worker (401/403 navigation with no cached shell) and by `reconnecting.html`.
- Angular reads `/auth/userinfo`, persists the user in IndexedDB (Dexie) and exposes a `signal<User | null>`.
- A same-origin HTTP interceptor (`authSessionInterceptor`) and the Service Worker both detect proven `401`/`403` session mismatches on live requests/navigations and trigger an automatic redirect to `/auth/login` (via `AuthResyncService`, rate-limited) — see §4.6.

---

## 2. Key files

| Role | File |
|---|---|
| Main service | [src/app/core/services/auth/auth.service.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/auth/auth.service.ts) |
| Constants | [src/app/core/services/auth/auth.constants.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/auth/auth.constants.ts) |
| Claims interface | [src/app/core/services/auth/oidc-claims.interface.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/auth/oidc-claims.interface.ts) |
| Session resync (redirect cooldown/suppression) | [src/app/core/services/auth/auth-resync.service.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/auth/auth-resync.service.ts) · [auth-resync.constantes.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/auth/auth-resync.constantes.ts) · [auth-resync.helpers.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/auth/auth-resync.helpers.ts) |
| Session mismatch HTTP interceptor | [src/app/core/services/auth/auth-session.interceptor.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/auth/auth-session.interceptor.ts) |
| Route guard | [src/app/core/guards/auth.guard.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/guards/auth.guard.ts) |
| Fallback login page | [src/app/features/auth/presentation/pages/login-page/login-page.component.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/features/auth/presentation/pages/login-page/login-page.component.ts) |
| User model | [src/app/shared/domain/models/user.model.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/shared/domain/models/user.model.ts) |
| Bootstrap | [src/app/app.config.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/app.config.ts) |
| Protected routes | [src/app/app.routes.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/app.routes.ts) |
| User display | [src/app/shared/components/layout/topbar/topbar.component.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/shared/components/layout/topbar/topbar.component.ts) |
| Service worker bypass | [src/app/core/services/worker_update/service-worker.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/worker_update/service-worker.ts) |
| Dev mock | [dev-mock/oidc-middleware.mjs](https://github.com/phlowers/phlowers-stellar-app/blob/main/dev-mock/oidc-middleware.mjs) · [dev-mock/oidc-claims.example.json](https://github.com/phlowers/phlowers-stellar-app/blob/main/dev-mock/oidc-claims.example.json) |

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

[app.config.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/app.config.ts) runs two branches in parallel via `Promise.all` so neither i18n nor auth blocks the other:

1. Storage + auth branch (sequential): `storageService.setPersistentStorage()` → `storageService.createDatabase()` → **`authService.initialize()`** ← the auth entry point.
2. Language branch (sequential): `appConfigService.loadDefaultLang()` → `translocoService.setActiveLang()`, with `translocoService.load()` fired but **not awaited** (translations render reactively through the `transloco` pipe/directive once they arrive).

After both branches settle, `updateService.checkForUpdateOnce()` is started **without** being awaited — the update prompt must never delay first render.

### 4.2 `AuthService.initialize()` — cache-first, with a probe-first fallback

1. **Load the cached user from IndexedDB** (`loadCachedUser()`).
2. **Cached user with a `sub` claim, and no proven server mismatch** (`shouldForceServerResync()` is `false`) → this is a proven-OIDC user: set `currentUser` **immediately** (instant startup, no network wait), then run `refreshFromNetwork()` in the **background** to reconcile with the server. A background failure is only logged — it never resets `currentUser`.
3. **Otherwise** (no cached user, a cached user without `sub`, or a proven mismatch) → resolve the mode and user from the network in the background (`resolveModeAndUserFromNetwork()`), **never awaited** by `initialize()` itself:
   - **Probe `/auth/userinfo`** (`probeUserinfo()`) — updates the `oidcEnabled` and `modeResolved` signals; on success with `authenticated: true` returns the OIDC claims.
   - **Active OIDC session** → upsert the user, set `currentUser`.
   - **Proven mismatch still standing** → clear `currentUser`.
   - **No session, no mismatch** → restore the cached user, unless OIDC mode is required and the cached user has no `sub` (stale email-only user, rejected).

Defaults until the first probe completes: `oidcEnabled = true`, `modeResolved = false`. Strict by default so the email form is never displayed before the server contract is known.

> `initialize()` itself never awaits the network probe — it is called from `provideAppInitializer` and Angular renders nothing until it resolves. The auth guard and the login page tolerate the transient "unresolved" state (IndexedDB fallback, `modeResolved` signal).

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

Public method that re-runs the probe and upserts the user when claims are returned; on success it also clears `serverSessionInvalid`. Called from three places: the cache-first fast path in `initialize()` (§4.2, step 2), the browser `online` reconnect handler (§4.6), and available to be triggered manually to force a fresh check.

### 4.5 Route guard

[auth.guard.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/guards/auth.guard.ts):
- If `currentUser()` is non-null → allows.
- Otherwise tries a restore from IndexedDB (`tryRestoreFromCache`).
- Otherwise redirects to `/login`.

All children of `LoggedLayoutComponent` carry `canActivate: [authGuard]` ([app.routes.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/app.routes.ts)).

### 4.6 Session-mismatch detection & automatic resync

Two independent detectors feed the same recovery path, because a stale session can surface either as an in-page HTTP failure or as a failed navigation:

| Detector | Where | Triggers on |
|---|---|---|
| `authSessionInterceptor` | HTTP interceptor ([auth-session.interceptor.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/auth/auth-session.interceptor.ts)), registered via `provideHttpClient(withInterceptors([authSessionInterceptor]))` | Any same-origin request failing with `401`/`403` |
| Service Worker navigation handler | [service-worker.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/worker_update/service-worker.ts) `handleFetch()` | A navigation request answered with a raw `401`/`403` **and** no installed shell cached — redirects to `/auth/relogin` (302) instead of leaking Apache's raw error body |

- Both call `AuthService.markServerMismatchFromStatus(status)`, which sets `serverSessionInvalid = true` only for `401`/`403` (other statuses, e.g. transient `5xx`, are a no-op).
- `shouldForceServerResync()` is `true` when `serverSessionInvalid()` is set **and** the browser is online — it forces `initialize()`/`tryRestoreFromCache()` to distrust the IndexedDB cache and re-resolve from the network.
- `AuthResyncService.triggerImmediateRedirect()` performs the actual recovery: a top-level navigation to `/auth/login` (forcing the G@IA prompt again). Guarded by:
  - a **15 s cooldown** (`AUTH_RESYNC_REDIRECT_COOLDOWN_MS`), persisted in `sessionStorage` (`auth_resync:last_redirect_at`) so concurrent failing requests only trigger one redirect;
  - **suppressed paths** — no redirect is fired while already on `/auth/*` or `/login` (`isRedirectSuppressedPath`), to avoid loops;
  - **offline guard** — no redirect while `navigator.onLine === false`.
- `AuthService` also listens for the browser `online` event: it re-runs `refreshFromNetwork()` and, if the mismatch is still proven afterwards, calls `triggerImmediateRedirect()` — so a user who went offline right when the mismatch was detected is not left stuck indefinitely once connectivity returns.

### `/login` page — email-only fallback
When OIDC is unavailable (e.g. dev without mock claims), [login-page.component.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/features/auth/presentation/pages/login-page/login-page.component.ts) shows an email form. `loginWithEmail()` creates/retrieves a User in IndexedDB and sets the signal — **no password verification**, this is purely a local degraded mode.

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
| Access-token refresh | **Deliberately none.** `OIDCRefreshAccessTokenBeforeExpiry` is intentionally NOT set (see §7.1) — the app never consumes the access_token upstream, and proactive refresh caused session-killing incidents with G@IA's rotating refresh tokens. Session validity is the Apache cookie alone. |
| Expiration detection | `/auth/userinfo` → `{ authenticated: false }` (or HTTP `401` for legacy servers); a live request/navigation returning `401`/`403` is also caught by `authSessionInterceptor` / the Service Worker (§4.6) |
| `Authorization` header | **No HTTP interceptor injects a Bearer token** — everything flows through cookies. `authSessionInterceptor` exists, but only to *detect* `401`/`403` session mismatches and trigger a resync (§4.6) |
| Logout | **No Angular method, no UI button** — by design (`connexion-gaia.md` §2). Session lifetime is enforced by Apache (`OIDCSessionInactivityTimeout 604800` = 7 days, `OIDCSessionMaxDuration 2592000` = 30 days). |

---

## 7. Server-side configuration

The OIDC directives live in `httpd-oidc.conf.template` (repo root, resolved by `docker/entrypoint.sh` via `envsubst` before Apache starts) — not in any Angular file. Key directives currently configured:

- `OIDCResponseType code` + `OIDCPKCEMethod S256` — Authorization Code + PKCE.
- `OIDCSessionType client-cookie` (tokens AES-encrypted client-side via `OIDCCryptoPassphrase`), `OIDCSessionInactivityTimeout 604800` (7 days), `OIDCSessionMaxDuration 2592000` (30 days).
- `OIDCPassClaimsAs both`, `OIDCPassAccessToken On`, `OIDCPassIDTokenAs claims`, `OIDCPassRefreshToken Off`, `OIDCRemoteUserClaim sub` — claims surfaced as `OIDC_CLAIM_*` (and, for the `roles` claim carried in the access token, `OIDC_ACCESS_TOKEN_CLAIM_*`) env vars to CGIs.
- `OIDCCookieSameSite Lax`, `OIDCCookieHTTPOnly On`, cookie name `mod_auth_openidc_session`, forced `Secure` via `SetEnv OIDC_SET_COOKIE_APPEND Secure`.
- `OIDCSSLValidateServer On`; `OIDCHTTPTimeoutLong 10` / `OIDCHTTPTimeoutShort 5` for Apache's outgoing calls to G@IA (the client-side `USERINFO_PROBE_TIMEOUT_MS = 13000` in `auth.service.ts` must stay strictly greater than `OIDCHTTPTimeoutLong` so it never races Apache's own call).
- `OIDCRedirectURLsAllowed` restricted to the app's own public host — open-redirect protection for the user-supplied `target_link_uri`/logout params (does not govern the normal post-login redirect, which comes from encrypted OIDC state).
- `<Location />` → `Require valid-user` (whole app protected).
- `<Location /auth/userinfo>` → `OIDCUnAuthAction pass` so the CGI can answer `{ authenticated: false }` instead of returning `401`.
- `<Location /auth/login>` → `OIDCUnAuthAction auth`, so an unauthenticated request triggers the G@IA redirect.
- `<Location /auth/relogin>` → `OIDCUnAuthAction pass`; clears the local `mod_auth_openidc_session` cookie via a `Set-Cookie ... Max-Age=0` response header, then `Redirect 302` to `/auth/login`. Deliberately does **not** use mod_auth_openidc's `?logout=` query (that performs an RP-initiated logout at G@IA, stranding the user on G@IA's own "Sign off successful" page, whose redirect target is not whitelisted).

### 7.1 Deliberate absences (incident-driven — do not re-add without reading the source comment)

- **No `OIDCRefreshAccessTokenBeforeExpiry`.** Proactive access-token refresh was removed after two 2026-08-10 incidents: this app never consumes the access_token upstream, and G@IA's single-use rotating refresh tokens combined with `client-cookie` sessions caused concurrent browser requests to race the same refresh token, killing the whole token family (`invalid_grant`, cascading 502s). Combined with `logout_on_error` it caused an instant login lockout on the first failed refresh.
- **No `ErrorDocument 401`.** A 401 `ErrorDocument` pointing at a relogin endpoint means any stray `401` (e.g. a `favicon.ico` request racing a session refresh) tears down a live session. 401 navigations are instead recovered client-side by the Service Worker and `reconnecting.js` (§4.6, §8) — non-navigation `401`s stay plain `401`s.
- **`ErrorDocument 400` → `/__access-denied.html`** and **`ErrorDocument 502/503/504` → `/__reconnecting.html`** are the only server-side error redirects, both served from public, OIDC-bypassed `<Location>` blocks (`httpd.conf.patch`) so the internal error subrequest is not itself caught by the OIDC catch-all.

### 7.2 CGI scripts

- [docker/cgi-bin/userinfo.sh](https://github.com/phlowers/phlowers-stellar-app/blob/main/docker/cgi-bin/userinfo.sh) — always returns `200 OK` with `{ authenticated, oidcEnabled, … }`. The `oidcEnabled` flag comes from the `OIDC_ENABLED` env var injected by the entrypoint. Claims are JSON-encoded with `jq` (no string interpolation, no injection risk). The `roles` claim is read from `OIDC_ACCESS_TOKEN_CLAIM_roles` (CSV or indexed `_0`, `_1`, … env vars), falling back to `OIDC_CLAIM_roles` for IdPs that mirror it into the id_token/userinfo.
- [docker/cgi-bin/login.sh](https://github.com/phlowers/phlowers-stellar-app/blob/main/docker/cgi-bin/login.sh) — runs only after a successful G@IA callback; emits `302 Location: /`. Returning here (instead of directly to `/`) guarantees a known landing URL that the Service Worker bypasses.

---

## 8. PWA / Service Worker interactions

- [dev-mock/oidc-middleware.mjs](https://github.com/phlowers/phlowers-stellar-app/blob/main/dev-mock/oidc-middleware.mjs) is wired through `angular.json` (`serve` option).
- It intercepts `GET /auth/userinfo` and returns the contents of `dev-mock/oidc-claims.json` (gitignored).
- If the file does not exist → `{ authenticated: false }` → the app falls back to the `/login` page.

```bash
cp stellar/dev-mock/oidc-claims.example.json stellar/dev-mock/oidc-claims.json
npm start
```

---

## 9. What is intentionally absent

- ❌ No client-side OIDC library, no PKCE handling in Angular.
- ❌ No `HttpInterceptor` injecting a Bearer token (the one interceptor that exists, `authSessionInterceptor`, only detects `401`/`403` session mismatches and triggers a resync redirect — see §4.6).
- ❌ No OIDC environment variables in Angular (`clientId`, `redirectUri`, scopes…). All OIDC config lives in Apache.
- ❌ No `/.well-known/openid-configuration` consumed on the front.
- ❌ No logout button or route in the UI (deliberate — see `connexion-gaia.md`).
- ❌ No client-side token storage (`localStorage`, `sessionStorage`, in-memory tokens).
- ❌ No automatic deletion of cached users (the table preserves attached studies).

---

## 10. One-sentence summary

> Apache handles all of OIDC (PKCE, tokens, cookies, redirects — deliberately no proactive refresh). Angular **probes `/auth/userinfo`** to discover the server-side mode, **caches OIDC claims in IndexedDB** for offline use, exposes `currentUser` / `oidcEnabled` / `modeResolved` signals, **detects proven session mismatches** (HTTP interceptor + Service Worker) to auto-redirect to **`/auth/login`** (rate-limited via `/auth/relogin`), and offers a **degraded email login** only when the server reports `oidcEnabled: false`.
