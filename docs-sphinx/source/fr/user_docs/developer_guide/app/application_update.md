# Processus de mise à jour de l'application

L'application doit fonctionner hors ligne. Par conséquent, toutes les ressources doivent être téléchargées et mises en cache sur l'appareil de l'utilisateur. Elle doit également être capable de se mettre à jour elle-même lorsqu'une nouvelle version est disponible.

Les données de référence du catalogue (fichiers CSV/JSON) sont actualisées par un mécanisme
séparé et indépendant — voir [Processus de mise à jour du catalogue](catalog_update.md).

## Aperçu du Service Worker

Notre application utilise un service worker pour permettre les fonctionnalités hors ligne et gérer les mises à jour. Le service worker :

1. Met en cache les ressources de l'application lors de l'installation
2. Vérifie l'existence de nouvelles versions au chargement de l'application
3. Gère le processus de mise à jour lorsqu'une nouvelle version est disponible
4. Sert les ressources mises en cache lorsque l'utilisateur est hors ligne

Les fichiers de catalogue (`/data/*.csv`, `/data/obstacle_configuration.json`) sont **exclus**
du manifeste des ressources de l'application (`files`) — le service worker ne les
télécharge ni ne les met en cache. Seuls leurs hachages SHA-256 sont listés, sous
`data_hashes`, à l'usage du mécanisme de mise à jour du catalogue.

## Mécanisme de mise à jour

### Comment fonctionnent les mises à jour

1. Lorsqu'un utilisateur navigue vers l'application, `UpdateService` récupère `/assets_list.json` et compare le `build_id` de la version en cours (intégré au JS au moment du build) avec le `build_id` du manifeste serveur. Le `git_hash` et l'horodatage du build ne servent qu'à l'affichage : deux builds peuvent les partager (ou avoir `unknown` comme hash), seul le `build_id` identifie un build.

2. Si les deux diffèrent, l'application affiche la popup de mise à jour (`pendingAction === 'update-available'`).

3. L'utilisateur accepte la popup, ou clique sur le bouton « Mettre à jour » de la page /admin, pour télécharger la nouvelle version.

4. Pendant le processus de mise à jour, le service worker :
   - Télécharge les nouvelles ressources dans leur propre cache (la version active n'est jamais touchée)
   - Écrit `/app_version` en dernier, ce qui marque le cache comme complet
   - Bascule le pointeur d'activation, conserve la version précédente pour un rollback et supprime les caches plus anciens
   - Envoie `update_complete` à tous les onglets ouverts

### Autorisation et points d'entrée

`WorkerUpdateService` (`stellar/src/app/core/services/worker_update/worker_update.service.ts`)
est la seule classe autorisée à envoyer des commandes `install`/`update` au service
worker, via trois intentions explicites, réservées aux utilisateurs authentifiés :

- `confirmUpdate()` — l'utilisateur accepte la popup de mise à jour (`pendingAction` doit être
  `'first-install'` ou `'update-available'`).
- `forceUpdateFromAdmin()` — un clic explicite sur la page `/admin` (nécessite
  `pendingAction === 'update-available'`).
- `installFirstLaunch()` — la seule action autorisée à s'exécuter automatiquement, et uniquement
  lorsque le cache du service worker est confirmé vide (`pendingAction === 'first-install'`)
  **et** que l'utilisateur est authentifié.

Les trois méthodes lisent `AuthService.currentUser()` (lecture seule) et renvoient `false` sans
envoyer aucun message si l'utilisateur n'est pas authentifié ou si l'action en attente ne
correspond pas.

### Activation versionnée et atomique

Les versions de l'application sont activées de manière atomique afin d'éviter toute fenêtre hors ligne avec un
cache partiellement rempli :

- Chaque version est mise en cache sous son propre nom `app-assets-v-<build_id>` ; un petit cache
  de contrôle (`app-assets-control`) stocke le pointeur vers le cache actuellement `active`
  et conserve le `previous` pour un éventuel rollback.
- Une version candidate n'est entièrement préparée (y compris une vérification que
  `/index.html` et toutes les ressources du manifeste sont présentes) **qu'avant** le basculement
  du pointeur de contrôle — une seule écriture, effectuée uniquement en cas de succès complet.
- Un téléchargement dans le cache actuellement actif est refusé (`Refusing to precache into the active cache`), de même qu'un manifeste sans `build_id`.
- En cas d'échec avant l'activation, seule la version candidate incomplète est écartée ; la
  version active continue de servir l'application sans être affectée.
- La gestion des requêtes fetch résout une unique version cohérente par requête (active, ou
  previous en repli) — elle ne mélange jamais les ressources de deux versions. La seule exception
  est un fichier Angular au nom hashé (`chunk-XXXXXXXX.js`, `*.css`) absent du cache actif : il est
  cherché dans le cache `previous` avant le réseau, afin qu'un onglet qui exécute encore l'ancienne
  version puisse charger ses chunks chargés à la demande.

### Robustesse du téléchargement (service worker)

- Une seule installation/mise à jour à la fois : une demande reçue pendant un téléchargement le
  rejoint. Chaque gestionnaire est passé à `event.waitUntil()` pour que le navigateur n'arrête pas
  le service worker en plein téléchargement.
- 5 fichiers sont téléchargés en parallèle. Un fichier échoue lorsqu'**aucun octet** (en-têtes ou
  contenu) n'arrive pendant 30 s ; un fichier bloqué n'est pas réessayé et l'erreur le nomme.
- Les erreurs réseau et les 5xx sont réessayées 3 fois (1 s, 2 s, 4 s). Les 401, 403, redirections
  (session OIDC expirée) et autres 4xx ne sont jamais réessayées : l'erreur contient « authentication
  required » et la page invite l'utilisateur à se reconnecter.
- Reprise : un cache sans le marqueur `/app_version` est une tentative partielle précédente (par
  exemple le service worker a été arrêté) ; les fichiers qu'il contient déjà ne sont pas
  retéléchargés.

### Surveillance côté page

Pendant une mise à jour, `UpdateService` :

- Envoie un message `keepalive` toutes les 10 s. Le service worker répond par un message `progress`
  (`run: null` lorsqu'il n'a aucune mise à jour en cours, par exemple parce que le navigateur l'a
  arrêté puis relancé). `progress` est aussi envoyé à toutes les pages chaque fois que le pourcentage
  entier de fichiers en cache change ; il alimente la barre de progression (`updateProgress`, 0-100).
- Quitte immédiatement l'état de chargement sur `run: null`, et après 45 s sans aucun message du
  service worker (`UPDATE_WATCHDOG_TIMEOUT_MS`, maintenu au-dessus du délai de 30 s par fichier pour
  que le service worker signale d'abord sa propre erreur). Elle journalise alors l'erreur et affiche
  « Mise à jour interrompue ». La fenêtre réaffiche ses boutons « Plus tard » / « Mettre à jour » :
  elle peut être fermée, ou la mise à jour relancée (le cache partiel est repris).
- Abandonne après 10 s lorsque `navigator.serviceWorker.ready` ne se résout jamais
  (`UPDATE_SW_READY_TIMEOUT_MS`).
- Notifie l'utilisateur lorsque le bouton « Mettre à jour » de la popup n'a pas pu démarrer la mise
  à jour (`AppComponent.onConfirmUpdate()`).

### Autres onglets ouverts

`update_complete` est envoyé une seule fois à tous les onglets ouverts. L'onglet qui a lancé la
mise à jour va sur `/` ; les autres onglets se rechargent sur place, car ils exécutent encore
l'ancien code. `install_complete` et les erreurs ne sont envoyés qu'à la page qui les a demandés.

### Identité du build

`scripts/set-env-variables.py` est l'unique générateur de l'identité du build : un `build_id`
unique (uuid4), l'heure de build UTC et le `git_hash`. Il les injecte dans le JS et écrit
`dist/version.json` ; `create_assets_list_for_service_worker.py` recopie ce fichier dans
`assets_list.json`. Le build échoue lorsque le hash git vaut `unknown` : fournissez un dépôt git ou
`CI_COMMIT_SHA` (le `Dockerfile` contient `ARG CI_COMMIT_SHA` ; la CI doit passer
`--build-arg CI_COMMIT_SHA=$CI_COMMIT_SHA`).

### Logs

Chaque étape d'une mise à jour est journalisée, dans la console uniquement :

- `[UPDATE <runId>] <step> +<ms>ms` — émis par le service worker (manifeste, début du precache,
  `progress` tous les 10 %, `file-retry` / `file-failed` avec chemin, statut HTTP, tentative et
  durée, activation, nettoyage, `done` / `failed`) et relayé dans la console de la page. Toutes les
  lignes d'une même mise à jour partagent le même `runId`.
- `[UPDATE page] ...` — émis par la page (vérification de version, actions refusées, messages
  reçus, délais dépassés, interruptions).

Filtrez la console de la page sur `[UPDATE`. La console propre au service worker est disponible dans
`chrome://serviceworker-internals` (ou DevTools > Application > Service Workers > inspect). Pour
savoir où et pourquoi une mise à jour s'est arrêtée, lisez la dernière ligne `[UPDATE <runId>]` :
`file-failed` nomme le fichier et la cause, l'absence de `done` / `failed` après `precache-start`
signifie que le service worker s'est arrêté, et `[UPDATE page] update interrupted` donne la raison
vue par la page.

### Tester en local

Le service worker est désactivé sous `ng serve` (`!isDevMode()` dans `src/main.ts`) : les mises à
jour se testent donc sur un build de production servi par un serveur de simulation :

```bash
npm run build
npm run update:sim   # sert dist/ sur http://localhost:4310 (E2E_PORT pour le changer)
```

Ouvrez `http://localhost:4310`, puis publiez une autre version et rechargez la page :

```bash
curl -X POST "localhost:4310/__e2e/scenario?v=v2"
```

Scénarios : `v1`, `v2`, `v3`, `v2-broken` (un fichier renvoie 404), `v2-badhash` (mauvais hash de
catalogue), `v2-samehash` (même `git_hash` et même `version` que `v1`, `build_id` différent),
`v2-slow` (300 ms par fichier) et `v2-big` (fichier de 30 Mo). Injection de pannes
(`/__e2e/faults`, query string) :

| Paramètre | Effet |
|---|---|
| `latencyMs=N` | retarde chaque fichier de l'application de N ms |
| `stall=/path` | le fichier ne répond jamais (connexion laissée ouverte) |
| `fail=/path&status=502&count=2` | les `count` prochaines requêtes du fichier échouent avec `status` |
| `redirectAfter=N` | répond 302 vers `/auth/login` une fois plus de N fichiers de l'application demandés |
| `reset=true` | supprime toutes les pannes et vide le journal des requêtes |

`GET /__e2e/requests` renvoie les fichiers de l'application demandés depuis la dernière
réinitialisation (pour compter les retéléchargements lors d'un nouvel essai), et
`POST /__e2e/auth?authenticated=false` simule une session expirée. Pour simuler l'arrêt du service
worker, cliquez sur « Stop » dans `chrome://serviceworker-internals` pendant la mise à jour.

Tests automatisés (lancez d'abord `npm run build`, le service worker est recompilé) :

- `npm run e2e:update` — le déroulé de la mise à jour (première installation, popup, rollback,
  catalogues, hors ligne).
- `npm run e2e:update-faults` — les pannes : service worker arrêté en plein téléchargement, fichier
  bloqué, 502 passagère, même `git_hash` et même `version`, autre onglet rechargé, reprise après un
  nouvel essai.

### Génération de la liste des ressources

Le service worker s'appuie sur une liste pré-générée de ressources à mettre en cache afin de télécharger les bonnes ressources lorsqu'une mise à jour est disponible. Cette liste est créée pendant le processus de build à l'aide du script `create_assets_list_for_service_worker.py`.

#### Gestion des paquets Python

Les paquets Python (mechaphlowers et ses dépendances) sont gérés par le script `set_up_mechaphlowers.py`, qui :
- Détecte automatiquement toutes les dépendances (26 paquets)
- Privilégie les versions CDN lorsqu'elles sont disponibles (14/26 depuis le CDN Pyodide)
- Télécharge les paquets restants via pip (12/26)
- Optimise les wheels avec une compression Brotli/Gzip
- Stocke les paquets localement dans `public/pyodide/`

Exécutez le script de configuration avant de builder :
```bash
npm run set-up-mechaphlowers
```

#### Commandes de la liste des ressources

`npm run build` l'exécute automatiquement après `ng build`. Elle peut également être exécutée manuellement :

- `npm run create-assets-list-for-service-worker` - Génère la liste des ressources pour l'unique sortie de build Transloco dans `dist/`

Cette commande exécute le script Python qui :
1. Parcourt récursivement le répertoire de build `dist/`
2. Crée une liste de tous les fichiers (à l'exclusion des éléments sur liste noire comme le service worker lui-même)
3. Inclut les paquets Python présents dans `public/pyodide/` (gérés par `set_up_mechaphlowers.py`)
4. Génère les informations de version, lues depuis `dist/version.json` (écrit par `set-env-variables.py`), notamment :
   - Le `build_id` unique
   - Le hash du commit Git (affichage uniquement)
   - L'horodatage du build
   - La version de l'application depuis package.json
5. Écrit la liste complète des ressources dans `assets_list.json`
