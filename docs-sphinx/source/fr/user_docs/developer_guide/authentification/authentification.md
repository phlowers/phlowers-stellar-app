# Mécanique d'authentification — phlowers-stellar-app

L'application **n'embarque aucune librairie OIDC côté client** (pas de `angular-auth-oidc-client`, pas de `oidc-client-ts`, etc.). Toute la complexité OAuth/OIDC est déléguée à **Apache `mod_auth_openidc`** côté serveur. Angular n'est qu'un client léger qui :

1. **Sonde le serveur** pour découvrir le mode d'authentification actif.
2. **Lit les claims pré-authentifiées** depuis un endpoint CGI.
3. **Met l'utilisateur en cache dans IndexedDB** pour continuer à fonctionner hors ligne.
4. **Force une navigation top-level** vers G@IA quand un prompt de connexion OIDC est nécessaire.

---

## 1. Architecture globale

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

- Apache impose la connexion OIDC (Authorization Code + PKCE S256) et stocke les tokens dans des **cookies HTTP-only** invisibles à JS.
- Apache expose trois endpoints pertinents :
  - `/auth/userinfo` — renvoie l'état de la session courante et les claims OIDC en JSON. Répond toujours `200 OK` (même non authentifié) afin d'éviter les erreurs console parasites et d'annoncer le mode côté serveur.
  - `/auth/login` — point d'entrée dédié qui déclenche le prompt G@IA et redirige (302) vers `/` une fois authentifié.
  - `/auth/relogin` — endpoint de récupération en dernier recours : efface le cookie de session local `mod_auth_openidc`, puis enchaîne vers `/auth/login`. Invoqué uniquement par le Service Worker (navigation 401/403 sans shell en cache) et par `reconnecting.html`.
- Angular lit `/auth/userinfo`, persiste l'utilisateur dans IndexedDB (Dexie) et expose un `signal<User | null>`.
- Un intercepteur HTTP same-origin (`authSessionInterceptor`) et le Service Worker détectent tous deux les incohérences de session prouvées (`401`/`403`) sur les requêtes/navigations en direct, et déclenchent une redirection automatique vers `/auth/login` (via `AuthResyncService`, à débit limité) — voir §4.6.

---

## 2. Fichiers clés

| Rôle | Fichier |
|---|---|
| Service principal | [src/app/core/services/auth/auth.service.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/auth/auth.service.ts) |
| Constantes | [src/app/core/services/auth/auth.constants.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/auth/auth.constants.ts) |
| Interface claims | [src/app/core/services/auth/oidc-claims.interface.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/auth/oidc-claims.interface.ts) |
| Resynchronisation de session (cooldown/suppression de redirection) | [src/app/core/services/auth/auth-resync.service.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/auth/auth-resync.service.ts) · [auth-resync.constantes.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/auth/auth-resync.constantes.ts) · [auth-resync.helpers.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/auth/auth-resync.helpers.ts) |
| Intercepteur HTTP d'incohérence de session | [src/app/core/services/auth/auth-session.interceptor.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/auth/auth-session.interceptor.ts) |
| Route guard | [src/app/core/guards/auth.guard.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/guards/auth.guard.ts) |
| Page login fallback | [src/app/features/auth/presentation/pages/login-page/login-page.component.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/features/auth/presentation/pages/login-page/login-page.component.ts) |
| Modèle User | [src/app/shared/domain/models/user.model.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/shared/domain/models/user.model.ts) |
| Bootstrap | [src/app/app.config.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/app.config.ts) |
| Routes protégées | [src/app/app.routes.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/app.routes.ts) |
| Affichage user | [src/app/shared/components/layout/topbar/topbar.component.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/shared/components/layout/topbar/topbar.component.ts) |
| Bypass du Service Worker | [src/app/core/services/worker_update/service-worker.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/worker_update/service-worker.ts) |
| Mock dev | [dev-mock/oidc-middleware.mjs](https://github.com/phlowers/phlowers-stellar-app/blob/main/dev-mock/oidc-middleware.mjs) · [dev-mock/oidc-claims.example.json](https://github.com/phlowers/phlowers-stellar-app/blob/main/dev-mock/oidc-claims.example.json) |

---

## 3. Deux modes mutuellement exclusifs

Le mode est décidé **côté serveur** et découvert par la SPA via `/auth/userinfo`.

| Mode | `oidcEnabled` | Serveur | Formulaire email | Chemin de connexion |
|---|---|---|---|---|
| **Mode OIDC** | `true` | Apache + `mod_auth_openidc` | Interdit | Navigation top-level vers `/auth/login` → prompt G@IA |
| **Mode fallback** | `false` | Dev server simple / Apache sans OIDC | Autorisé | `loginWithEmail()` local (sans mot de passe) |

Défense en profondeur : un user mis en cache en mode fallback (sans claim `sub`) est **rejeté** si le serveur annonce ensuite le mode OIDC.

---

## 4. Flux end-to-end

### 4.1 Démarrage de l'application (`provideAppInitializer`)

[app.config.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/app.config.ts) exécute deux branches en parallèle via `Promise.all` afin que ni l'i18n ni l'authentification ne se bloquent mutuellement :

1. Branche stockage + auth (séquentielle) : `storageService.setPersistentStorage()` → `storageService.createDatabase()` → **`authService.initialize()`** ← le point d'entrée de l'authentification.
2. Branche langue (séquentielle) : `appConfigService.loadDefaultLang()` → `translocoService.setActiveLang()`, avec `translocoService.load()` déclenché mais **non attendu** (les traductions s'affichent de manière réactive via la pipe/directive `transloco` dès qu'elles arrivent).

Une fois les deux branches terminées, `updateService.checkForUpdateOnce()` est démarré **sans** être attendu — l'invite de mise à jour ne doit jamais retarder le premier rendu.

### 4.2 `AuthService.initialize()` — cache-first, avec repli sur une sonde préalable

1. **Charge l'utilisateur en cache depuis IndexedDB** (`loadCachedUser()`).
2. **Utilisateur en cache avec une claim `sub`, et aucune incohérence serveur prouvée** (`shouldForceServerResync()` vaut `false`) → il s'agit d'un utilisateur OIDC prouvé : définit `currentUser` **immédiatement** (démarrage instantané, sans attente réseau), puis exécute `refreshFromNetwork()` en **arrière-plan** pour se réconcilier avec le serveur. Un échec en arrière-plan est seulement loggué — il ne réinitialise jamais `currentUser`.
3. **Sinon** (pas d'utilisateur en cache, un utilisateur en cache sans `sub`, ou une incohérence prouvée) → résout le mode et l'utilisateur depuis le réseau en arrière-plan (`resolveModeAndUserFromNetwork()`), **jamais attendu** par `initialize()` elle-même :
   - **Sonde `/auth/userinfo`** (`probeUserinfo()`) — met à jour les signals `oidcEnabled` et `modeResolved` ; en cas de succès avec `authenticated: true`, renvoie les claims OIDC.
   - **Session OIDC active** → upsert de l'utilisateur, définit `currentUser`.
   - **Incohérence toujours prouvée** → efface `currentUser`.
   - **Pas de session, pas d'incohérence** → restaure l'utilisateur en cache, sauf si le mode OIDC est requis et que l'utilisateur en cache n'a pas de `sub` (utilisateur email-only obsolète, rejeté).

Valeurs par défaut jusqu'à la fin de la première sonde : `oidcEnabled = true`, `modeResolved = false`. Strict par défaut afin que le formulaire email ne soit jamais affiché avant que le contrat serveur soit connu.

> `initialize()` elle-même n'attend jamais la sonde réseau — elle est appelée depuis `provideAppInitializer` et Angular ne rend rien tant qu'elle ne se résout pas. Le route guard et la page login tolèrent l'état transitoire « non résolu » (repli IndexedDB, signal `modeResolved`).

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

Méthode publique qui ré-exécute la sonde et upsert l'utilisateur lorsque des claims sont renvoyées ; en cas de succès, elle efface aussi `serverSessionInvalid`. Appelée depuis trois endroits : le chemin rapide cache-first dans `initialize()` (§4.2, étape 2), le gestionnaire de reconnexion `online` du navigateur (§4.6), et disponible pour être déclenchée manuellement afin de forcer une vérification fraîche.

### 4.5 Route guard

[auth.guard.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/guards/auth.guard.ts) :
- Si `currentUser()` est non nul → autorise.
- Sinon tente une restauration depuis IndexedDB (`tryRestoreFromCache`).
- Sinon redirige vers `/login`.

Toutes les routes enfant de `LoggedLayoutComponent` portent `canActivate: [authGuard]` ([app.routes.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/app.routes.ts)).

### 4.6 Détection d'incohérence de session & resynchronisation automatique

Deux détecteurs indépendants alimentent le même chemin de récupération, car une session obsolète peut se manifester soit par un échec HTTP en page, soit par un échec de navigation :

| Détecteur | Où | Se déclenche sur |
|---|---|---|
| `authSessionInterceptor` | Intercepteur HTTP ([auth-session.interceptor.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/auth/auth-session.interceptor.ts)), enregistré via `provideHttpClient(withInterceptors([authSessionInterceptor]))` | Toute requête same-origin échouant avec `401`/`403` |
| Gestionnaire de navigation du Service Worker | [service-worker.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/core/services/worker_update/service-worker.ts) `handleFetch()` | Une requête de navigation répondue par un `401`/`403` brut **et** aucun shell installé en cache — redirige vers `/auth/relogin` (302) plutôt que de laisser fuiter le corps d'erreur brut d'Apache |

- Les deux appellent `AuthService.markServerMismatchFromStatus(status)`, qui définit `serverSessionInvalid = true` uniquement pour `401`/`403` (les autres statuts, par ex. `5xx` transitoires, sont sans effet).
- `shouldForceServerResync()` vaut `true` quand `serverSessionInvalid()` est défini **et** que le navigateur est en ligne — cela force `initialize()`/`tryRestoreFromCache()` à se méfier du cache IndexedDB et à re-résoudre depuis le réseau.
- `AuthResyncService.triggerImmediateRedirect()` effectue la récupération proprement dite : une navigation top-level vers `/auth/login` (forçant à nouveau le prompt G@IA). Protégée par :
  - un **cooldown de 15 s** (`AUTH_RESYNC_REDIRECT_COOLDOWN_MS`), persisté dans `sessionStorage` (`auth_resync:last_redirect_at`) afin que des requêtes en échec concurrentes ne déclenchent qu'une seule redirection ;
  - des **chemins supprimés** — aucune redirection n'est déclenchée lorsqu'on est déjà sur `/auth/*` ou `/login` (`isRedirectSuppressedPath`), pour éviter les boucles ;
  - une **protection hors ligne** — aucune redirection tant que `navigator.onLine === false`.
- `AuthService` écoute également l'événement `online` du navigateur : elle ré-exécute `refreshFromNetwork()` et, si l'incohérence est toujours prouvée ensuite, appelle `triggerImmediateRedirect()` — de sorte qu'un utilisateur passé hors ligne au moment même où l'incohérence a été détectée ne reste pas bloqué indéfiniment une fois la connectivité revenue.

### Page `/login` — fallback email uniquement
Quand OIDC est indisponible (ex : dev sans mock claims), [login-page.component.ts](https://github.com/phlowers/phlowers-stellar-app/blob/main/src/app/features/auth/presentation/pages/login-page/login-page.component.ts) affiche un formulaire email. `loginWithEmail()` crée/retrouve un User dans IndexedDB et définit le signal — **aucune vérification de mot de passe**, il s'agit purement d'un mode dégradé local.

---

## 5. Stockage et modèle

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

Schéma Dexie : `users: '&email, sub'` (clé primaire = `email`, index secondaire = `sub`).

`upsertUser(claims)` préserve les champs `uuid` et `studies` existants lors de l'écrasement. Les utilisateurs ne sont **jamais supprimés** (politique délibérée : les études restent rattachées à leur propriétaire).

> Note : le CGI renvoie également `rte_group`, qui ne fait actuellement pas partie de `OidcClaims` et n'est donc pas persisté par la SPA.

---

## 6. Tokens, refresh, logout

| Aspect | Où c'est géré |
|---|---|
| Access / refresh tokens | **Apache uniquement**, dans des cookies HTTP-only — JS n'y a aucun accès |
| Rafraîchissement de l'access token | **Délibérément aucun.** `OIDCRefreshAccessTokenBeforeExpiry` n'est intentionnellement PAS défini (voir §7.1) — l'application ne consomme jamais l'access_token en amont, et le rafraîchissement proactif a causé des incidents fatals à la session avec les refresh tokens rotatifs de G@IA. La validité de session repose uniquement sur le cookie Apache. |
| Détection d'expiration | `/auth/userinfo` → `{ authenticated: false }` (ou HTTP `401` pour les serveurs legacy) ; une requête/navigation en direct renvoyant `401`/`403` est également capturée par `authSessionInterceptor` / le Service Worker (§4.6) |
| Header `Authorization` | **Aucun intercepteur HTTP n'injecte de Bearer token** — tout transite par les cookies. `authSessionInterceptor` existe, mais uniquement pour *détecter* les incohérences de session `401`/`403` et déclencher une resynchronisation (§4.6) |
| Logout | **Aucune méthode Angular, aucun bouton UI** — par conception (`connexion-gaia.md` §2). La durée de vie de la session est imposée par Apache (`OIDCSessionInactivityTimeout 604800` = 7 jours, `OIDCSessionMaxDuration 2592000` = 30 jours). |

---

## 7. Configuration côté serveur

Les directives OIDC vivent dans `httpd-oidc.conf.template` (racine du dépôt, résolu par `docker/entrypoint.sh` via `envsubst` avant le démarrage d'Apache) — pas dans un fichier Angular. Directives clés actuellement configurées :

- `OIDCResponseType code` + `OIDCPKCEMethod S256` — Authorization Code + PKCE.
- `OIDCSessionType client-cookie` (tokens chiffrés AES côté client via `OIDCCryptoPassphrase`), `OIDCSessionInactivityTimeout 604800` (7 jours), `OIDCSessionMaxDuration 2592000` (30 jours).
- `OIDCPassClaimsAs both`, `OIDCPassAccessToken On`, `OIDCPassIDTokenAs claims`, `OIDCPassRefreshToken Off`, `OIDCRemoteUserClaim sub` — claims exposées comme variables d'env `OIDC_CLAIM_*` (et, pour la claim `roles` portée dans l'access token, `OIDC_ACCESS_TOKEN_CLAIM_*`) aux CGI.
- `OIDCCookieSameSite Lax`, `OIDCCookieHTTPOnly On`, nom de cookie `mod_auth_openidc_session`, `Secure` forcé via `SetEnv OIDC_SET_COOKIE_APPEND Secure`.
- `OIDCSSLValidateServer On` ; `OIDCHTTPTimeoutLong 10` / `OIDCHTTPTimeoutShort 5` pour les appels sortants d'Apache vers G@IA (le `USERINFO_PROBE_TIMEOUT_MS = 13000` côté client dans `auth.service.ts` doit rester strictement supérieur à `OIDCHTTPTimeoutLong` afin de ne jamais entrer en concurrence avec l'appel propre d'Apache).
- `OIDCRedirectURLsAllowed` restreint au propre host public de l'application — protection contre l'open-redirect pour les paramètres `target_link_uri`/logout fournis par l'utilisateur (ne gouverne pas la redirection normale post-login, qui provient de l'état OIDC chiffré).
- `<Location />` → `Require valid-user` (toute l'app protégée).
- `<Location /auth/userinfo>` → `OIDCUnAuthAction pass` afin que le CGI puisse répondre `{ authenticated: false }` au lieu de renvoyer `401`.
- `<Location /auth/login>` → `OIDCUnAuthAction auth`, de sorte qu'une requête non authentifiée déclenche la redirection G@IA.
- `<Location /auth/relogin>` → `OIDCUnAuthAction pass` ; efface le cookie local `mod_auth_openidc_session` via un header de réponse `Set-Cookie ... Max-Age=0`, puis `Redirect 302` vers `/auth/login`. N'utilise délibérément **pas** le paramètre `?logout=` de mod_auth_openidc (celui-ci effectue un RP-initiated logout auprès de G@IA, laissant l'utilisateur bloqué sur la page « Sign off successful » de G@IA, dont la cible de redirection n'est pas whitelistée).

### 7.1 Absences délibérées (issues d'incidents — ne pas rajouter sans lire le commentaire source)

- **Pas de `OIDCRefreshAccessTokenBeforeExpiry`.** Le rafraîchissement proactif de l'access token a été supprimé après deux incidents du 10/08/2026 : cette application ne consomme jamais l'access_token en amont, et les refresh tokens rotatifs à usage unique de G@IA combinés aux sessions `client-cookie` provoquaient une course entre requêtes navigateur concurrentes sur le même refresh token, tuant toute la famille de tokens (`invalid_grant`, 502 en cascade). Combiné à `logout_on_error`, cela provoquait un blocage de connexion instantané dès le premier échec de rafraîchissement.
- **Pas de `ErrorDocument 401`.** Un `ErrorDocument` 401 pointant vers un endpoint de relogin signifie qu'un `401` isolé quelconque (par ex. une requête `favicon.ico` en concurrence avec un rafraîchissement de session) démonte une session active. Les navigations en 401 sont plutôt récupérées côté client par le Service Worker et `reconnecting.js` (§4.6, §8) — les `401` hors navigation restent de simples `401`.
- **`ErrorDocument 400` → `/__access-denied.html`** et **`ErrorDocument 502/503/504` → `/__reconnecting.html`** sont les seules redirections d'erreur côté serveur, toutes deux servies depuis des blocs `<Location>` publics, contournant l'OIDC (`httpd.conf.patch`), afin que la sous-requête d'erreur interne ne soit pas elle-même capturée par le catch-all OIDC.

### 7.2 Scripts CGI

- [docker/cgi-bin/userinfo.sh](https://github.com/phlowers/phlowers-stellar-app/blob/main/docker/cgi-bin/userinfo.sh) — renvoie toujours `200 OK` avec `{ authenticated, oidcEnabled, … }`. Le flag `oidcEnabled` provient de la variable d'env `OIDC_ENABLED` injectée par l'entrypoint. Les claims sont encodées en JSON via `jq` (pas d'interpolation de chaîne, aucun risque d'injection). La claim `roles` est lue depuis `OIDC_ACCESS_TOKEN_CLAIM_roles` (CSV ou variables d'env indexées `_0`, `_1`, …), avec repli sur `OIDC_CLAIM_roles` pour les IdP qui la reflètent dans l'id_token/userinfo.
- [docker/cgi-bin/login.sh](https://github.com/phlowers/phlowers-stellar-app/blob/main/docker/cgi-bin/login.sh) — ne s'exécute qu'après un callback G@IA réussi ; émet `302 Location: /`. Revenir ici (plutôt que directement vers `/`) garantit une URL d'atterrissage connue, bypassée par le Service Worker.

---

## 8. Interactions PWA / Service Worker

- [dev-mock/oidc-middleware.mjs](https://github.com/phlowers/phlowers-stellar-app/blob/main/dev-mock/oidc-middleware.mjs) est branché via `angular.json` (option `serve`).
- Il intercepte `GET /auth/userinfo` et renvoie le contenu de `dev-mock/oidc-claims.json` (gitignoré).
- Si le fichier n'existe pas → `{ authenticated: false }` → l'application se replie sur la page `/login`.

```bash
cp stellar/dev-mock/oidc-claims.example.json stellar/dev-mock/oidc-claims.json
npm start
```

---

## 9. Ce qui est délibérément absent

- ❌ Aucune librairie OIDC côté client, aucune gestion de PKCE dans Angular.
- ❌ Aucun `HttpInterceptor` injectant un Bearer token (le seul intercepteur existant, `authSessionInterceptor`, ne fait que détecter les incohérences de session `401`/`403` et déclencher une redirection de resynchronisation — voir §4.6).
- ❌ Aucune variable d'environnement OIDC dans Angular (`clientId`, `redirectUri`, scopes…). Toute la configuration OIDC vit dans Apache.
- ❌ Aucun `/.well-known/openid-configuration` consommé côté front.
- ❌ Aucun bouton ni route de logout dans l'UI (délibéré — voir `connexion-gaia.md`).
- ❌ Aucun stockage de token côté client (`localStorage`, `sessionStorage`, tokens en mémoire).
- ❌ Aucune suppression automatique des utilisateurs en cache (la table préserve les études rattachées).

---

## 10. Résumé en une phrase

> Apache gère tout l'OIDC (PKCE, tokens, cookies, redirections — délibérément sans rafraîchissement proactif). Angular **sonde `/auth/userinfo`** pour découvrir le mode côté serveur, **met en cache les claims OIDC dans IndexedDB** pour un usage hors ligne, expose les signals `currentUser` / `oidcEnabled` / `modeResolved`, **détecte les incohérences de session prouvées** (intercepteur HTTP + Service Worker) pour rediriger automatiquement vers **`/auth/login`** (à débit limité via `/auth/relogin`), et propose un **login email dégradé** uniquement lorsque le serveur annonce `oidcEnabled: false`.
