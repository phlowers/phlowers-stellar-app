# Tests end-to-end

Les tests end-to-end (e2e) vérifient le déroulé de la mise à jour de l'application dans un vrai
navigateur Chromium avec [Playwright](https://playwright.dev). Ils s'exécutent sur un build de
production servi par un serveur de simulation, car le service worker est désactivé sous `ng serve`.

Sources : `e2e/` (specs, helpers et serveur de simulation) et `playwright.config.ts`.

## Installation

`@playwright/test` est déjà une dépendance de développement. Installez les dépendances du projet,
puis le navigateur Chromium utilisé par Playwright :

```shell
npm ci
npx playwright install chromium
```

## Build

Les tests servent le dossier `dist/` : construisez d'abord l'application (le service worker est
recompilé par la même commande) :

```shell
CI_COMMIT_SHA=$(git rev-parse HEAD) npm run build
```

`CI_COMMIT_SHA` est l'identité de version du build. Depuis un dépôt git, `git rev-parse HEAD` est
utilisé lorsqu'il n'est pas défini ; hors d'un dépôt git, le build échoue sans lui.

## Serveur de simulation et scénarios

`e2e/update-sim-server.mjs` sert `dist/` sur `http://127.0.0.1:4310` (`E2E_PORT` pour changer le
port, `E2E_DIST_DIR` pour servir un autre dossier). Playwright le démarre automatiquement
(`webServer` dans `playwright.config.ts`) et réutilise un serveur déjà lancé hors CI. Pour le
démarrer à la main :

```shell
npm run update:sim
```

Le serveur réécrit l'identité du build (`git_hash`, `version`, date de build) selon le scénario
courant, défini par `POST /__e2e/scenario?v=<scenario>` :

| Scénario | Contenu |
|---|---|
| `v1`, `v2`, `v3` | trois versions distinctes, chacune avec son propre catalogue de câbles |
| `v2-broken` | une ressource du manifeste répond 404 |
| `v2-badhash` | mauvais hash de catalogue |
| `v1-rebuild` | même commit que `v1` rebuildé : même `git_hash`, nouvelle date de build |
| `v2-slow` | 300 ms par fichier |
| `v2-big` | fichier de 30 Mo |

Les pannes (fichier bloqué, 502 passagère, redirection OIDC, manifeste qui ne répond jamais...)
sont injectées par `POST /__e2e/faults`, `POST /__e2e/auth?authenticated=false` simule une session
expirée et `GET /__e2e/requests` liste les fichiers demandés. La liste complète des paramètres se
trouve dans [Processus de mise à jour de l'application](app/application_update.md), section
« Tester en local ».

## Lancer les tests

```shell
npm run e2e:update          # déroulé de la mise à jour : première installation, popup, rollback, catalogues, hors ligne
npm run e2e:update-faults   # pannes : service worker arrêté, fichier bloqué, 502, même commit...
npm run e2e:headed          # toutes les specs, navigateur visible
```

Les tests s'exécutent un par un (`workers: 1`) avec un nouvel essai ; une trace est enregistrée au
premier nouvel essai (`npx playwright show-trace <trace.zip>` pour l'ouvrir).

## Ajouter un test

1. Ajoutez un `test()` dans `e2e/update-flow.spec.ts` (déroulé nominal) ou
   `e2e/update-faults.spec.ts` (pannes), ou créez un nouveau fichier `e2e/*.spec.ts`.
2. Réutilisez les helpers de `e2e/update-flow.helpers.ts` : `setScenario`, `setAuthenticated`,
   `waitForFirstInstall`, `readSnapshot` (cache actif, cache `previous`, version, catalogue),
   `setFaults` / `resetFaults` et `getRequestLog`.
3. Ciblez les éléments de l'interface par leur `data-testid` (`page.getByTestId(...)`) ou leur
   rôle ARIA.
4. Réinitialisez l'état du serveur dans `afterEach` (`resetFaults`, `setScenario(request, 'v1')`) :
   le serveur est partagé par tous les tests.
5. Un nouveau scénario se déclare dans `e2e/update-sim-server.mjs`, dans `SCENARIO_VERSIONS` (son
   `git_hash` doit ressembler à un SHA de commit : 7 à 40 caractères hexadécimaux) et dans
   `csvVersions`.
6. Rebuildez (`npm run build`) dès que le code de l'application a changé, puis lancez la spec :
   `npx playwright test e2e/<fichier>.spec.ts`.
