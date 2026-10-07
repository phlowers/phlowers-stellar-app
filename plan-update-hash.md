# plan-update-hash.md
Plan de réalisation agentique : restauration de l'identité de version par `git_hash` et renforcement des garde-fous de mise à jour PWA
> Généré par le skill `rte-taskfile` le 2026-10-07. Norme : gemini-taskfile.
> Branche analysée : `fixbug/error-update-app-pwa` (commit `195370e0`) vs `dev`.

---

## Contrat qualité / Definition of Done (NON NÉGOCIABLE)

```yaml
# Le sizing mesure l'effort de PILOTAGE humain + le périmètre.
# Il ne mesure JAMAIS la profondeur d'analyse attendue du modèle.
# Profondeur d'analyse attendue = MAXIMALE sur chaque tâche, quel que soit le sizing.

quality_contract:
  model:            "Assistant de code configuré (GitHub Copilot / JetBrains AI), mode agent si disponible"
  depth:            "MAX — un sizing S/M n'autorise jamais à bâcler"
  method:           "Méthode complète, raisonnement explicite, pas de raccourci"
  sources:          "Toute affirmation factuelle est sourcée et vérifiée avant usage"
  self_review:      "Auto-revue adversariale avant de marquer une tâche done"
  no_stub:          "Zéro stub, zéro mock, zéro TODO sur la logique cœur — code/livrable production-ready"
  human_in_loop:    "L'intention et les exigences restent une responsabilité HUMAINE ;
                     les agents proposent, observent, signalent — ils ne formulent pas l'intention."
```

---

## Règle de découpage des tâches

```yaml
task_sizing:
  max_human_effort:      "4h"
  max_augmented_effort:  "10min"
  target_augmented:      "5min"
  sizing_guide:
    XS: "< 5min augmente  / < 30min humain"
    S:  "< 10min augmente / < 1h humain"
    M:  "< 20min augmente / < 2h humain"
    L:  "< 30min augmente / < 4h humain"
    XL: "A redecouper obligatoirement"
  split_triggers:
    - "La description contient plus de 3 livrables distincts"
    - "Les success_criteria depassent 5 items"
    - "La tache touche plus de 3 domaines techniques differents"
    - "L'estimation depasse L"
```

---

## Project Toolings

```yaml
toolings:
  stack:
    frontend:   ["Angular 21.2 (standalone, signals)", "PrimeNG 21.1", "Transloco", "Service Worker custom (src/app/core/services/worker_update/service-worker.ts, compilé par tsc vers public/service-worker.js)"]
    backend:    ["Apache + mod_auth_openidc (OIDC, hors dépôt)"]
    database:   ["Cache Storage (app-assets-v-*, app-assets-control)", "IndexedDB/Dexie (non concerné)"]
    infra:      ["Pipeline de build et de déploiement quotidien du serveur dev (hors dépôt ; le Dockerfile du dépôt n'est PAS utilisé)"]

  languages:
    - ["TypeScript 5.9", "Python 3.12/3.13 (scripts de build via uv)", "JavaScript ESM (e2e/update-sim-server.mjs)"]

  mcp_servers: []

  skills:
    - name: "skill-test"
      path: ".github/skills/skill-test/SKILL.md"
    - name: "skill-fix-test"
      path: ".github/skills/skill-fix-test/SKILL.md"
    - name: "skill-translate-docs"
      path: ".github/skills/skill-translate-docs/SKILL.md"

  agents:
    - name: "Explore"
      role: "Recherche read-only dans le dépôt (vérification des usages build_id/git_hash)"

  external_tools:
    - name: "Playwright 1.61"
      purpose: "e2e update-flow / update-faults sur e2e/update-sim-server.mjs"
    - name: "Vitest 4.1"
      purpose: "Tests unitaires service-worker.spec.ts / worker_update.service.spec.ts"

  conventions:
    branch_strategy: "Travail sur fixbug/error-update-app-pwa ; jamais de commit/push par l'agent"
    commit_format:   "Commit manuel par le dev (signed-off)"
    test_framework:  "Vitest (unit) + Playwright (e2e)"
    coverage_min:    "non configuré (aucun seuil dans vitest.config.ts)"
    lint:            "npm run lint-check (ESLint)"
    env_file:        "src/environments/environment.ts (placeholders remplacés par scripts/set-env-variables.py)"
```

---

## Conventions

```yaml
priority_levels:
  critical: "Bloquant pour la suite - livrer en premier"
  high:     "Important - livrer dans la phase courante"
  medium:   "Valeur ajoutee - livrer si le temps le permet"
  low:      "Nice-to-have - backlog"

naming_convention:
  phases:   "P{phase_number}      ex: P0, P1, P2"
  tasks:    "P{phase}-{sequence}  ex: P0-01, P1-03"
  backlog:  "BL-{sequence}        ex: BL-01"
```

---

## Hypothèses à valider avant exécution

```yaml
hypotheses:
  H1: "Identité de version = git_hash seul. Sur dev la comparaison était git_hash && version ; un changement de version implique un nouveau commit, donc git_hash suffit."
  H2: "Le pipeline de build réel (hors dépôt) fournit à set-env-variables.py le SHA du commit déployé, via CI_COMMIT_SHA ou un checkout git accessible. Sinon le build échoue (fail-fast conservé, set-env-variables.py:38)."
  H3: "Un rebuild du même commit avec un contenu différent (ex. dépendances résolues différemment) ne déclenche PAS de mise à jour : comportement voulu."
  H5: "Le Dockerfile du dépôt n'est pas utilisé pour le build ni le déploiement : il est hors périmètre de ce plan."
  H4: "build_datetime_utc reste écrit dans version.json et dans le JS, pour l'affichage uniquement."
```

---

## Phase 0 - Prérequis

### P0-01: Vérifier la transmission de CI_COMMIT_SHA par le pipeline de déploiement dev
```yaml
id: P0-01
title: "Vérifier la transmission de CI_COMMIT_SHA par le pipeline de déploiement dev"
phase: "Phase 0 - Prérequis"
priority: critical
status: todo
completion: 0%
last_update: "2026-10-07"

responsible:
  lead: "tech-lead"
  support: ["devops"]

sizing:
  estimate: XS
  human_effort: "~20min"
  augmented_effort: "~5min"

description: |
  set-env-variables.py lit le git_hash dans CI_COMMIT_SHA, puis via 'git rev-parse HEAD'. Si les deux
  échouent, la valeur retombe sur "unknown" (lignes 22-35). Sur dev, cela suffisait à donner la même
  identité et le même cache "app-assets-v-unknown" à tous les builds, ce qui a pu motiver le passage au
  build_id uuid4. Avant de revenir au git_hash, il faut prouver que le pipeline de build réel (hors
  dépôt, distinct du Dockerfile du dépôt) fournit le SHA du commit déployé.

dependencies: []

toolings_used:
  stack:          ["Pipeline de build et de déploiement dev (hors dépôt)"]
  mcp_servers:    []
  skills:         []
  agents:         []
  external_tools: ["Console du pipeline CI/CD"]

definition_of_ready:
  - "Accès en lecture à la définition du pipeline de déploiement dev"
  - "Critère d'acceptation non ambigu : 'l'étape npm run build du pipeline voit CI_COMMIT_SHA=<sha 40 hex> ou un dépôt git valide'"

success_criteria:
  - description: "L'étape de build du pipeline dev fournit le SHA du commit déployé (CI_COMMIT_SHA ou git)"
    validated: false
  - description: "Le pipeline exécute bien 'npm run build' (donc set-env-variables.py puis create_assets_list_for_service_worker.py)"
    validated: false
  - description: "Deux déploiements consécutifs du même commit produisent le même git_hash dans /version.json du serveur dev"
    validated: false

tests:
  - name: "pipeline-commit-sha"
    type: "review"
    assertion: "Les logs de build du pipeline dev n'affichent pas 'Error: git hash is unknown' et le git_hash de dist/version.json égale le SHA du commit construit"
    validated: false
  - name: "pipeline-npm-run-build"
    type: "review"
    assertion: "La définition du pipeline appelle 'npm run build' (ou exécute explicitement les deux scripts Python dans cet ordre)"
    validated: false
  - name: "version-json-stable"
    type: "manual"
    assertion: "curl -s https://<dev>/version.json | jq -r .git_hash renvoie la même valeur 40-hex avant et après un redéploiement sans nouveau commit"
    validated: false

definition_of_done:
  - "Tous les success_criteria validés (validated: true)"
  - "Tous les tests passés (validated: true)"
  - "Contrat qualité global respecté (profondeur MAX, sources citées, zéro stub)"
  - "Auto-revue adversariale effectuée ; livrable relu par l'humain pilote"
  - "H2 marquée confirmée (ou bloquante remontée) dans ce plan"

files:
  create: []
  modify: []
  reference:
    - "scripts/set-env-variables.py"
    - "package.json"
```

---

## Phase 1 - Identité de version par git_hash

### P1-01: Scripts de build — git_hash comme unique identité
```yaml
id: P1-01
title: "Scripts de build — git_hash comme unique identité"
phase: "Phase 1 - Identité de version par git_hash"
priority: critical
status: done
completion: 100%
last_update: "2026-10-07"

responsible:
  lead: "dev-front"
  support: []

sizing:
  estimate: S
  human_effort: "~1h"
  augmented_effort: "~5min"

description: |
  Retirer le build_id uuid4 (set-env-variables.py:19, :60, :67, :96) ainsi que le placeholder {BUILD_ID}
  (environment.ts:13, environment.development.ts:13). set-env-variables.py reste l'unique écrivain de
  dist/version.json, avec git_hash, build_datetime_utc et version. Cette unicité corrige B12, à conserver.
  create_assets_list_for_service_worker.py valide alors git_hash au lieu de build_id (ligne 98). Le
  git_hash doit être non vide, différent de "unknown" et respecter ^[0-9a-f]{7,40}$. Le fail-fast sur un
  hash inconnu est conservé (set-env-variables.py:38).
  POURQUOI : avec un uuid4 par build, chaque déploiement quotidien d'un code identique déclenche la modale.

dependencies: [P0-01]

toolings_used:
  stack:          ["Python 3.12 (uv)", "Angular environments"]
  mcp_servers:    []
  skills:         []
  agents:         ["Explore"]
  external_tools: []

definition_of_ready:
  - "P0-01 en statut done (CI_COMMIT_SHA garanti)"
  - "H1 validée par le tech lead"

success_criteria:
  - description: "Aucune occurrence de build_id / BUILD_ID / buildId dans scripts/ et src/environments/"
    validated: false
  - description: "Deux 'npm run build' successifs sur le même commit produisent un app_version.git_hash identique dans dist/assets_list.json"
    validated: false
  - description: "create_assets_list échoue (exit 1) si version.json n'a pas de git_hash valide"
    validated: false

tests:
  - name: "grep-build-id"
    type: "review"
    assertion: "grep -rn 'build_id\\|BUILD_ID\\|buildId' scripts src/environments renvoie 0 ligne"
    validated: false
  - name: "double-build-meme-hash"
    type: "manual"
    assertion: "jq -r .app_version.git_hash dist/assets_list.json est identique après deux builds du même commit"
    validated: false
  - name: "fail-fast-hash-invalide"
    type: "manual"
    assertion: "Un version.json avec git_hash 'unknown' fait sortir create_assets_list_for_service_worker.py avec le code 1"
    validated: false

definition_of_done:
  - "Tous les success_criteria validés (validated: true)"
  - "Tous les tests passés (validated: true)"
  - "Contrat qualité global respecté (profondeur MAX, sources citées, zéro stub)"
  - "Auto-revue adversariale effectuée ; livrable relu par l'humain pilote"
  - "Suppressions consignées dans deadcode.md si un symbole devient mort"

files:
  create: []
  modify:
    - "scripts/set-env-variables.py"
    - "scripts/create_assets_list_for_service_worker.py"
    - "src/environments/environment.ts"
    - "src/environments/environment.development.ts"
  reference:
    - "package.json"
```

### P1-02: Service Worker — cache et validation du manifeste par git_hash
```yaml
id: P1-02
title: "Service Worker — cache et validation du manifeste par git_hash"
phase: "Phase 1 - Identité de version par git_hash"
priority: critical
status: done
completion: 100%
last_update: "2026-10-07"

responsible:
  lead: "dev-front"
  support: []

sizing:
  estimate: M
  human_effort: "~1h30"
  augmented_effort: "~10min"

description: |
  Nommer le cache 'app-assets-v-<git_hash>' (service-worker.ts:466-467) sans repli sur version/date :
  le repli de dev causait la collision 'unknown'. Refuser un manifeste sans git_hash valide
  (service-worker.ts:511-513), et loguer gitHash comme identité (ligne 429). Mettre à jour AppVersion
  (service-worker.interfaces.ts:1-8) : suppression de build_id, git_hash documenté comme identité.
  Conserver tous les garde-fous de la branche : refus du cache actif (ligne 518) et non-suppression de
  previous (ligne 533).

dependencies: [P1-01]

toolings_used:
  stack:          ["TypeScript", "Service Worker / Cache Storage"]
  mcp_servers:    []
  skills:         ["skill-test"]
  agents:         []
  external_tools: ["Vitest"]

definition_of_ready:
  - "P1-01 en statut done"

success_criteria:
  - description: "cacheNameForVersion renvoie 'app-assets-v-<git_hash>'"
    validated: false
  - description: "Un manifeste sans git_hash (ou 'unknown') est refusé avant toute écriture en cache"
    validated: false
  - description: "Tous les tests existants de service-worker.spec.ts passent après migration build_id -> git_hash"
    validated: false

tests:
  - name: "cache-name-git-hash"
    type: "unit"
    assertion: "Un install avec app_version.git_hash='abc1234' crée le cache 'app-assets-v-abc1234'"
    validated: false
  - name: "manifest-sans-hash"
    type: "unit"
    assertion: "updateApp() rejette /no git_hash/ et caches.open n'est pas appelé pour un cache versionné"
    validated: false
  - name: "refus-cache-actif"
    type: "unit"
    assertion: "Manifeste dont le git_hash égale celui du cache actif : cache complet => succès sans aucune écriture ; cache incomplet => rejet 'Refusing to precache into the active cache'"
    validated: false

definition_of_done:
  - "Tous les success_criteria validés (validated: true)"
  - "Tous les tests passés (validated: true)"
  - "Contrat qualité global respecté (profondeur MAX, sources citées, zéro stub)"
  - "Auto-revue adversariale effectuée ; livrable relu par l'humain pilote"
  - "npm run test -- service-worker vert"

files:
  create: []
  modify:
    - "src/app/core/services/worker_update/service-worker.ts"
    - "src/app/core/services/worker_update/service-worker.interfaces.ts"
    - "src/app/core/services/worker_update/service-worker.spec.ts"
  reference:
    - "src/app/core/services/worker_update/worker_update.service.ts"
```

### P1-03: Service Worker — retour arrière A→B→A sans corrompre le cache previous
```yaml
id: P1-03
title: "Service Worker — retour arrière A→B→A sans corrompre le cache previous"
phase: "Phase 1 - Identité de version par git_hash"
priority: high
status: done
completion: 100%
last_update: "2026-10-07"
# Un cache complet n'est jamais réécrit (réutilisé ou déjà actif), Web Lock 'app-assets-precache' entre instances
# du SW, fichiers du manifeste dédoublonnés ; un previous sans marqueur est supprimé puis reconstruit.

responsible:
  lead: "dev-front"
  support: []

sizing:
  estimate: S
  human_effort: "~1h"
  augmented_effort: "~10min"

description: |
  Avec un nom de cache déterministe par git_hash, un redéploiement d'un commit antérieur (rollback
  serveur) cible le cache 'previous'. Ce cache contient déjà le marqueur /app_version. La reprise
  (service-worker.ts:391-400) est alors ignorée et tous les fichiers sont réécrits dans un cache complet.
  En cas d'échec, ce cache n'est pas supprimé (ligne 533) : la version de repli devient un mélange de
  fichiers. Règle cible : si la cible est 'previous' et que son /app_version.git_hash correspond, activer
  directement sans téléchargement. Sinon, supprimer ce cache puis précacher à neuf.

dependencies: [P1-02]

toolings_used:
  stack:          ["TypeScript", "Service Worker / Cache Storage"]
  mcp_servers:    []
  skills:         ["skill-test"]
  agents:         []
  external_tools: ["Vitest"]

definition_of_ready:
  - "P1-02 en statut done"

success_criteria:
  - description: "Un update vers le git_hash du cache previous complet n'émet aucun fetch d'asset et bascule le pointeur"
    validated: false
  - description: "Un cache previous incohérent (marqueur absent ou hash différent) est reconstruit, jamais réécrit partiellement"
    validated: false

tests:
  - name: "rollback-sans-download"
    type: "unit"
    assertion: "control={active:B, previous:A}, manifeste A -> fetch appelé uniquement pour /assets_list.json et control devient {active:A, previous:B}"
    validated: false
  - name: "previous-incoherent"
    type: "unit"
    assertion: "previous sans /app_version -> caches.delete(previous) appelé avant le précache"
    validated: false

definition_of_done:
  - "Tous les success_criteria validés (validated: true)"
  - "Tous les tests passés (validated: true)"
  - "Contrat qualité global respecté (profondeur MAX, sources citées, zéro stub)"
  - "Auto-revue adversariale effectuée ; livrable relu par l'humain pilote"

files:
  create: []
  modify:
    - "src/app/core/services/worker_update/service-worker.ts"
    - "src/app/core/services/worker_update/service-worker.spec.ts"
  reference: []
```

### P1-04: UpdateService — comparaison par git_hash et refus des identités invalides
```yaml
id: P1-04
title: "UpdateService — comparaison par git_hash et refus des identités invalides"
phase: "Phase 1 - Identité de version par git_hash"
priority: critical
status: done
completion: 100%
last_update: "2026-10-07"

responsible:
  lead: "dev-front"
  support: []

sizing:
  estimate: S
  human_effort: "~1h"
  augmented_effort: "~10min"

description: |
  areVersionsEqual (worker_update.service.ts:607-608) compare git_hash. currentVersion (lignes 84-89)
  ne contient plus build_id. Nouveau garde-fou : un manifeste serveur sans git_hash valide doit donner
  pendingAction='none' et un log warn (lignes 306 et 345), sans modale. Sinon la modale s'ouvre et le SW
  refuse le manifeste, ce qui crée une boucle de propositions qui échouent toutes.

dependencies: [P1-01]

toolings_used:
  stack:          ["Angular signals", "TypeScript"]
  mcp_servers:    []
  skills:         ["skill-test"]
  agents:         []
  external_tools: ["Vitest"]

definition_of_ready:
  - "P1-01 en statut done"

success_criteria:
  - description: "Même git_hash avec build_datetime_utc différent => pendingAction 'none'"
    validated: false
  - description: "git_hash différent => pendingAction 'update-available'"
    validated: false
  - description: "Manifeste sans git_hash ou 'unknown' => pendingAction 'none' + logger.warn"
    validated: false

tests:
  - name: "meme-hash-date-differente"
    type: "unit"
    assertion: "checkForUpdateOnce() avec latest.git_hash === env.gitHash et une date différente => pendingAction() === 'none'"
    validated: false
  - name: "hash-different"
    type: "unit"
    assertion: "checkForUpdateOnce() avec un git_hash différent => pendingAction() === 'update-available'"
    validated: false
  - name: "hash-invalide"
    type: "unit"
    assertion: "checkAppVersion() avec git_hash 'unknown' => pendingAction() === 'none' et logger.warn appelé"
    validated: false

definition_of_done:
  - "Tous les success_criteria validés (validated: true)"
  - "Tous les tests passés (validated: true)"
  - "Contrat qualité global respecté (profondeur MAX, sources citées, zéro stub)"
  - "Auto-revue adversariale effectuée ; livrable relu par l'humain pilote"
  - "Tests 'only build_id differs' (worker_update.service.spec.ts:1053-1110) réécrits pour git_hash"

files:
  create: []
  modify:
    - "src/app/core/services/worker_update/worker_update.service.ts"
    - "src/app/core/services/worker_update/worker_update.service.spec.ts"
  reference:
    - "src/app/core/services/worker_update/service-worker.interfaces.ts"
```

### P1-05: e2e — le redéploiement d'un code identique ne déclenche aucune mise à jour
```yaml
id: P1-05
title: "e2e — le redéploiement d'un code identique ne déclenche aucune mise à jour"
phase: "Phase 1 - Identité de version par git_hash"
priority: high
status: done
completion: 100%
last_update: "2026-10-07"

responsible:
  lead: "dev-front"
  support: ["qa"]

sizing:
  estimate: M
  human_effort: "~1h30"
  augmented_effort: "~10min"

description: |
  update-sim-server.mjs repère la version à réécrire grâce au build_id (lignes 20-35) : il doit
  désormais s'appuyer sur git_hash. Retirer build_id des SCENARIO_VERSIONS et remplacer v2-samehash
  par 'v1-rebuild' : même git_hash et même asset que v1, build_datetime_utc différent. Le test RC3
  (update-faults.spec.ts:111) devient : 'un rebuild du même commit n'ouvre pas la modale'.

dependencies: [P1-02, P1-04]

toolings_used:
  stack:          ["Node ESM", "Playwright"]
  mcp_servers:    []
  skills:         ["skill-test"]
  agents:         []
  external_tools: ["Playwright 1.61"]

definition_of_ready:
  - "P1-02 et P1-04 en statut done"
  - "dist/ construit avec CI_COMMIT_SHA renseigné localement"

success_criteria:
  - description: "Scénario v1-rebuild : aucune modale après reload"
    validated: false
  - description: "Scénario v2 (git_hash différent) : la modale apparaît et la mise à jour aboutit"
    validated: false
  - description: "npm run e2e:update et npm run e2e:update-faults sont verts"
    validated: false

tests:
  - name: "rebuild-identique"
    type: "e2e"
    assertion: "Après install v1 puis setScenario('v1-rebuild') + reload, getByRole('dialog') reste invisible pendant 5 s"
    validated: false
  - name: "nouveau-hash"
    type: "e2e"
    assertion: "Après setScenario('v2') + reload, la modale est visible et appVersion devient '2.0.0-e2e'"
    validated: false
  - name: "suites-e2e"
    type: "e2e"
    assertion: "npm run e2e:update && npm run e2e:update-faults retournent le code 0"
    validated: false

definition_of_done:
  - "Tous les success_criteria validés (validated: true)"
  - "Tous les tests passés (validated: true)"
  - "Contrat qualité global respecté (profondeur MAX, sources citées, zéro stub)"
  - "Auto-revue adversariale effectuée ; livrable relu par l'humain pilote"

files:
  create: []
  modify:
    - "e2e/update-sim-server.mjs"
    - "e2e/update-faults.spec.ts"
    - "e2e/update-flow.spec.ts"
  reference:
    - "e2e/update-flow.helpers.ts"
```

### P1-06: Documentation fr/en du mécanisme d'identité
```yaml
id: P1-06
title: "Documentation fr/en du mécanisme d'identité"
phase: "Phase 1 - Identité de version par git_hash"
priority: medium
status: done
completion: 100%
last_update: "2026-10-07"

responsible:
  lead: "dev-front"
  support: []

sizing:
  estimate: S
  human_effort: "~45min"
  augmented_effort: "~5min"

description: |
  application_update.md (fr et en) décrit aujourd'hui le build_id comme seule identité (lignes 26, 61,
  67, 114-117, 155-158 et 206-212). Réécrire ces passages : git_hash = identité, build_datetime_utc =
  affichage, rebuild identique = pas de mise à jour, CI_COMMIT_SHA obligatoire, scénario e2e
  v1-rebuild.

dependencies: [P1-05]

toolings_used:
  stack:          ["Sphinx (MyST)"]
  mcp_servers:    []
  skills:         ["skill-translate-docs"]
  agents:         []
  external_tools: []

definition_of_ready:
  - "P1-05 en statut done"

success_criteria:
  - description: "Aucune mention de build_id dans les deux pages"
    validated: false
  - description: "Les pages fr et en ont des sections alignées (mêmes titres, même ordre)"
    validated: false

tests:
  - name: "grep-doc"
    type: "review"
    assertion: "grep -n build_id docs-sphinx/source/*/user_docs/developer_guide/app/application_update.md renvoie 0 ligne"
    validated: false
  - name: "parite-fr-en"
    type: "review"
    assertion: "Les titres de niveau ##/### sont identiques en nombre et en ordre entre fr et en"
    validated: false

definition_of_done:
  - "Tous les success_criteria validés (validated: true)"
  - "Tous les tests passés (validated: true)"
  - "Contrat qualité global respecté (profondeur MAX, sources citées, zéro stub)"
  - "Auto-revue adversariale effectuée ; livrable relu par l'humain pilote"

files:
  create: []
  modify:
    - "docs-sphinx/source/fr/user_docs/developer_guide/app/application_update.md"
    - "docs-sphinx/source/en/user_docs/developer_guide/app/application_update.md"
  reference: []
```

---

## Phase 2 - Garde-fous anti-plantage et anti-blocage

### P2-01: Service Worker — timeout sur le fetch du manifeste
```yaml
id: P2-01
title: "Service Worker — timeout sur le fetch du manifeste"
phase: "Phase 2 - Garde-fous anti-plantage et anti-blocage"
priority: critical
status: done
completion: 100%
last_update: "2026-10-07"

responsible:
  lead: "dev-front"
  support: []

sizing:
  estimate: S
  human_effort: "~1h"
  augmented_effort: "~10min"

description: |
  fetchLatestManifest (service-worker.ts:161-169) n'a ni timeout, ni AbortController, ni
  redirect:'manual'. Dans installApp, response.json() (ligne 426) n'est pas borné non plus. Si le
  manifeste reste bloqué (empilement de refresh OIDC côté Apache), la run reste à filesTotal=0. Le SW,
  lui, est vivant : il répond aux keepalive par un message 'progress', ce qui ré-arme le watchdog page
  (worker_update.service.ts:143). Résultat : modale bloquée indéfiniment à 0 %. Correctif : borner le
  fetch et la lecture du corps à NAVIGATE_TIMEOUT_MS (13 s), passer en redirect:'manual' et produire une
  erreur explicite, typée auth si redirection ou 401/403.

dependencies: [P1-03]

toolings_used:
  stack:          ["TypeScript", "Service Worker"]
  mcp_servers:    []
  skills:         ["skill-test"]
  agents:         []
  external_tools: ["Vitest", "Playwright 1.61"]

definition_of_ready:
  - "P1-03 en statut done (même fichier service-worker.ts)"

success_criteria:
  - description: "Un manifeste sans réponse fait échouer la run en <= 13 s avec un message 'error' vers la page"
    validated: false
  - description: "Une redirection OIDC sur /assets_list.json produit l'erreur 'authentication required'"
    validated: false

tests:
  - name: "manifest-timeout"
    type: "unit"
    assertion: "Avec fetch jamais résolu et vi.advanceTimersByTime(13000), updateApp() rejette avec un message de timeout"
    validated: false
  - name: "manifest-redirect"
    type: "unit"
    assertion: "fetch -> {type:'opaqueredirect'} => updateApp() rejette avec /authentication required/"
    validated: false
  - name: "e2e-manifest-stall"
    type: "e2e"
    assertion: "Fault stall '/assets_list.json' activé après l'affichage de la modale puis clic 'update-now' => boutons de la modale de nouveau visibles en < 30 s"
    validated: false

definition_of_done:
  - "Tous les success_criteria validés (validated: true)"
  - "Tous les tests passés (validated: true)"
  - "Contrat qualité global respecté (profondeur MAX, sources citées, zéro stub)"
  - "Auto-revue adversariale effectuée ; livrable relu par l'humain pilote"

files:
  create: []
  modify:
    - "src/app/core/services/worker_update/service-worker.ts"
    - "src/app/core/services/worker_update/service-worker.spec.ts"
    - "e2e/update-faults.spec.ts"
  reference:
    - "e2e/update-sim-server.mjs"
```

### P2-02: UpdateService — watchdog d'absence de progression
```yaml
id: P2-02
title: "UpdateService — watchdog d'absence de progression"
phase: "Phase 2 - Garde-fous anti-plantage et anti-blocage"
priority: critical
status: done
completion: 100%
last_update: "2026-10-07"

responsible:
  lead: "dev-front"
  support: []

sizing:
  estimate: M
  human_effort: "~1h30"
  augmented_effort: "~10min"

description: |
  Le watchdog actuel (UPDATE_WATCHDOG_TIMEOUT_MS=45 s) est ré-armé par TOUT message du SW
  (worker_update.service.ts:141-144), réponses keepalive comprises. Il détecte donc un SW mort, mais pas
  une run vivante et figée. Ajouter un second minuteur, ré-armé uniquement quand filesDone augmente :
  UPDATE_NO_PROGRESS_TIMEOUT_MS, supérieur au pire cas d'un fichier, soit 4 × 30 s de stall + 7 s de
  backoff ≈ 127 s (proposition : 180 s). À l'expiration, appeler failUpdate(). La modale retrouve alors
  ses boutons 'Plus tard' / 'Mettre à jour', et une nouvelle tentative reprend le téléchargement.
  Constante dans worker_update.service.constantes.ts.

dependencies: [P1-04]

toolings_used:
  stack:          ["Angular signals", "TypeScript"]
  mcp_servers:    []
  skills:         ["skill-test"]
  agents:         []
  external_tools: ["Vitest"]

definition_of_ready:
  - "P1-04 en statut done (même fichier worker_update.service.ts)"
  - "Valeur de UPDATE_NO_PROGRESS_TIMEOUT_MS validée par le tech lead"

success_criteria:
  - description: "Des réponses 'progress' avec filesDone constant pendant UPDATE_NO_PROGRESS_TIMEOUT_MS mettent updateLoading à false"
    validated: false
  - description: "Une progression régulière, même lente, n'interrompt jamais la run"
    validated: false
  - description: "stopMonitoring() annule aussi le nouveau minuteur (aucun failUpdate après update_complete ou error)"
    validated: false

tests:
  - name: "run-figee"
    type: "unit"
    assertion: "Fake timers : progress {filesDone:3, filesTotal:100} répété toutes les 10 s pendant 180 s => updateLoading() === false et messageService.add appelé avec 'update-interrupted-summary'"
    validated: false
  - name: "run-lente"
    type: "unit"
    assertion: "filesDone +1 toutes les 60 s pendant 10 min => updateLoading() reste true"
    validated: false
  - name: "nettoyage"
    type: "unit"
    assertion: "Après 'update_complete', avancer de 300 s => failUpdate non appelé"
    validated: false

definition_of_done:
  - "Tous les success_criteria validés (validated: true)"
  - "Tous les tests passés (validated: true)"
  - "Contrat qualité global respecté (profondeur MAX, sources citées, zéro stub)"
  - "Auto-revue adversariale effectuée ; livrable relu par l'humain pilote"

files:
  create: []
  modify:
    - "src/app/core/services/worker_update/worker_update.service.ts"
    - "src/app/core/services/worker_update/worker_update.service.constantes.ts"
    - "src/app/core/services/worker_update/worker_update.service.spec.ts"
  reference:
    - "src/app/core/services/worker_update/service-worker.ts"
```

### P2-03: Service Worker — QuotaExceededError non retentée et message dédié
```yaml
id: P2-03
title: "Service Worker — QuotaExceededError non retentée et message dédié"
phase: "Phase 2 - Garde-fous anti-plantage et anti-blocage"
priority: medium
status: done
completion: 100%
last_update: "2026-10-07"

responsible:
  lead: "dev-front"
  support: []

sizing:
  estimate: S
  human_effort: "~45min"
  augmented_effort: "~5min"

description: |
  Dans cacheOneFile (service-worker.ts:346), toute erreur autre que PrecacheFileError est jugée
  retentable. Une QuotaExceededError sur cache.put est donc retentée 4 fois, inutilement, avant l'échec.
  La rendre non retentable, et faire porter au message d'erreur la mention 'storage quota' pour que la
  page affiche un détail compréhensible.

dependencies: [P2-01]

toolings_used:
  stack:          ["TypeScript", "Service Worker / Cache Storage"]
  mcp_servers:    []
  skills:         ["skill-test"]
  agents:         []
  external_tools: ["Vitest"]

definition_of_ready:
  - "P2-01 en statut done (même fichier)"

success_criteria:
  - description: "Une QuotaExceededError sur cache.put n'entraîne qu'une seule tentative et fait échouer la run"
    validated: false

tests:
  - name: "quota-non-retente"
    type: "unit"
    assertion: "cache.put rejette DOMException('QuotaExceededError') => fetch de l'asset appelé 1 fois, updateApp() rejette /storage quota/"
    validated: false

definition_of_done:
  - "Tous les success_criteria validés (validated: true)"
  - "Tous les tests passés (validated: true)"
  - "Contrat qualité global respecté (profondeur MAX, sources citées, zéro stub)"
  - "Auto-revue adversariale effectuée ; livrable relu par l'humain pilote"

files:
  create: []
  modify:
    - "src/app/core/services/worker_update/service-worker.ts"
    - "src/app/core/services/worker_update/service-worker.spec.ts"
  reference: []
```

### P2-04: AppComponent — borner l'attente de navigator.serviceWorker.ready au premier install
```yaml
id: P2-04
title: "AppComponent — borner l'attente de navigator.serviceWorker.ready au premier install"
phase: "Phase 2 - Garde-fous anti-plantage et anti-blocage"
priority: medium
status: done
completion: 100%
last_update: "2026-10-07"

responsible:
  lead: "dev-front"
  support: []

sizing:
  estimate: XS
  human_effort: "~30min"
  augmented_effort: "~5min"

description: |
  tryAutomaticFirstInstall attend 'await navigator.serviceWorker.ready' sans délai maximal
  (app.component.ts:147). Or cette promesse ne se résout jamais si l'enregistrement a échoué. Réutiliser
  withTimeout(…, UPDATE_SW_READY_TIMEOUT_MS) (worker_update.service.helpers.ts:15) : en cas de timeout,
  on passe par le chemin d'erreur existant (notification 'app.install-failed', remise à zéro du verrou).

dependencies: []

toolings_used:
  stack:          ["Angular", "TypeScript"]
  mcp_servers:    []
  skills:         ["skill-test"]
  agents:         []
  external_tools: ["Vitest"]

definition_of_ready:
  - "Aucune dépendance"

success_criteria:
  - description: "Si serviceWorker.ready ne se résout pas, notification 'app.install-failed' après UPDATE_SW_READY_TIMEOUT_MS"
    validated: false

tests:
  - name: "ready-timeout"
    type: "unit"
    assertion: "installFirstLaunch->false, ready = promesse jamais résolue, avancer de 10 s => notificationService.error appelé et autoInstallTriggered() === false"
    validated: false

definition_of_done:
  - "Tous les success_criteria validés (validated: true)"
  - "Tous les tests passés (validated: true)"
  - "Contrat qualité global respecté (profondeur MAX, sources citées, zéro stub)"
  - "Auto-revue adversariale effectuée ; livrable relu par l'humain pilote"

files:
  create: []
  modify:
    - "src/app/app.component.ts"
    - "src/app/app.component.spec.ts"
  reference:
    - "src/app/core/services/worker_update/worker_update.service.helpers.ts"
```

---

## Phase 3 - Validation de bout en bout

### P3-01: Recette complète et contrôle de déterminisme sur le serveur dev
```yaml
id: P3-01
title: "Recette complète et contrôle de déterminisme sur le serveur dev"
phase: "Phase 3 - Validation de bout en bout"
priority: high
status: in_progress
completion: 50%
# 2026-10-07 : lint (0 erreur), 4863 tests unitaires et 17 e2e (update-flow + update-faults) verts.
# Reste : redeploy-identique-dev et nouveau-commit-dev sur le serveur dev (manuel, dépend de P0-01).
last_update: "2026-10-07"

responsible:
  lead: "tech-lead"
  support: ["qa", "devops"]

sizing:
  estimate: S
  human_effort: "~1h"
  augmented_effort: "~10min"

description: |
  Exécuter toute la chaîne de validation, puis vérifier sur le serveur dev le comportement visé : un
  redéploiement automatique sans nouveau commit n'ouvre pas la modale, un nouveau commit l'ouvre.

dependencies: [P1-06, P2-01, P2-02, P2-03, P2-04]

toolings_used:
  stack:          ["Angular", "Pipeline de déploiement dev (hors dépôt)", "Serveur dev"]
  mcp_servers:    []
  skills:         ["skill-fix-test"]
  agents:         []
  external_tools: ["Vitest", "Playwright 1.61", "ESLint"]

definition_of_ready:
  - "Toutes les tâches P1-* et P2-* en statut done"
  - "Branche déployée sur le serveur dev par le pipeline"

success_criteria:
  - description: "npm run lint-check, npm run test, npm run e2e:update et npm run e2e:update-faults sont verts"
    validated: false
  - description: "Un client installé sur le serveur dev ne voit pas de modale après le redéploiement quotidien du même commit"
    validated: false
  - description: "Le même client voit la modale après le déploiement d'un nouveau commit et la mise à jour aboutit"
    validated: false

tests:
  - name: "suites-automatiques"
    type: "integration"
    assertion: "Les 4 commandes retournent le code 0"
    validated: false
  - name: "redeploy-identique-dev"
    type: "manual"
    assertion: "J+1 sans nouveau commit : /version.json.git_hash inchangé et aucune modale à l'ouverture (console sans 'updateAvailable: true')"
    validated: false
  - name: "nouveau-commit-dev"
    type: "manual"
    assertion: "Après déploiement d'un nouveau commit : modale visible, mise à jour à 100 %, rechargement, plus de modale"
    validated: false

definition_of_done:
  - "Tous les success_criteria validés (validated: true)"
  - "Tous les tests passés (validated: true)"
  - "Contrat qualité global respecté (profondeur MAX, sources citées, zéro stub)"
  - "Auto-revue adversariale effectuée ; livrable relu par l'humain pilote"
  - "Commit/push effectués manuellement par le dev (politique git du dépôt)"

files:
  create: []
  modify: []
  reference:
    - "package.json"
```

---

## Backlog (différé)

### BL-01: Anti-boucle de proposition après une mise à jour appliquée
```yaml
id: BL-01
title: "Anti-boucle de proposition après une mise à jour appliquée"
priority: medium
status: todo
description: |
  Après 'update_complete', la page recharge (worker_update.service.ts:151-163). Si le bundle actif
  annonce encore un git_hash différent de celui du serveur (placeholder non remplacé, nouveau
  déploiement pendant la mise à jour), la modale réapparaît sans fin. Piste : mémoriser en
  sessionStorage le git_hash appliqué. Si latest === appliqué et current !== latest, logger une erreur
  et ne pas rouvrir la modale.
```

### BL-02: e2e — remplacement du Service Worker pendant une mise à jour
```yaml
id: BL-02
title: "e2e — remplacement du Service Worker pendant une mise à jour"
priority: low
status: todo
description: |
  L'événement 'install' appelle skipWaiting() sans condition (service-worker.ts:772). Un nouveau
  service-worker.js déployé pendant une run active la nouvelle instance. Le verrou activeRun, en
  mémoire, est alors perdu et les keepalive visent un worker devenu redondant. Vérifier en e2e que le
  watchdog rend la main à la modale en moins de 60 s.
```

### BL-03: Invariant "nom hashé = contenu identique" cassé par la substitution post-build
```yaml
id: BL-03
title: "Invariant 'nom hashé = contenu identique' cassé par la substitution post-build"
priority: low
status: todo
description: |
  set-env-variables.py remplace {GIT_HASH}/{BUILD_TIME} APRÈS le calcul des noms hashés par Angular.
  Le chunk qui contient environment garde donc le même nom avec un contenu différent d'une version à
  l'autre. Cela contredit HASHED_ASSET_PATTERN (service-worker.ts:39), sur lequel repose le repli vers
  le cache previous.
```

### BL-04: Build reproductible dans le pipeline réel
```yaml
id: BL-04
title: "Build reproductible dans le pipeline réel"
priority: low
status: todo
description: |
  Vérifier que le pipeline de build réel (hors dépôt) installe les dépendances avec 'npm ci'. Avec
  'npm install', un même commit peut produire des bundles différents sous le même git_hash (H3).
  'npm ci' garantit l'égalité 'même hash => même contenu'.
```

---

## Légende statuts

| Status | Signification |
|--------|--------------|
| `todo` | Pas encore démarré |
| `in_progress` | En cours d'implémentation |
| `blocked` | Bloqué — attente input ou dépendance |
| `done` | Livré et validé |
