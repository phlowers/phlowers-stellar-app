# Authentication mechanism — phlowers-stellar-app

The application **does not use any client-side OIDC library** (no `angular-auth-oidc-client`, no `oidc-client-ts`, etc.). All OAuth/OIDC complexity is delegated to **Apache `mod_auth_openidc`** on the server side. Angular acts only as a thin client that reads pre-authenticated claims and caches them in IndexedDB to keep working offline.

---

## 1. Overall architecture

```
┌──────────┐   1. GET /        ┌────────┐   2. 302 → IdP login   ┌─────┐
│ Browser  │ ────────────────► │ Apache │ ─────────────────────► │ IdP │
│ (Angular)│                   │ mod_   │   3. Auth Code + PKCE  │     │
│          │ ◄──────────────── │ auth_  │ ◄───────────────────── │     │
│          │   4. Set-Cookie   │ openid │                        └─────┘
│          │   (HTTP-only)     │   c    │
│          │   5. GET /auth/   │        │
│          │   userinfo        │        │
│          │ ◄──────────────── │        │
│          │   JSON claims     └────────┘
│          │
│ IndexedDB│  ← local cache of the User
└──────────┘
```

- Apache intercepts requests, enforces OIDC login (Authorization Code + PKCE) and stores tokens in **HTTP-only cookies** invisible to JS.
- Apache exposes `/auth/userinfo` returning the OIDC claims as JSON.
- Angular reads this endpoint, persists the user in IndexedDB (Dexie) and exposes a `signal<User | null>`.

---

## 2. Key files

| Role | File |
|---|---|
| Main service | [src/app/core/services/auth/auth.service.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/auth/auth.service.ts) |
| Constants | [src/app/core/services/auth/auth.constants.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/auth/auth.constants.ts) |
| Claims interface | [src/app/core/services/auth/oidc-claims.interface.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/auth/oidc-claims.interface.ts) |
| Route guard | [src/app/core/guards/auth.guard.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/guards/auth.guard.ts) |
| Fallback login page | [src/app/features/auth/presentation/pages/login-page/login-page.component.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/features/auth/presentation/pages/login-page/login-page.component.ts) |
| User model | [src/app/shared/domain/models/user.model.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/shared/domain/models/user.model.ts) |
| Bootstrap | [src/app/app.config.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/app.config.ts) |
| Protected routes | [src/app/app.routes.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/app.routes.ts) |
| User display | [src/app/shared/components/layout/topbar/topbar.component.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/shared/components/layout/topbar/topbar.component.ts) |
| Service worker bypass | [src/app/core/services/worker_update/service-worker.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/worker_update/service-worker.ts) |
| Dev mock | [dev-mock/oidc-middleware.mjs](https://github.com/phlowers/phlowers-stellar-app/blob/main/dev-mock/oidc-middleware.mjs) · [dev-mock/oidc-claims.example.json](https://github.com/phlowers/phlowers-stellar-app/blob/main/dev-mock/oidc-claims.example.json) |

---

## 3. End-to-end flow

### App startup (`APP_INITIALIZER`)
In [app.config.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/app.config.ts) the enforced sequence is:
1. `storageService.setPersistentStorage()`
2. `storageService.createDatabase()`
3. **`authService.initialize()`** ← the auth entry point
4. `updateService.checkForUpdateOnce()`

### `AuthService.initialize()` — *cache-first* strategy
1. Reads IndexedDB (`db.users`) to find a cached user.
2. **Cache hit** → sets the `currentUser` signal immediately → the app starts without waiting for the network. If the user has a `sub` (i.e. real OIDC user), a `refreshFromNetwork()` runs in the background.
3. **Cache miss** → blocks on `refreshFromNetwork()` (first launch).

### `refreshFromNetwork()`
- `fetch('/auth/userinfo', { cache: 'no-store' })`
- If `401` or `{ authenticated: false }` → returns `null` (no session).
- Otherwise the claims are *upserted* into IndexedDB and the signal is updated.

### Route guard
[auth.guard.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/guards/auth.guard.ts):
- If `currentUser()` is non-null → allows.
- Otherwise tries a restore from IndexedDB (`tryRestoreFromCache`).
- Otherwise redirects to `/login`.

All children of `LoggedLayoutComponent` carry `canActivate: [authGuard]` ([app.routes.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/app.routes.ts)).

### `/login` page — email-only fallback
When OIDC is unavailable (e.g. dev without mock claims), [login-page.component.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/features/auth/presentation/pages/login-page/login-page.component.ts) shows an email form. `loginWithEmail()` creates/retrieves a User in IndexedDB and sets the signal — **no password verification**, this is purely a local degraded mode.

---

## 4. Storage and model

```typescript
// oidc-claims.interface.ts
interface OidcClaims {
  email: string;        // mandatory — primary key
  sub?: string;         // unique IdP identifier
  given_name?: string;
  family_name?: string;
  roles?: string[];
}
```

Dexie schema: `users: '&email, sub'` (primary key = email, secondary index = sub). Users are **never deleted** (a deliberate policy to preserve attached `studies`).

---

## 5. Tokens, refresh, logout

| Aspect | Where it is handled |
|---|---|
| Access / refresh tokens | **Apache only**, as HTTP-only cookies — JS has no access |
| Silent refresh | Apache (PKCE); Angular only re-polls `/auth/userinfo` |
| Expiration detection | `/auth/userinfo` → `401` or `authenticated:false` |
| `Authorization` header | **No HTTP interceptor** — everything flows through cookies |
| Logout | **No Angular method** — must navigate to the Apache endpoint (e.g. `/auth/logout`) which clears cookies and redirects to the IdP |

---

## 6. PWA / Service Worker interactions

[service-worker.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/worker_update/service-worker.ts) enforces two crucial rules:

1. **Full bypass of `/auth/*`**: `shouldBypassSW()` forces `fetch(event.request)` without interception. Otherwise the SW could serve a cached response and hide a session expiration.
2. **Network-first for the home page**: lets Apache emit its 302 redirects to the IdP without them being cached.

Without these precautions, a user logged out on the Apache side would still appear "logged in" as long as the SW served the cached HTML.

---

## 7. Dev OIDC mock

- [dev-mock/oidc-middleware.mjs](https://github.com/phlowers/phlowers-stellar-app/blob/main/dev-mock/oidc-middleware.mjs) is wired through `angular.json` (`serve` option).
- It intercepts `GET /auth/userinfo` and returns the contents of `dev-mock/oidc-claims.json` (gitignored).
- If the file does not exist → `{ authenticated: false }` → the app falls back to the `/login` page.

To enable a dev user:
```bash
cp dev-mock/oidc-claims.example.json dev-mock/oidc-claims.json
npm start
```

---

## 8. What is intentionally absent

- ❌ No `HttpInterceptor` injecting a Bearer token
- ❌ No OIDC environment variables in Angular (clientId, redirectUri, scopes…)
- ❌ No `/.well-known/openid-configuration` endpoint consumed on the front
- ❌ No logout button/route in the UI
- ❌ No client-side token storage (`localStorage`, `sessionStorage`)

---

## 9. One-sentence summary

> Apache handles all of OIDC (PKCE, tokens, cookies, refresh, redirects). Angular only **reads claims** from `/auth/userinfo`, **caches them in IndexedDB** for offline use, exposes a **`currentUser` signal** consumed by an `authGuard`, and provides a **degraded email login** when no OIDC session is available.
