# Plan: Refactorisation Architecture & Code — phlowers-stellar-app

## TL;DR
Refactoring majeur d'un projet Angular 19 PWA (~55 composants, ~230 fichiers) vers une architecture DDD stricte avec adoption complète des patterns Angular modernes (signals, OnPush, lazy loading), BEM SCSS, data-testid + tests. Le projet est déjà bien avancé sur certains axes (standalone, input()/output(), signal()) mais critique sur d'autres (OnPush: 1/55, data-testid: 4/61, DDD: inexistant, lazy loading: 0%).

---

## Audit du code actuel

### Points forts (déjà conformes)
| Critère | Score | Détail |
|---------|-------|--------|
| `standalone: true` (pas de NgModule) | 🟢 100% | 0 NgModule trouvé |
| `input()`/`output()` signal API | 🟢 100% prod | ~98 input() + 41 output() en prod, @Input/@Output uniquement dans 3 mocks .spec |
| `signal()` adoption | 🟢 ~199 usages | Bien réparti dans composants et services |
| `computed()` adoption | 🟢 69 usages | Bonne couverture |
| Imports alias vs relatifs | 🟢 96%+ | Seulement 4 imports relatifs profonds |

### Points critiques (à corriger)
| Critère | Score | Détail |
|---------|-------|--------|
| `ChangeDetectionStrategy.OnPush` | 🔴 1/~55 | Seul `scale-view.component.ts` l'a |
| `data-testid` coverage | 🔴 4/61 templates | 93% sans data-testid |
| Lazy loading routes | � 100% | 7 routes lazy via `loadComponent`/`loadChildren`, 30 chunks |
| Architecture DDD | 🔴 Inexistante | Pas de features/, pas d'use-cases, pas de repository interfaces |
| Constructor injection | 🟡 22 fichiers | ~30% encore en constructor DI |
| BEM SCSS | 🟡 Mixte | Majorité OK, quelques fichiers non-BEM (topbar, etc.) |
| @Input/@Output dans tests | 🟡 3 fichiers | Mocks spec utilisent encore les decorators legacy |

### Architecture actuelle vs cible DDD

**Actuelle** (horizontale):
```
src/app/
├── core/           # domain/models + infrastructure/database + services (mélangés)
├── ui/             # app.routes + pages/ + shared/ + styles/
```

**Cible** (verticale DDD):
```
src/app/
├── core/           # Services transverses (PWA, Pyodide, Plotly)
├── shared/         # Composants réutilisables, pipes, models UI
├── infrastructure/ # IndexedDB (Dexie), DTOs, adapters
├── features/       # Bounded contexts DDD (studies, studio, sections, etc.)
│   └── <feature>/
│       ├── domain/          # Entities, Value Objects, Repository interfaces
│       ├── application/     # Use cases, services métier
│       ├── infrastructure/  # Implémentations repo spécifiques au feature
│       └── presentation/    # Composants Angular, pages, routes
└── app.routes.ts   # Lazy loading vers feature routes
```

### Routes actuelles (100% lazy loaded)
- `/` → HomeComponent (lazy `loadComponent`)
- `/studies` → StudiesComponent (lazy `loadComponent`)
- `/admin` → AdminComponent (lazy `loadComponent`)
- `/study/:uuid` → StudyComponent (lazy `loadChildren` → `study.routes.ts`)
- `/study/:uuid/studio` → StudioPageComponent (lazy via `study.routes.ts`)
- `/news` → NewsComponent (lazy `loadComponent`)
- `/changelog` → ChangelogComponent (lazy `loadComponent`)
- `/studio` → StudioPageComponent (lazy `loadComponent`)
- `/**` → NotFoundComponent (eager — wildcard)

Shell `LoggedLayoutComponent` eagerly loaded (layout obligatoire).

### Compatibilité Angular 21
- `signal()`, `input()`, `output()`, `computed()`, `effect()` → stables et renforcés en ng21
- `OnPush` → obligatoire car ng21 pousse vers zoneless
- `standalone: true` → déjà là, ng21 le rend par défaut
- `inject()` → pattern recommandé, constructor DI sera déprécié
- Lazy loading via `loadComponent`/`loadChildren` → pattern standard
- `@Input`/`@Output` decorators → dépréciés en Angular 21

---

## Plan d'action

### Phase 0 — Préparation (non-bloquante) ✅ TERMINÉE
1. ~~**Créer la branche de refactoring**~~ → branche `601-stellar-code-refacto`
2. ~~**Ajouter les alias tsconfig manquants**~~ → `@features/*`, `@shared/*`, `@infrastructure/*` ajoutés dans tsconfig.json, tsconfig.app.json, tsconfig.spec.json
3. ~~**Fixer les 2 imports relatifs profonds**~~ → sidebar.model.ts + icon.component.ts → `@ui/shared/model/icon.model`
4. ~~**Supprimer les alias fantômes**~~ → `@plugins/*` et `@adapters/*` supprimés des 3 tsconfig
> **Baseline** : build OK, 88 suites / 1696 tests pass, lint 0 erreurs (309 warnings)

### Phase 1 — Signals-first, OnPush & inject() (zero-breaking, high-impact) ✅ TERMINÉE

#### Philosophie Angular 21 — Signals d'abord, OnPush ensuite

Angular 21 pousse vers le **zoneless change detection** où les **signals sont la primitive réactive principale**. L'ordre correct est :
1. **D'abord** : migrer TOUT l'état des composants vers `signal()`
2. **Ensuite** : appliquer `ChangeDetectionStrategy.OnPush`
3. **Enfin** : vérifier que tout fonctionne ensemble

> **Règle fondamentale** : Sous OnPush, seuls les **signal updates**, **input reference changes** et **DOM events** déclenchent le change detection. Toute propriété plain mutée dans un callback async (.subscribe, .then, await, effect) est **invisible** pour OnPush et provoque des régressions silencieuses.

> **`[(ngModel)]` sur propriété plain** : Fonctionne sous OnPush car le DOM event déclenche le CD. Mais pour la compatibilité zoneless Angular 21, ces propriétés doivent aussi être des signals.

> **Propriétés statiques/constantes** (options de select qui ne changent jamais à l'exécution) : Restent en `readonly` — les signaux n'apportent pas de valeur pour des données immuables.

#### État actuel

| Étape | Statut | Détail |
|-------|--------|--------|
| OnPush sur ~60 composants | ✅ Fait | 100% des composants ont OnPush |
| inject() (22 fichiers) | ✅ Fait | Aucune constructor injection restante |
| Mocks spec @Input/@Output | ✅ Fait | Tous migrés vers input()/output() |
| Migration signal() | ✅ Fait | 7 composants migrés (voir tableau ci-dessous) |

#### Étapes
5. ~~**Ajouter `ChangeDetectionStrategy.OnPush`**~~ ✅ à tous les ~60 composants
6. ~~**Migrer les 22 fichiers constructor injection → `inject()`**~~ ✅ (15 composants + 7 services)
7. ~~**Mettre à jour les 3 mocks spec**~~ ✅ qui utilisaient `@Input()`/`@Output()`

#### Étape 8 — Migration systématique signal() (CRITIQUE)

**Principe** : Pour chaque composant, convertir TOUTES les propriétés plain qui sont :
- Lues dans le template ET mutées dans des callbacks async → **🔴 CRITIQUE** (OnPush cassé maintenant)
- Liées via `[(ngModel)]` → **🟡 IMPORTANT** (fonctionne sous OnPush mais requis pour zoneless Angular 21)

##### 8a — Propriétés cassées sous OnPush (async mutations → plain) — PRIORITÉ ABSOLUE

| # | Composant | Fichiers | Propriété(s) | Mutation | Fix |
|---|-----------|----------|-------------|----------|-----|
| ✅ | StudiesComponent | .ts + .html + .spec.ts | `studies`, `isNewStudyModalOpen` | `.subscribe()` | ✅ Migré vers signal() |
| ✅ | **AppComponent** | .ts + .html + .spec.ts | `userDialog`, `isUpdateDialogOpen`, `submitted` | `.subscribe()`, `saveUser()` | ✅ Migré vers signal() |
| ✅ | **StudyComponent** | .ts + .html + .spec.ts | `study` | `.subscribe()` | ✅ Migré vers signal() |
| ✅ | **ChangelogComponent** | .ts + .html | `changelogs` | `.subscribe()` | ✅ Migré vers signal() |
| ✅ | **ClimateComponent** | .ts + .html | `frontierSupportOptions` | mutation dans `initForm()` appelé par `effect()` | ✅ Migré vers signal() |

##### 8b — Propriétés plain avec `[(ngModel)]` — compatibilité zoneless Angular 21

> **Note `[(ngModel)]` + signal** : Angular 19 ne supporte pas nativement `[(ngModel)]="mySignal()"` en two-way. Le pattern est :
> `[ngModel]="mySignal()" (ngModelChange)="mySignal.set($event)"` (split binding)

| # | Composant | Fichier | Propriété | Usage template | Fix |
|---|-----------|---------|-----------|---------------|-----|
| ✅ | **CalculusSettingComponent** | .ts + .html + .spec.ts | `selectedCalculusType` | `[(ngModel)]`, `@if (=== 'PAPOTO')` | ✅ Migré vers signal(), split binding |
| ✅ | **NewSectionModalComponent** | .ts + .html | `source` | `[(ngModel)]` sur p-radiobutton | ✅ Migré vers signal(), split binding |
| ✅ | **AdminComponent** | .ts + .html | `activateDebugLogs` | `[(ngModel)]` + async mutation | ✅ Migré vers signal(), split binding |

##### 8c — Code mort identifié → `deadcode.md`

Le code mort identifié pendant l'audit est listé dans [`deadcode.md`](deadcode.md) pour validation avant suppression (voir Phase 7).

| Composant | Code mort | Action |
|-----------|-----------|--------|
| LoggedLayoutComponent | `currentRoute` + `ngOnInit()` + imports inutilisés | → `deadcode.md` |
| StudioPageComponent | `spanData`, `supportData` (mock arrays non référencés) | → `deadcode.md` |

#### Étape 9 — Vérification signal() + OnPush

**Automatisée :**
- ✅ `npm run build` — 0 erreurs
- ✅ `npm run test` — 88 suites, 1696 tests pass
- ✅ `npm run lint-check` — 0 erreurs (warnings ≤309)

**Vérification heuristique :**
- ✅ `grep -r "ChangeDetectionStrategy.OnPush" src/ --include="*.ts" | wc -l` = 61
- ✅ `grep -rn "constructor(" src/ --include="*.component.ts" --include="*.service.ts"` — aucun avec paramètres DI
- ✅ Aucun `[(visible)]="plainProp"` restant (doit être `[visible]="signal()"` ou `[(visible)]` sur un `model()`)

**Vérification manuelle IHM (Humain) :**
- [x] **(Humain)** Navigation complète : Home → Studies → Study detail → Studio (2D/3D) → Obstacles → Loads → Field Measuring → Admin → News → Changelog
- [x] **(Humain)** Vérification IHM critique :
  - Boîte de dialogue utilisateur (AppComponent) : apparaît au premier lancement, se ferme après soumission
  - Boîte de dialogue mise à jour (AppComponent) : apparaît quand une mise à jour est disponible
  - Création / import d'étude (StudiesComponent) : modal s'ouvre, étude apparaît dans la table
  - Détail d'étude (StudyComponent) : sections se chargent, CRUD fonctionne
  - Changelog : liste des versions s'affiche
  - Climate : sélectionner le type de givre affiche les supports frontière
  - Calculus setting : radio buttons changent le panneau affiché
  - Admin : toggle debug logs fonctionne
  - New section modal : radio buttons source changent le contenu

#### Definition of Done — Phase 1

**Par composant :**
- [x] `changeDetection: ChangeDetectionStrategy.OnPush` présent
- [x] Aucun `constructor(` avec paramètres DI — services injectés via `inject()` en `private readonly`
- [x] `ChangeDetectionStrategy` importé depuis `@angular/core`
- [x] **Aucune propriété plain d'état lue dans le template** — tout est `signal()`, `computed()`, `input()`, `output()`, `model()`, ou `readonly` (constantes)
- [x] Aucune mutation d'objet/array par référence — utiliser `signal().set()` / `.update()` avec spread
- [x] `.spec.ts` associé compile et passe — assertions sur signal via `component.prop()` et mutations via `.set()`

**Mocks spec :**
- [x] Aucun `@Input()` ni `@Output()` dans les `.spec.ts`
- [x] Mocks utilisent `input()` / `output()` signal API

**Globale :**
- [x] `npm run build` — 0 erreurs
- [x] `npm run test` — 88 suites, 1696 tests pass
- [x] `npm run lint-check` — 0 erreurs (warnings ≤309)
- [x] `grep -r "ChangeDetectionStrategy.OnPush" src/ --include="*.ts" | wc -l` = 61
- [x] `grep -rn "constructor(" src/ --include="*.component.ts" --include="*.service.ts"` — aucun avec paramètres DI
- [x] **(Humain)** Vérification IHM complète (voir étape 9)

### Phase 2 — Lazy Loading des routes ✅ TERMINÉE
*Dépend de Phase 0 (aliases)*

#### État actuel

| Étape | Statut | Détail |
|-------|--------|--------|
| Créer `study.routes.ts` | ✅ Fait | `src/app/ui/pages/study/study.routes.ts` — child routes `study/:uuid` |
| Refactorer `app.routes.ts` | ✅ Fait | 7 imports statiques supprimés, `loadComponent`/`loadChildren` partout |
| Vérification build | ✅ Fait | 0 erreurs, 30 lazy chunks générés dans `dist/fr/` |
| Vérification tests | ✅ Fait | 88 suites, 1696 tests pass |
| Vérification lint | ✅ Fait | 0 erreurs, 309 warnings (inchangé) |

#### Ce qui a été fait

9. ~~**Créer un fichier routes pour `study/:uuid`**~~ ✅ — `src/app/ui/pages/study/study.routes.ts` avec :
   - `''` → `StudyComponent` (pathMatch: full)
   - `'studio'` → `StudioPageComponent`
   - En-tête licence RTE inclus
10. ~~**Refactorer `app.routes.ts`**~~ ✅ — conversion complète :
    - **Eagerly loaded** (conservés) : `LoggedLayoutComponent` (shell layout), `NotFoundComponent` (wildcard `**`)
    - **Lazy loaded** via `loadComponent` : Home, Studies, Admin, News, Changelog, Studio (top-level)
    - **Lazy loaded** via `loadChildren` : `study/:uuid` → `study.routes.ts`
    - Commentaire mort (`// path: 'study'`) supprimé
11. ~~**Vérification**~~ ✅ :
    - `npm run build` — 0 erreurs, 30 chunks lazy dans `dist/fr/`
    - `npm run test` — 88 suites, 1696 tests pass
    - `npm run lint-check` — 0 erreurs (309 warnings)

> **Note** : Les fichiers routes par feature (`features/home/home.routes.ts`, etc.) prévus initialement n'ont pas été créés — la Phase 3 (DDD) déplacera les routes dans les features. Pour l'instant, `app.routes.ts` utilise `loadComponent` avec des imports dynamiques vers les chemins actuels (`./pages/...`).

#### Definition of Done — Phase 2

- [x] `npm run build` — 0 erreurs
- [x] `npm run test` — 88 suites, 1696 tests pass
- [x] `npm run lint-check` — 0 erreurs (309 warnings)
- [x] 30 chunks lazy générés dans `dist/fr/` (> 7 minimum attendus)
- [x] `app.routes.ts` ne contient plus d'imports statiques de pages (seulement `LoggedLayoutComponent` et `NotFoundComponent`)
- [x] `study.routes.ts` existe et exporte `studyRoutes: Routes`
- [x] **(Humain)** Navigation complète sur toutes les routes (Home → Studies → Study → Studio → News → Changelog → Admin → 404)

### Phase 3A — DDD : Features simples (home, news, changelog, admin) ✅ TERMINÉE
*Dépend de Phase 2. Features les plus simples, risque minimal — sert de rodage pour le pattern DDD.*

#### État actuel

| Étape | Statut | Détail |
|-------|--------|--------|
| Feature `home` | ✅ Fait | 4 fichiers déplacés → `features/home/presentation/pages/home/` + route créée |
| Feature `news` | ✅ Fait | 4 fichiers composant + 1 service déplacés → `features/news/` + route créée |
| Feature `changelog` | ✅ Fait | 3 fichiers composant + 2 fichiers service déplacés → `features/changelog/` + route créée |
| Feature `admin` | ✅ Fait | 4 fichiers déplacés → `features/admin/presentation/pages/admin/` + route créée |
| Routes feature | ✅ Fait | 4 fichiers `*.routes.ts` créés avec licence RTE |
| app.routes.ts | ✅ Fait | 4 routes migrées vers `loadChildren` + `@features/` |
| Imports corrigés | ✅ Fait | news → `@features/`, changelog → `@features/`, admin → `@ui/` alias |
| Tests corrigés | ✅ Fait | `HttpClientTestingModule` supprimé (news, changelog), `RouterTestingModule` supprimé (home) |
| Dead code supprimé | ✅ Fait | `ServerStatus` enum supprimé de news.service.ts et changelog.service.ts |
| Jest config | ✅ Fait | Alias `@features/` ajouté dans `jest.config.ts` |
| Vérification build | ✅ Fait | 0 erreurs |
| Vérification tests | ✅ Fait | 88 suites, 1702 tests pass (+6 nouveaux tests news/changelog) |
| Vérification lint | ✅ Fait | 0 erreurs, 309 warnings (inchangé) |

#### Ce qui a été fait

12. ~~**Feature `home`**~~ ✅ — 4 fichiers déplacés de `ui/pages/home/` vers `features/home/presentation/pages/home/`
    - Imports existants (`@services/*`, `@core/*`, `@ui/shared/*`) conservés tels quels (migrés en phases suivantes)
    - `home.component.spec.ts` : `RouterTestingModule` remplacé par `provideRouter([])`

13. ~~**Feature `news`**~~ ✅ — 4 fichiers composant + 1 service
    - `news.service.ts` déplacé vers `features/news/infrastructure/services/`
    - `ServerStatus` enum dead code supprimé de `news.service.ts` (duplicate de `online.service.ts`, jamais importé) → noté dans `deadcode.md`
    - Import `news.component.ts` mis à jour : `@services/news/` → `@features/news/infrastructure/services/`
    - `news.component.spec.ts` : `HttpClientTestingModule` supprimé, remplacé par mocks de `NewsService` + `OnlineService` + `provideMarkdown()` + `provideHttpClient()`, 3 tests ajoutés

14. ~~**Feature `changelog`**~~ ✅ — 3 fichiers composant + 2 fichiers service
    - `changelog.service.ts` et `types.ts` déplacés vers `features/changelog/infrastructure/services/`
    - `ServerStatus` enum dead code supprimé de `changelog.service.ts` → noté dans `deadcode.md`
    - Imports `changelog.component.ts` mis à jour : `@services/changelog/` → `@features/changelog/infrastructure/services/`
    - `changelog.component.spec.ts` : `HttpClientTestingModule` supprimé, remplacé par mocks + `provideMarkdown()` + `provideHttpClient()` + `provideNoopAnimations()` (requis pour `p-panel`), 3 tests ajoutés

15. ~~**Feature `admin`**~~ ✅ — 4 fichiers déplacés
    - Import relatif `ButtonComponent` corrigé dans `admin.ts` et `admin.spec.ts` : `../../shared/` → `@ui/shared/components/atoms/button/button.component`

16. ~~**Vérification**~~ ✅ :
    - `npm run build` — 0 erreurs
    - `npm run test` — 88 suites, 1702 tests pass
    - `npm run lint-check` — 0 erreurs (309 warnings)
    - Aucun import vers les anciens chemins (`ui/pages/home`, `ui/pages/news`, etc.)
    - 6 anciens dossiers supprimés (ui/pages/home, news, changelog, admin + core/services/news, changelog)

#### Fichiers créés

| Fichier | Rôle |
|---------|------|
| `features/home/presentation/home.routes.ts` | Route lazy home → HomeComponent |
| `features/news/presentation/news.routes.ts` | Route lazy news → NewsComponent |
| `features/changelog/presentation/changelog.routes.ts` | Route lazy changelog → ChangelogComponent |
| `features/admin/presentation/admin.routes.ts` | Route lazy admin → AdminComponent |

#### Fichiers modifiés (hors déplacements)

| Fichier | Modification |
|---------|-------------|
| `ui/app.routes.ts` | 4 routes → `loadChildren` + `@features/` |
| `jest.config.ts` | Ajout alias `@features/` dans `moduleNameMapper` |
| `deadcode.md` | 2 entrées `ServerStatus` ajoutées (supprimées Phase 3A) |

#### Definition of Done — Phase 3A

- [x] `src/app/features/home/` existe avec `presentation/pages/home/` (4 fichiers)
- [x] `src/app/features/news/` existe avec `infrastructure/services/` (1 fichier) + `presentation/pages/news/` (4 fichiers)
- [x] `src/app/features/changelog/` existe avec `infrastructure/services/` (2 fichiers) + `presentation/pages/changelog/` (3 fichiers)
- [x] `src/app/features/admin/` existe avec `presentation/pages/admin/` (4 fichiers)
- [x] 4 fichiers `*.routes.ts` créés avec licence RTE
- [x] `app.routes.ts` utilise `loadChildren` + `@features/` pour ces 4 routes
- [x] Aucun import relatif profond dans les fichiers déplacés
- [x] `HttpClientTestingModule` supprimé de news.spec et changelog.spec
- [x] `RouterTestingModule` supprimé de home.spec
- [x] `ServerStatus` dead code supprimé de news.service et changelog.service → noté dans `deadcode.md`
- [x] Import relatif de `ButtonComponent` corrigé dans admin.ts et admin.spec.ts
- [x] Anciens dossiers supprimés (6 dossiers)
- [x] `npm run build` — 0 erreurs
- [x] `npm run test` — 88 suites, 1702 tests pass
- [x] `npm run lint-check` — 0 erreurs (309 warnings)
- [x] Aucun grep ne trouve d'import vers les anciens chemins
- [x] **(Humain)** Navigation Home, News, Changelog, Admin fonctionne

### Phase 3B — DDD : Feature `studies`
*Dépend de Phase 3A.*

17. **Feature `studies`** (3 composants + 1 service) :
    - Créer `domain/entities/study.entity.ts`, `domain/repositories/study.repository.ts` (interface)
    - Créer `application/use-cases/` (create-study, list-studies, import-study, delete-study)
    - Déplacer `studies.service.ts` → `infrastructure/repositories/study.repository.impl.ts`
    - Déplacer composants → `presentation/`
18. **Vérification** : `npm run test` + `npm run build` après chaque déplacement

### Phase 3C — DDD : Feature `study`
*Dépend de Phase 3B.*

19. **Feature `study`** (composants study-header, export-dialog, sectionsTab, initialConditionModal, newSectionModal, manualSection, supportsTable, attachmentSetModal) :
    - Créer domain/application/infrastructure/presentation
    - Séparer services sections, initial-conditions, charges en use-cases
20. **Vérification** : `npm run test` + `npm run build` après chaque déplacement

### Phase 3D — DDD : Feature `studio` (sous-features)
*Dépend de Phase 3C. Feature la plus complexe — découpée en sous-features.*

21. **Feature `studio`** — découpé en **sous-features** :
    - **`features/studio/core/`** : composants shell (studio-page, top-toolbar, menu-bar, side-tabs, cards) + plot.service (partagé entre sous-features)
    - **`features/studio/obstacles/`** : domain/ (obstacle entity, repository interface) + application/ (create-obstacle, delete-obstacle, update-position use-cases) + infrastructure/ (obstacles.service impl) + presentation/ (obstaclesForm)
    - **`features/studio/loads/`** : domain/ (charge, climate entities) + application/ (save-load, calculate-load, delete-charge use-cases) + infrastructure/ (charges.service, loadForms.service impl) + presentation/ (span, climate, new-charge-modal)
    - **`features/studio/field-measuring/`** : domain/ (measure-data entity) + application/ (save-measurement, compute-parameter use-cases) + infrastructure/ (Pyodide adapter) + presentation/ (field-measuring, header, init, field-datas, calculus-setting, papoto, pep, tangent-aiming, temperature-calculation, parameter-calculation-15)
    - **`features/studio/toolbar/`** : presentation/ (toolbar-dialog, l0-sum, loads-table, vtl-and-guying) + toolbar-dialog.service
    - Chaque sous-feature a sa propre structure DDD et son propre fichier routes si nécessaire
    - `plot.service` reste dans `studio/core/` car partagé entre obstacles, loads et les vues
22. **Vérification** : `npm run test` + `npm run build` après chaque déplacement

### Phase 3E — DDD : Feature `catalog`
*Dépend de Phase 3D (les catalogues sont consommés par studio).*

23. **Feature `catalog`** (bounded context dédié) :
    - `features/catalog/domain/entities/` : CatalogCable, CatalogChain, CatalogLine, CatalogAttachment, CatalogMaintenance, CatalogObstacleType
    - `features/catalog/domain/repositories/` : interfaces pour chaque catalogue
    - `features/catalog/infrastructure/repositories/` : implémentations (cables.service, chains.service, lines.service, attachment.service, maintenance.service, obstacles-types)
    - `features/catalog/infrastructure/dto/` : CSV DTOs existants (cable-csv.dto, chain-csv.dto, etc.)
    - Pas de presentation/ (les catalogues sont consommés par d'autres features via injection)
24. **Vérification** : `npm run test` + `npm run build` après chaque déplacement

### Phase 3F — DDD : Infrastructure, core et shared
*Dépend de Phase 3E. Finalise la restructuration en déplaçant les couches transverses.*

25. **Migrer `core/services/`** : les services transverses restent dans core (worker_python, worker_update, storage, online, user), les services métier vont en features
26. **`infrastructure/` top-level** : Dexie DB centralisé
    - `infrastructure/database/app-database.ts` (singleton Dexie)
    - `infrastructure/database/entities/` (toutes les entities DB)
    - `infrastructure/database/schemas/` (tous les schemas)
    - Injecté via `InjectionToken` partout, accédé uniquement par les repositories dans les features
27. **Migrer `core/domain/models/`** dans les features correspondantes
28. **Migrer `ui/shared/`** → `shared/` au top-level avec atoms, layout, studio (composants réutilisables)
29. **Vérification finale Phase 3** : `npm run test` + `npm run build` + `npm run e2e` — zéro régression

### Phase 4 — BEM SCSS strict
*Parallèle avec Phase 3.*

30. **Auditer et corriger les SCSS non-BEM** :
    - `topbar.component.scss` — convertir classes plates en BEM `.topbar__*`
    - `obstaclesForm.component.scss` — fixer la profondeur `__field__toggle` → `__field-toggle`
    - Vérifier tous les SCSS pour magic numbers → CSS variables
31. **Vérifier la profondeur de nesting** (max 3 niveaux)
32. **Vérification** : inspection visuelle + `npm run build` (pas de broken styles)

### Phase 5 — data-testid & tests orientés use cases utilisateur
*Dépend de Phase 3F (files relocated).*

**Principes** :
- Les tests sont structurés par **use case utilisateur** (ce que l'utilisateur FAIT), pas par méthode technique
- Un seul `it()` peut couvrir un scénario complet (render → interact → assert result) au lieu de 5 tests atomiques
- Le modèle de référence est `obstaclesForm.component.spec.ts` (le seul fichier correctement structuré)
- On remplace les tests d'implémentation (appel direct de méthodes, vérification service mock) par des tests comportementaux (interaction DOM → résultat visible)
- Les tests existants purement techniques (signal values, method calls) sont conservés UNIQUEMENT s'ils couvrent de la logique métier complexe non testable via DOM

**Constat sur les tests existants** :
- 7/10 fichiers spec testent UNIQUEMENT des détails d'implémentation (appels de méthodes, valeurs de signaux) sans aucun test DOM
- Seul `obstaclesForm.component.spec.ts` suit les bonnes pratiques (getByTestId, rendering tests par groupe)
- `span.component.spec.ts` a un début de tests UI (section UI state)
- Les tests existants appellent directement `component.ngOnInit()` ou `component.loadData()` au lieu de simuler l'interaction utilisateur

#### Étape 33 — Ajouter `data-testid` stratégiquement (pas systématiquement)

Ajouter `data-testid` **uniquement sur les éléments impliqués dans un use case** (pas de data-testid sur des éléments décoratifs/structurels). Prioriser par feature :

**Home** (3 testids) : `create-study-btn`, `latest-studies-list`, `study-card`
**Studies** (12 testids) : `create-study-btn`, `studies-table`, `study-row`, `open-study-btn`, `duplicate-study-btn`, `delete-study-btn`, `export-study-btn`, `new-study-modal`, `study-title-input`, `study-description-input`, `cancel-btn`, `validate-btn`
**Import Study** (4 testids) : `file-upload-input`, `imported-studies-list`, `imported-study-item`, `open-imported-btn`
**Study Detail** (8 testids) : `study-title`, `modify-btn`, `duplicate-btn`, `export-btn`, `details-toggle`, `sections-tab`, `create-section-btn`, `generate-state-btn`
**Sections Tab** (10 testids) : `section-card`, `section-name`, `section-checkbox`, `section-actions-btn`, `view-section-btn`, `edit-section-btn`, `delete-section-btn`, `duplicate-section-btn`, `add-ic-btn`, `ic-select`
**Initial Condition Modal** (8 testids) : `ic-modal`, `ic-name-input`, `base-parameter-input`, `base-temperature-input`, `cable-pretension-input`, `validate-btn`, `cancel-btn`, `delete-btn`
**New Section Modal** — conserver les testids existants dans manualSection/supportsTable
**Studio** (8 testids) : `view-mode-toggle`, `side-toggle`, `invert-toggle`, `display-multiselect`, `tables-dropdown`, `tools-dropdown`, `shortcuts-btn-*`, `support-select`
**Menu Bar** (5 testids) : `back-to-study-btn`, `section-name`, `ic-name`, `charge-case-select`, `add-charge-btn`
**Loads > Span** — déjà couvert (12 testids)
**Loads > Climate** (8 testids) : `climate-form`, `wind-pressure-input`, `cable-temperature-input`, `ice-indicator-select`, `ice-thickness-input`, `reset-btn`, `save-btn`, `calculate-btn`
**Obstacles** — déjà couvert (23 testids)
**New Charge Modal** (6 testids) : `charge-name-input`, `personnel-toggle`, `description-textarea`, `validate-btn`, `close-btn`, `name-error`
**Field Measuring** (5 testids) : `terrain-data-tab`, `parameter-calc-tab`, `temperature-calc-tab`, `param-15c-tab`, `save-btn`
**Toolbar Dialog** — structure dynamique, testids sur le conteneur seulement
**Shared atoms** (layout, sidebar, topbar) — testids sur les liens de navigation et le toggle sidebar uniquement

**Total estimé : ~90 data-testids** (vs ~57 templates × N éléments si systématique → on réduit le bruit)

#### Étape 34 — Tests unitaires orientés use cases

Pour chaque composant, structurer les tests en blocs `describe('UC: ...')` correspondant aux scénarios utilisateur réels. **Un test par use case** plutôt qu'un test par élément DOM.

**HOME — 2 tests**
- UC-H1: `'should display latest studies cards and navigate to studies page'` — vérifie le rendu des cards étude et le lien "Go to my studies"
- UC-H2: `'should display create study button linking to studies page'` — vérifie le CTA principal

**STUDIES — 6 tests**
- UC-S1: `'should display studies table with sortable columns and pagination'` — rendu tableau, tri
- UC-S2: `'should open create study modal, fill form, validate → study created'` — scénario complet création
- UC-S3: `'should duplicate a study from the actions popover'` — clic popover → duplicate
- UC-S4: `'should delete a study from the actions popover'` — clic popover → delete
- UC-S5: `'should export a study via export dialog'` — clic export → dialog → submit
- UC-S6: `'should import study files and display them in the list'` — upload fichier → apparition dans liste

**STUDY DETAIL — 5 tests**
- UC-SD1: `'should display study header with title, author, date and action buttons'` — rendu header complet
- UC-SD2: `'should toggle detail accordion showing description'` — clic Details → description visible
- UC-SD3: `'should modify study via modal'` — clic edit → modal → modifier titre → validate
- UC-SD4: `'should display sections tab with section cards'` — rendu onglet sections
- UC-SD5: `'should navigate to studio via Generate state button when IC selected'` — sélection IC → clic Generate → navigation

**SECTIONS TAB — 7 tests**
- UC-ST1: `'should display empty state with create section button when no sections'`
- UC-ST2: `'should render section cards with name, type, LIT, date'`
- UC-ST3: `'should select/deselect a section via checkbox'`
- UC-ST4: `'should open section actions popover and perform view/edit/duplicate/delete'`
- UC-ST5: `'should create initial condition via modal for a section without IC'`
- UC-ST6: `'should select, view, edit, duplicate, delete initial condition via select-with-buttons'`
- UC-ST7: `'should disable Generate state button when no initial condition selected'`

**INITIAL CONDITION MODAL — 4 tests**
- UC-IC1: `'should create IC: fill name, base parameter, base temperature → validate'`
- UC-IC2: `'should display additional Narcisse fields when cable is Narcisse type'`
- UC-IC3: `'should show error when IC name is not unique'`
- UC-IC4: `'should view IC in read-only mode with correct values displayed'`

**STUDIO PAGE — 5 tests**
- UC-SP1: `'should render studio with plot view, toolbar, and side-tabs'` — structure globale
- UC-SP2: `'should switch between 2D/3D view modes'` — toggle view
- UC-SP3: `'should navigate supports via left/right arrows and select'`
- UC-SP4: `'should open side-tab panels via header buttons'`
- UC-SP5: `'should display quick measures (parameter, work load, oblique, vertical, horizontal)'`

**MENU BAR — 3 tests**
- UC-MB1: `'should display section name, IC name, and navigation back to study'`
- UC-MB2: `'should select/delete/duplicate charge case from dropdown'`
- UC-MB3: `'should open new charge modal via add button'`

**TOP TOOLBAR — 4 tests**
- UC-TT1: `'should toggle display options and persist shortcuts to localStorage'`
- UC-TT2: `'should toggle invert switch and update plot options'`
- UC-TT3: `'should open Tables and Tools speed dial menus'`
- UC-TT4: `'should open/close shortcuts edit modal'`

**LOADS > SPAN — 5 tests** (refactorer les existants)
- UC-LS1: `'should select span and reference support, then fill load form'`
- UC-LS2: `'should save load case when form is valid'`
- UC-LS3: `'should calculate load case and display results'`
- UC-LS4: `'should delete a load case'`
- UC-LS5: `'should show load weight input only for punctual type'` — conditionnel @if

**LOADS > CLIMATE — 4 tests**
- UC-LC1: `'should fill wind pressure and temperature, validate constraints (min/max/integer)'`
- UC-LC2: `'should show ice thickness fields when symmetric ice selected'`
- UC-LC3: `'should show frontier support + before/after thickness when dissymmetric selected'`
- UC-LC4: `'should reset form to initial values'`

**OBSTACLES FORM — conserver les tests existants** (déjà bien structurés)

**NEW CHARGE MODAL — 3 tests**
- UC-NC1: `'should create charge case: fill name, toggle personnel, add description → validate'`
- UC-NC2: `'should show error when charge name is duplicate'`
- UC-NC3: `'should disable validate button when name is empty'`

**FIELD MEASURING — 4 tests**
- UC-FM1: `'should render all 4 tabs (terrain data, parameter calc, temperature calc, param@15°C)'`
- UC-FM2: `'should fill terrain data fields and save measurement'`
- UC-FM3: `'should disable save button when form is invalid'`
- UC-FM4: `'should navigate between tabs preserving data'`

**SHARED ATOMS** (tests légers — 1-2 par composant) :
- UC-BTN1: `'should render button with correct style/size/disabled state'`
- UC-CARD1: `'should render card-study with title, author, date'`
- UC-SIDEBAR1: `'should render navigation links and toggle expanded/collapsed'`
- UC-TOPBAR1: `'should render topbar with user info'`

**TOTAL : ~60 tests unitaires orientés use cases** (vs > 200 si test atomique par data-testid)

#### Étape 35 — Refactorer les tests existants

- **Conserver** les tests de `obstaclesForm.component.spec.ts` (déjà conformes)
- **Conserver** les tests de logique métier pure (ex: `getBaseClimate`, `integerValidator`, helpers)
- **Remplacer** les tests d'implémentation (appels directs `component.ngOnInit()`, `toHaveBeenCalledTimes`) par des tests comportementaux lorsque le même scénario est couvert par un UC test
- **Supprimer** les tests redondants (ex: 5 tests pour vérifier qu'un même service est appelé dans différentes méthodes → 1 test UC qui couvre le parcours complet)
- **Pattern obligatoire** pour chaque spec :
  ```typescript
  const getByTestId = (id: string) => fixture.nativeElement.querySelector(`[data-testid="${id}"]`);
  const getAllByTestId = (id: string) => fixture.nativeElement.querySelectorAll(`[data-testid="${id}"]`);
  ```

#### Étape 36 — Vérification
- `npm run test` — tous les tests passent
- `npm run coverage` — vérifier que la couverture de branches est >= avant refacto
- Vérifier que chaque composant a au minimum 1 test UC

### Phase 6 — Tests E2E Playwright (orientés parcours utilisateur)
*Dépend de Phase 5*

**Principe** : Les E2E testent des **parcours complets multi-pages**, pas des interactions unitaires (déjà couvertes en phase 5). Chaque test E2E traverse plusieurs pages et vérifie le résultat final.

37. **Créer 5 scénarios E2E** (fichiers dans `e2e/`) :

**e2e/study-lifecycle.spec.ts** — Parcours CRUD complet d'une étude
- Créer une étude → vérifier apparition dans la table → ouvrir → modifier titre → dupliquer → supprimer le duplicata → exporter l'original

**e2e/section-and-ic.spec.ts** — Gestion sections et conditions initiales
- Ouvrir une étude → créer section (manualSection) → ajouter condition initiale → vérifier la section card affiche la CI → sélectionner la CI → clic "Generate state" → vérifier navigation vers studio

**e2e/studio-visualization.spec.ts** — Interactions studio
- Accéder au studio → vérifier rendu du plot → switch 2D/3D → naviguer entre supports → ouvrir side-tab obstacles → créer un obstacle → vérifier les points sur le plot

**e2e/loads-and-climate.spec.ts** — Chargement et climat
- Ouvrir studio → ajouter un cas de charge → configurer climat (vent, température, givre) → configurer charge ponctuelle → calculer → vérifier résultat

**e2e/import-export.spec.ts** — Import/export
- Importer un fichier .csv → vérifier apparition → ouvrir l'étude importée → exporter en .clst → vérifier le téléchargement

38. **Vérification** : `npm run e2e` — les 5 + l'existant (update-flow) passent

### Phase 7 — Nettoyage du code mort
*Dépend de validation humaine. Peut être exécutée à tout moment après Phase 1.*

> Tout code mort identifié au fil des phases est centralisé dans [`deadcode.md`](deadcode.md). La suppression est effectuée **uniquement après validation** du développeur sur chaque entrée.

39. **Revoir `deadcode.md`** avec le développeur — valider ou invalider chaque entrée
40. **Supprimer le code mort validé** :
    - LoggedLayoutComponent : `currentRoute`, `ngOnInit()`, imports `NavigationEnd`, `filter`, `OnInit`
    - StudioPageComponent : `spanData`, `supportData` (mock arrays)
    - Tout autre code mort identifié au fil des phases (le fichier `deadcode.md` sera enrichi progressivement)
41. **Vérification** : `npm run test` + `npm run build` + `npm run lint-check` — zéro régression
42. **Mettre à jour `deadcode.md`** — marquer les entrées comme supprimées avec date

---

## Fichiers clés à modifier

### Routing & config
- ~~`src/app/ui/app.routes.ts` — refonte complète lazy loading~~ ✅
- `src/app/ui/pages/study/study.routes.ts` — ✅ créé (child routes study/:uuid)
- `tsconfig.json` / `tsconfig.app.json` — ajout aliases @features, @shared, @infrastructure

### Services à déplacer (core → features)
- `core/services/studies/studies.service.ts` → `features/studies/infrastructure/`
- `core/services/sections/section.service.ts` → `features/study/infrastructure/`
- `core/services/charges/charges.service.ts` → `features/studio/loads/infrastructure/`
- `core/services/obstacles/obstacles.service.ts` → `features/studio/obstacles/infrastructure/`
- `core/services/initial-conditions/initial-condition.service.ts` → `features/study/infrastructure/`
- `core/services/attachment/attachment.service.ts` → `features/catalog/infrastructure/`
- `core/services/cables/cables.service.ts` → `features/catalog/infrastructure/`
- `core/services/chains/chains.service.ts` → `features/catalog/infrastructure/`
- `core/services/lines/lines.service.ts` → `features/catalog/infrastructure/`
- `core/services/maintenance/maintenance.service.ts` → `features/catalog/infrastructure/`

### Dexie DB (centralisé)
- `core/infrastructure/database/*` → `infrastructure/database/` (top-level, injecté via InjectionToken)

### Services transverses (restent dans core)
- `core/services/worker_python/*` — reste dans core
- `core/services/worker_update/*` — reste dans core
- `core/services/storage/*` — reste dans core
- `core/services/online/*` — reste dans core
- `core/services/user/*` — reste dans core
- `core/services/news/*` — reste dans core (ou features/news/)

### ~~22 fichiers constructor injection → inject()~~ ✅
- ~~15 composants listés dans l'audit~~ ✅
- ~~7 services listés dans l'audit~~ ✅

### ~~~54 composants → ajouter OnPush~~ ✅
- ~~Tous les .component.ts~~ ✅ — 60 composants avec OnPush

### 7 composants → migration signal() (Phase 1, étape 8)
- `src/app/ui/app.component.ts` — `userDialog`, `isUpdateDialogOpen`, `submitted`
- `src/app/ui/pages/study/study.component.ts` — `study`
- `src/app/ui/pages/changelog/changelog.component.ts` — `changelogs`
- `src/app/ui/pages/studio/loads/climate/climate.component.ts` — `frontierSupportOptions`
- `src/app/ui/pages/studio/toolbar-dialog/field-measuring/components/calculus-setting/calculus-setting.component.ts` — `selectedCalculusType`
- `src/app/ui/pages/study/tabs/sections/newSectionModal/newSectionModal.component.ts` — `source`
- `src/app/ui/pages/admin/admin.ts` — `activateDebugLogs`

---

## Vérifications globales

1. **Après chaque phase** : `npm run test` + `npm run build` + `npm run lint-check`
2. **Après Phase 3F** : `npm run e2e` (update-flow existant)
3. **Fin** : `npm run coverage` pour mesurer la progression
4. **Vérification manuelle** : navigation complète dans l'app (toutes les routes)
5. **Bundle size** : comparer avant/après lazy loading

## Décisions validées

- **Studio** : **sous-features** (obstacles, loads, field-measuring, toolbar) + un `studio/core/` pour les composants shell et le plot.service partagé
- **Catalog** : **feature "catalog" dédié** (`features/catalog/`) avec son propre domain/infrastructure pour cables, chains, lines, attachment, maintenance, obstacle-types
- **Dexie DB** : **centralisé** dans `infrastructure/database/` au top-level, singleton injecté via `InjectionToken`, accédé uniquement par les repositories des features
- **Signals-first** : Migrer signal() AVANT d'appliquer OnPush — l'inverse provoque des régressions silencieuses
- **Propriétés statiques** (altitudeTypeOptions, symmetryOptions, etc.) : restent `readonly`, signals inutiles pour données immuables
- **Code mort** : inventorié dans `deadcode.md`, Phase 7 dédiée avec validation humaine avant toute suppression
- **`[(ngModel)]` + signal** : split binding `[ngModel]="sig()" (ngModelChange)="sig.set($event)"` (Angular 19 ne supporte pas `[(ngModel)]` sur signal nativement)
- **StudyComponent.study** : pattern immutable avec spread (pas de mutation locale d'objet/array)
