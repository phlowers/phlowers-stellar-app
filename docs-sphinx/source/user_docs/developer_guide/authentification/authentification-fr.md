# Mécanique d'authentification — phlowers-stellar-app

L'application **n'embarque aucune librairie OIDC côté client** (`angular-auth-oidc-client`, `oidc-client-ts`, etc.). Toute la complexité OAuth/OIDC est déléguée à **Apache `mod_auth_openidc`** côté serveur. Angular n'est qu'un client léger qui :

1. **Sonde le serveur** pour découvrir le mode d'authentification actif.
2. **Lit les claims pré-authentifiées** sur un endpoint CGI.
3. **Met l'utilisateur en cache dans IndexedDB** pour fonctionner hors ligne.
4. **Force une navigation top-level** vers G@IA quand un prompt de connexion est nécessaire.

---

## 1. Architecture globale

```
┌──────────┐   1. GET /auth/userinfo  ┌────────┐  (pas de session)┌─────┐
│ Browser  │ ───────────────────────► │ Apache │ ────────────────►│ IdP │
│ (Angular)│                          │ mod_   │                  │G@IA │
│          │ ◄─────────────────────── │ auth_  │ ◄────────────────│     │
│          │  { authenticated, oidcEnabled,   │  Auth Code        └─────┘
│          │     email?, sub?, given_name?,   │  + PKCE (S256)
│          │     family_name?, roles?,        │
│          │     rte_group? }                 │
│          │                          │ openidc│
│          │   2. GET /auth/login     │        │
│          │   (navigation top-level) │        │
│          │ ───────────────────────► │        │ → prompt G@IA
│          │ ◄─────────────────────── │        │ → callback → 302 "/"
│          │   Set-Cookie HTTP-only   │        │
│          │                          └────────┘
│ IndexedDB│  ← User mis en cache (offline-first)
└──────────┘
```

- Apache impose la connexion OIDC (Authorization Code + PKCE S256) et stocke les tokens dans des **cookies HTTP-only** invisibles à JS.
- Apache expose deux endpoints CGI :
  - `/auth/userinfo` — renvoie l'état de la session et les claims OIDC en JSON. Répond toujours `200 OK` (même non authentifié) pour éviter les erreurs console parasites et pour annoncer le mode serveur.
  - `/auth/login` — point d'entrée dédié qui déclenche le prompt G@IA puis redirige (302) vers `/` après authentification.
- Angular lit `/auth/userinfo`, persiste l'utilisateur dans IndexedDB (Dexie) et expose un `signal<User | null>`.

---

## 2. Fichiers clés

| Rôle | Fichier |
|---|---|
| Service principal | [src/app/core/services/auth/auth.service.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/auth/auth.service.ts) |
| Constantes | [src/app/core/services/auth/auth.constants.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/auth/auth.constants.ts) |
| Interface claims | [src/app/core/services/auth/oidc-claims.interface.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/auth/oidc-claims.interface.ts) |
| Route guard | [src/app/core/guards/auth.guard.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/guards/auth.guard.ts) |
| Page login fallback | [src/app/features/auth/presentation/pages/login-page/login-page.component.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/features/auth/presentation/pages/login-page/login-page.component.ts) |
| Modèle User | [src/app/shared/domain/models/user.model.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/shared/domain/models/user.model.ts) |
| Bootstrap | [src/app/app.config.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/app.config.ts) |
| Routes protégées | [src/app/app.routes.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/app.routes.ts) |
| Affichage user | [src/app/shared/components/layout/topbar/topbar.component.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/shared/components/layout/topbar/topbar.component.ts) |
| SW bypass | [src/app/core/services/worker_update/service-worker.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/worker_update/service-worker.ts) |
| Mock dev | [dev-mock/oidc-middleware.mjs](https://github.com/phlowers/phlowers-stellar-app/blob/main/dev-mock/oidc-middleware.mjs) · [dev-mock/oidc-claims.example.json](https://github.com/phlowers/phlowers-stellar-app/blob/main/dev-mock/oidc-claims.example.json) |

---

## 3. Deux modes mutuellement exclusifs

Le mode est décidé **côté serveur** et découvert par la SPA via `/auth/userinfo`.

| Mode | `oidcEnabled` | Serveur | Formulaire email | Chemin de connexion |
|---|---|---|---|---|
| **Mode OIDC** | `true` | Apache + `mod_auth_openidc` | Interdit | Navigation top-level vers `/auth/login` → prompt G@IA |
| **Mode fallback** | `false` | Dev server / Apache sans OIDC | Autorisé | `loginWithEmail()` local (sans mot de passe) |

Défense en profondeur : un user mis en cache en mode fallback (sans claim `sub`) est **rejeté** si le serveur annonce ensuite le mode OIDC.

---

## 4. Flux end-to-end

### 4.1 Démarrage (`provideAppInitializer`)

La séquence imposée dans [app.config.ts](src/app/app.config.ts) est :

### Démarrage de l'app (`APP_INITIALIZER`)
Dans [app.config.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/app.config.ts), la séquence imposée est :
1. `storageService.setPersistentStorage()`
2. `storageService.createDatabase()`
3. **`authService.initialize()`** ← le point d'auth
4. `updateService.checkForUpdateOnce()`

### 4.2 `AuthService.initialize()` — probe-first puis cache

1. **Sonde `/auth/userinfo`** (`probeUserinfo()`) :
   - Met à jour les signals `oidcEnabled` et `modeResolved`.
   - En cas de `authenticated: true` → renvoie les claims OIDC.
2. **Session OIDC active** → upsert du user, set de `currentUser`, terminé.
3. **Pas de session** → lecture du user en cache IndexedDB.
   - En mode OIDC (ou si la sonde a échoué et le mode est inconnu), un user en cache **sans `sub`** est ignoré (user email-only obsolète).
   - Sinon → restauration du user en cache.

Défauts avant la première sonde : `oidcEnabled = true`, `modeResolved = false`. Stricte par défaut pour ne jamais afficher le formulaire email avant de connaître le contrat serveur.

### 4.3 `probeUserinfo()` — contrat serveur

`fetch('/auth/userinfo', { cache: 'no-store' })` — cas gérés :

| Réponse | Signal `oidcEnabled` | `modeResolved` | Claims renvoyées |
|---|---|---|---|
| Erreur réseau | inchangé (défaut `true`) | `true` | `null` |
| HTTP `401` (legacy) | `true` | `true` | `null` |
| Statut HTTP non-OK | inchangé | `true` | `null` |
| JSON invalide | inchangé | `true` | `null` |
| `{ authenticated: false, oidcEnabled }` | depuis la réponse | `true` | `null` |
| `{ authenticated: true, oidcEnabled, email, … }` | depuis la réponse | `true` | claims |
| `email` manquant ou vide | depuis la réponse | `true` | `null` (warning loggué) |

### 4.4 `refreshFromNetwork()`

Méthode publique qui ré-exécute la sonde et upsert le user si des claims sont renvoyées. Disponible pour forcer un re-check (non appelée actuellement par l'initializer).

### 4.5 Route guard

### Garde de routes
[auth.guard.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/guards/auth.guard.ts) :
- Si `currentUser()` non nul → autorise.
- Sinon tente une restauration depuis IndexedDB (`tryRestoreFromCache`).
- Sinon redirige vers `/login`.

Toutes les routes enfant de `LoggedLayoutComponent` portent `canActivate: [authGuard]` ([app.routes.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/app.routes.ts)).

### Page `/login` — fallback email uniquement
Quand OIDC est indisponible (ex: dev sans mock claims), [login-page.component.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/features/auth/presentation/pages/login-page/login-page.component.ts) propose un formulaire email. `loginWithEmail()` crée/retrouve un User dans IndexedDB et set le signal — **aucune vérification de mot de passe**, c'est purement un mode dégradé local.

---

## 5. Stockage et modèle

```typescript
// oidc-claims.interface.ts
interface OidcClaims {
  email: string;        // obligatoire — clé primaire
  sub?: string;         // identifiant unique IdP (présence == "vrai user OIDC")
  given_name?: string;
  family_name?: string;
  roles?: string[];
}
```

Schéma Dexie : `users: '&email, sub'` (clé primaire = `email`, index secondaire = `sub`).

`upsertUser(claims)` préserve les champs `uuid` et `studies` existants lors de l'écrasement. Les users **ne sont jamais supprimés** (politique délibérée : les études restent rattachées à leur propriétaire).

> Note : le CGI renvoie également `rte_group`, qui ne fait pas partie de `OidcClaims` et n'est donc pas persisté par la SPA.

---

## 6. Tokens, refresh, logout

| Aspect | Où c'est géré |
|---|---|
| Access / refresh tokens | **Apache uniquement**, session `server-cache` — JS n'y a pas accès |
| `client_secret` G@IA | **Apache uniquement** (`OIDCClientSecret` injecté à l'entrypoint, fichier `chmod 600`) — jamais dans le bundle Angular |
| Refresh silencieux | Apache (`OIDCRefreshAccessTokenBeforeExpiry 300`). Angular se contente de re-sonder `/auth/userinfo` |
| Détection d'expiration | `/auth/userinfo` → `{ authenticated: false }` (ou HTTP `401` pour les serveurs legacy) |
| Header `Authorization` | **Aucun interceptor HTTP** — tout passe par les cookies |
| Logout | **Aucune méthode Angular, aucun bouton UI** — par conception (`connexion-gaia.md` §2). La durée de session est gérée par Apache (`OIDCSessionInactivityTimeout 28800`, `OIDCSessionMaxDuration 604800`). |
| Claim `roles` | Lu dans l'access_token G@IA (`OIDC_ACCESS_TOKEN_CLAIM_roles`), exposé tel quel dans `User.roles`. Aucun RBAC SPA, aucun guard côté Angular. |

---

## 7. Configuration côté serveur

[service-worker.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/worker_update/service-worker.ts) applique deux règles cruciales :

- `OIDCResponseType code` + `OIDCPKCEMethod S256`
- `OIDCSessionType server-cache`, inactivité 8h, durée max 7j
- `OIDCPassClaimsAs environment` — claims exposées comme variables d'env `OIDC_CLAIM_*` pour les CGI
- `OIDCCookieSameSite Lax`, `OIDCCookieHTTPOnly On`, cookies forcés en `Secure`
- `OIDCSSLValidateServer On`, `OIDCRefreshAccessTokenBeforeExpiry 300`
- `<Location />` → `Require valid-user` (toute l'app protégée)
- `<Location /auth/userinfo>` → `OIDCUnAuthAction pass` pour que le CGI puisse répondre `{ authenticated: false }` au lieu de `401`
- `<Location /auth/login>` → **pas** de `OIDCUnAuthAction pass`, donc une requête non authentifiée déclenche bien la redirection G@IA

### 7.2 Scripts CGI

- [docker/cgi-bin/userinfo.sh](docker/cgi-bin/userinfo.sh) — répond toujours `200 OK` avec `{ authenticated, oidcEnabled, … }`. Le flag `oidcEnabled` provient de la variable `OIDC_ENABLED` injectée par l'entrypoint. Les claims sont encodées en JSON via `jq` (pas d'interpolation de chaîne, pas de risque d'injection).
- [docker/cgi-bin/login.sh](docker/cgi-bin/login.sh) — ne s'exécute qu'après un callback G@IA réussi ; émet `302 Location: /`. Revenir ici (plutôt que directement sur `/`) garantit une URL d'atterrissage connue, bypassée par le Service Worker.

---

## 8. Interactions PWA / Service Worker

- [dev-mock/oidc-middleware.mjs](https://github.com/phlowers/phlowers-stellar-app/blob/main/dev-mock/oidc-middleware.mjs) est branché via `angular.json` (option `serve`).
- Il intercepte `GET /auth/userinfo` et retourne le contenu de `dev-mock/oidc-claims.json` (gitignoré).
- Si le fichier n'existe pas → `{ authenticated: false }` → l'app tombe sur la page `/login` fallback.

```bash
cp stellar/dev-mock/oidc-claims.example.json stellar/dev-mock/oidc-claims.json
npm start
```

---

## 10. Ce qui n'existe pas (volontairement)

- ❌ Aucune librairie OIDC côté client, aucune gestion de PKCE dans Angular.
- ❌ Aucun `HttpInterceptor` qui injecte un Bearer token.
- ❌ Aucune variable d'environnement OIDC dans Angular (`clientId`, `redirectUri`, scopes…). Toute la config OIDC vit dans Apache.
- ❌ Aucun `/.well-known/openid-configuration` consommé côté front.
- ❌ Aucun bouton ni route de logout dans l'UI (délibéré — voir `connexion-gaia.md`).
- ❌ Aucun stockage de token côté client (`localStorage`, `sessionStorage`, mémoire).
- ❌ Aucune suppression automatique des users en cache (la table préserve les études rattachées).

---

## 11. Résumé en une phrase

> Apache fait tout l'OIDC (PKCE, tokens, cookies, refresh, redirections). Angular **sonde `/auth/userinfo`** pour découvrir le mode serveur, **cache les claims OIDC dans IndexedDB** pour l'offline, expose les signals `currentUser` / `oidcEnabled` / `modeResolved`, redirige le navigateur vers **`/auth/login`** quand un prompt OIDC est requis, et propose un **login email dégradé** uniquement quand le serveur annonce `oidcEnabled: false`.
