# Mécanique d'authentification — phlowers-stellar-app

L'application **n'utilise aucune librairie OIDC côté client** (`angular-auth-oidc-client`, `oidc-client-ts`, etc.). Toute la complexité OAuth/OIDC est déléguée à **Apache `mod_auth_openidc`** côté serveur. Angular n'est qu'un client léger qui lit des claims pré-authentifiées et les met en cache dans IndexedDB pour fonctionner hors ligne.

---

## 1. Architecture globale

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
│ IndexedDB│  ← cache local du User
└──────────┘
```

- Apache intercepte les requêtes, force le login OIDC (Authorization Code + PKCE), stocke les tokens dans des **cookies HTTP-only** invisibles à JS.
- Apache expose `/auth/userinfo` qui renvoie les claims OIDC en JSON.
- Angular lit ce endpoint, persiste l'utilisateur dans IndexedDB (Dexie) et expose un `signal<User | null>`.

---

## 2. Fichiers clés

| Rôle | Fichier |
|---|---|
| Service principal | [src/app/core/services/auth/auth.service.ts](src/app/core/services/auth/auth.service.ts) |
| Constantes | [src/app/core/services/auth/auth.constants.ts](src/app/core/services/auth/auth.constants.ts) |
| Interface claims | [src/app/core/services/auth/oidc-claims.interface.ts](src/app/core/services/auth/oidc-claims.interface.ts) |
| Route guard | [src/app/core/guards/auth.guard.ts](src/app/core/guards/auth.guard.ts) |
| Page login fallback | [src/app/features/auth/presentation/pages/login-page/login-page.component.ts](src/app/features/auth/presentation/pages/login-page/login-page.component.ts) |
| Modèle User | [src/app/shared/domain/models/user.model.ts](src/app/shared/domain/models/user.model.ts) |
| Bootstrap | [src/app/app.config.ts](src/app/app.config.ts) |
| Routes protégées | [src/app/app.routes.ts](src/app/app.routes.ts) |
| Affichage user | [src/app/shared/components/layout/topbar/topbar.component.ts](src/app/shared/components/layout/topbar/topbar.component.ts) |
| SW bypass | [src/app/core/services/worker_update/service-worker.ts](src/app/core/services/worker_update/service-worker.ts) |
| Mock dev | [dev-mock/oidc-middleware.mjs](dev-mock/oidc-middleware.mjs) · [dev-mock/oidc-claims.example.json](dev-mock/oidc-claims.example.json) |

---

## 3. Flux end-to-end

### Démarrage de l'app (`APP_INITIALIZER`)
Dans [app.config.ts](src/app/app.config.ts), la séquence imposée est :
1. `storageService.setPersistentStorage()`
2. `storageService.createDatabase()`
3. **`authService.initialize()`** ← le point d'auth
4. `updateService.checkForUpdateOnce()`

### `AuthService.initialize()` — stratégie *cache-first*
1. Lit IndexedDB (`db.users`) pour retrouver un user en cache.
2. **Cache hit** → set du signal `currentUser` immédiatement → l'app démarre sans attendre le réseau. Si le user a un `sub` (donc OIDC), un `refreshFromNetwork()` est lancé en arrière-plan.
3. **Cache miss** → bloque sur `refreshFromNetwork()` (premier lancement).

### `refreshFromNetwork()`
- `fetch('/auth/userinfo', { cache: 'no-store' })`
- Si `401` ou `{ authenticated: false }` → renvoie `null` (pas de session).
- Sinon les claims sont *upserted* dans IndexedDB et le signal est mis à jour.

### Garde de routes
[auth.guard.ts](src/app/core/guards/auth.guard.ts) :
- Si `currentUser()` non nul → autorise.
- Sinon tente une restauration depuis IndexedDB (`tryRestoreFromCache`).
- Sinon redirige vers `/login`.

Toutes les routes enfant de `LoggedLayoutComponent` portent `canActivate: [authGuard]` ([app.routes.ts](src/app/app.routes.ts)).

### Page `/login` — fallback email uniquement
Quand OIDC est indisponible (ex: dev sans mock claims), [login-page.component.ts](src/app/features/auth/presentation/pages/login-page/login-page.component.ts) propose un formulaire email. `loginWithEmail()` crée/retrouve un User dans IndexedDB et set le signal — **aucune vérification de mot de passe**, c'est purement un mode dégradé local.

---

## 4. Stockage et modèle

```typescript
// oidc-claims.interface.ts
interface OidcClaims {
  email: string;        // obligatoire — clé primaire
  sub?: string;         // identifiant unique IdP
  given_name?: string;
  family_name?: string;
  roles?: string[];
}
```

Schéma Dexie : `users: '&email, sub'` (clé primaire = email, index secondaire = sub). Les Users **ne sont jamais supprimés** (politique conservée pour préserver les `studies` rattachées).

---

## 5. Tokens, refresh, logout

| Aspect | Où c'est géré |
|---|---|
| Access / refresh tokens | **Apache uniquement**, en cookies HTTP-only — JS n'y a pas accès |
| Refresh silencieux | Apache (PKCE), Angular ne fait que repolller `/auth/userinfo` |
| Détection d'expiration | `/auth/userinfo` → `401` ou `authenticated:false` |
| Header `Authorization` | **Aucun interceptor HTTP** — tout passe par les cookies |
| Logout | **Pas de méthode Angular** — il faut naviguer vers l'endpoint Apache (ex. `/auth/logout`) qui clear les cookies et redirige vers l'IdP |

---

## 6. Interactions PWA / Service Worker

[service-worker.ts](src/app/core/services/worker_update/service-worker.ts) applique deux règles cruciales :

1. **Bypass total de `/auth/*`** : `shouldBypassSW()` force `fetch(event.request)` sans interception. Sinon le SW pourrait servir une réponse cachée et masquer une expiration de session.
2. **Home page en *network-first*** : permet à Apache d'envoyer ses redirections 302 vers l'IdP sans qu'elles soient mises en cache.

Sans ces précautions, un user déconnecté côté Apache resterait "connecté" tant que le SW servirait le HTML caché.

---

## 7. Mock OIDC pour le dev

- [dev-mock/oidc-middleware.mjs](dev-mock/oidc-middleware.mjs) est branché via `angular.json` (option `serve`).
- Il intercepte `GET /auth/userinfo` et retourne le contenu de `dev-mock/oidc-claims.json` (gitignoré).
- Si le fichier n'existe pas → `{ authenticated: false }` → l'app tombe sur la page `/login` fallback.

Pour activer un user de dev :
```bash
cp dev-mock/oidc-claims.example.json dev-mock/oidc-claims.json
npm start
```

---

## 8. Ce qui n'existe pas (volontairement)

- ❌ Aucun `HttpInterceptor` qui injecte un Bearer token
- ❌ Aucune variable d'environnement OIDC dans Angular (clientId, redirectUri, scopes…)
- ❌ Aucun endpoint `/.well-known/openid-configuration` consommé côté front
- ❌ Aucun bouton/route de logout dans l'UI
- ❌ Aucun stockage de token côté JS (`localStorage`, `sessionStorage`)

---

## 9. Résumé en une phrase

> Apache fait tout l'OIDC (PKCE, tokens, cookies, refresh, redirections). Angular ne fait que **lire les claims** sur `/auth/userinfo`, **les cacher dans IndexedDB** pour l'offline, exposer un **signal `currentUser`** consommé par un `authGuard`, et fournir un **login email dégradé** en l'absence de session OIDC.
