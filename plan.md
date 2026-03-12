# Plan: Refactorisation Architecture & Code — phlowers-stellar-app

## TL;DR
**Baseline actuelle** : build OK, 88 suites / 1702 tests pass, lint 0 erreurs (313 warnings), 30 lazy chunks. **Phases 0-2 et 3A-3E terminées.**

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

### Phase 3B — DDD : Feature `studies` ✅ TERMINÉE
*Dépend de Phase 3A.*

#### État actuel

| Étape | Statut | Détail |
|-------|--------|--------|
| Extraire `createEmptyStudy` | ✅ Fait | `features/studies/domain/helpers/study.helpers.ts` — casse la dépendance circulaire service → composant |
| Déplacer `studies.service` | ✅ Fait | `features/studies/infrastructure/services/studies.service.ts` + `.spec.ts` |
| Re-export bridge | ✅ Fait | `core/services/studies/studies.service.ts` → re-export pour les 27+ consommateurs |
| Déplacer composants (14 fichiers) | ✅ Fait | 4 composants → `features/studies/presentation/` |
| Créer `studies.routes.ts` | ✅ Fait | Licence RTE, `loadComponent` lazy |
| Mettre à jour `app.routes.ts` | ✅ Fait | `loadChildren` → `@features/studies/presentation/studies.routes` |
| Mettre à jour cross-feature imports | ✅ Fait | `study.component.ts` → `@features/studies/` pour `NewStudyModalComponent` |
| Corriger tests dépréciés | ✅ Fait | `HttpClientTestingModule` supprimé (2 specs), `RouterTestingModule` → `provideRouter([])` (1 spec) |
| Vérification build | ✅ Fait | 0 erreurs |
| Vérification tests | ✅ Fait | 88 suites, 1702 tests pass |
| Vérification lint | ✅ Fait | 0 erreurs, 309 warnings (inchangé) |

#### Ce qui a été fait

17. ~~**Extraire `createEmptyStudy`**~~ ✅ — fonction extraite de `new-study-modal.component.ts` vers `features/studies/domain/helpers/study.helpers.ts`
    - Casse la dépendance circulaire `studies.service.ts` → composant
    - Import `Study` supprimé de `new-study-modal.component.ts` (devenu unused après extraction)
    - 3 fichiers mis à jour (`studies.service.ts`, `new-study-modal.component.ts`, `import-study.component.ts`)

18. ~~**Déplacer `studies.service`**~~ ✅ — `core/services/studies/` → `features/studies/infrastructure/services/`
    - `studies.service.ts` + `studies.service.spec.ts` déplacés
    - Re-export bridge créé dans `core/services/studies/studies.service.ts` pour compatibilité des 27+ consommateurs via `@services/studies/`
    - Ancien spec supprimé

19. ~~**Déplacer les composants**~~ ✅ — 14 fichiers déplacés :
    - `studies.component.ts` + `.html` + `.spec.ts` → `features/studies/presentation/pages/studies/`
    - `studies-table/` (3 fichiers) → `features/studies/presentation/components/studies-table/`
    - `new-study-modal/` (4 fichiers) → `features/studies/presentation/components/new-study-modal/`
    - `import-study/` (4 fichiers) → `features/studies/presentation/components/import-study/`
    - Tous les imports internes mis à jour (`@features/studies/`, `@ui/shared/`)
    - Imports `from 'src/app/ui/shared/...'` remplacés par `@ui/shared/components/atoms/...`

20. ~~**Corriger les tests**~~ ✅ :
    - `studies.component.spec.ts` : `HttpClientTestingModule` supprimé, mock `CablesService` ajouté
    - `studies-table.component.spec.ts` : `RouterTestingModule` → `provideRouter([])`
    - `import-study.component.spec.ts` : `HttpClientTestingModule` supprimé
    - `new-study-modal.component.spec.ts` : import `StudiesService` mis à jour vers `@features/`

21. ~~**Cross-feature**~~ ✅ :
    - `study.component.ts` : import `NewStudyModalComponent` → `@features/studies/presentation/components/new-study-modal/`
    - `ExportDialogComponent` : déplacé en Phase 3C ✅ dans `features/study/presentation/components/study-header/export-dialog/`

22. ~~**Vérification**~~ ✅ :
    - `npm run build` — 0 erreurs
    - `npm run test` — 88 suites, 1702 tests pass
    - `npm run lint-check` — 0 erreurs (309 warnings)
    - Aucun import vers `ui/pages/studies/` restant
    - `createEmptyStudy` défini uniquement dans `study.helpers.ts`, importé via `@features/studies/domain/helpers/study.helpers`
    - Ancien dossier `ui/pages/studies/` supprimé

#### Architecture résultante

```
src/app/features/studies/
├── domain/
│   └── helpers/
│       └── study.helpers.ts                    ← createEmptyStudy extraite
├── infrastructure/
│   └── services/
│       ├── studies.service.ts                  ← déplacé depuis core/services/studies/
│       └── studies.service.spec.ts
└── presentation/
    ├── pages/
    │   └── studies/
    │       ├── studies.component.ts
    │       ├── studies.component.html
    │       └── studies.component.spec.ts
    ├── components/
    │   ├── studies-table/
    │   │   ├── studies-table.component.ts
    │   │   ├── studies-table.component.html
    │   │   └── studies-table.component.spec.ts
    │   ├── new-study-modal/
    │   │   ├── new-study-modal.component.ts
    │   │   ├── new-study-modal.component.html
    │   │   ├── new-study-modal.component.scss
    │   │   └── new-study-modal.component.spec.ts
    │   └── import-study/
    │       ├── import-study.component.ts
    │       ├── import-study.component.html
    │       ├── import-study.component.scss
    │       └── import-study.component.spec.ts
    └── studies.routes.ts
```

#### Fichiers créés

| Fichier | Rôle |
|---------|------|
| `features/studies/domain/helpers/study.helpers.ts` | `createEmptyStudy()` extraite du composant |
| `features/studies/presentation/studies.routes.ts` | Route lazy studies → StudiesComponent |

#### Fichiers modifiés (hors déplacements)

| Fichier | Modification |
|---------|-------------|
| `core/services/studies/studies.service.ts` | Remplacé par re-export bridge vers `@features/studies/` |
| `ui/app.routes.ts` | Route `studies` → `loadChildren` + `@features/studies/presentation/studies.routes` |
| `ui/pages/study/study.component.ts` | Import `NewStudyModalComponent` → `@features/studies/` |

#### Décisions architecturales appliquées

- **Pas de `domain/entities/` ni `domain/repositories/`** — le refactoring DDD complet (interfaces, use-cases) est hors scope de cette phase qui se concentre sur la restructuration de fichiers
- **Re-export bridge** dans `core/services/studies/` — permet aux 27+ consommateurs de continuer sans modification, sera nettoyé progressivement
- **`ExportDialogComponent` NON déplacé** — appartient à feature `study` (migré en Phase 3C ✅)
- **`@services/sections/helpers` et `@services/cables/cables.service`** — `helpers` migré en Phase 3C ✅, `cables.service` sera migré en Phase 3E

#### Definition of Done — Phase 3B

- [x] `src/app/features/studies/` existe avec `domain/`, `infrastructure/` et `presentation/`
- [x] `createEmptyStudy` extraite dans `domain/helpers/study.helpers.ts` — plus exportée depuis le composant
- [x] `studies.service.ts` + `.spec.ts` dans `features/studies/infrastructure/services/`
- [x] Re-export bridge dans `core/services/studies/studies.service.ts`
- [x] 14 fichiers composant déplacés dans `features/studies/presentation/`
- [x] `studies.routes.ts` créé avec licence RTE
- [x] `app.routes.ts` utilise `loadChildren` + `@features/studies/`
- [x] `study.component.ts` import de `NewStudyModalComponent` mis à jour vers `@features/studies/`
- [x] Aucun import `from 'src/app/ui/shared/...'` — tous remplacés par `@ui/shared/`
- [x] `HttpClientTestingModule` supprimé de `studies.component.spec.ts` et `import-study.component.spec.ts`
- [x] `RouterTestingModule` supprimé de `studies-table.component.spec.ts`
- [x] Ancien dossier `ui/pages/studies/` supprimé
- [x] `npm run build` — 0 erreurs
- [x] `npm run test` — 88 suites, 1702 tests pass
- [x] `npm run lint-check` — 0 erreurs (309 warnings)
- [x] Aucun grep vers anciens chemins
- [x] **(Humain)** Navigation Studies → Create → Import → Table fonctionne

### Phase 3C — DDD : Feature `study` ✅ TERMINÉE
*Dépend de Phase 3B.*

19. ~~**Feature `study`** (composants study-header, export-dialog, sectionsTab, initialConditionModal, newSectionModal, manualSection, supportsTable, attachmentSetModal) :~~
    - ~~Créer domain/application/infrastructure/presentation~~
    - ~~Séparer services sections, initial-conditions, charges en use-cases~~
20. ~~**Vérification** : `npm run test` + `npm run build` après chaque déplacement~~

#### Scope Phase 3C

- **48 fichiers déplacés** : 41 fichiers composant/route depuis `ui/pages/study/` + 7 fichiers service depuis `core/services/{sections,initial-conditions,charges}/`
- **4 re-export bridges** créés pour 17+ consommateurs externes dans `studio/`
- **6 specs corrigées** : suppression de `HttpClientTestingModule` (5), `provideHttpClientTesting` (1), `NO_ERRORS_SCHEMA`/`CUSTOM_ELEMENTS_SCHEMA` (1) — remplacés par `provideHttpClient()` + `provideHttpClientTesting()` (pattern moderne)
- **2 cross-feature refs mises à jour** : `ExportDialogComponent` (studies), `InitialConditionModalComponent` (studio)
- **1 route lazy load** mise à jour dans `app.routes.ts`
- Ancien dossier `ui/pages/study/` supprimé

#### Architecture résultante

```
src/app/features/study/
├── domain/
│   └── helpers/
│       └── sections.helpers.ts              ← createEmptySupport, createEmptySection
├── infrastructure/
│   └── services/
│       ├── section.service.ts + spec
│       ├── initial-condition.service.ts + spec
│       └── charges.service.ts + spec
└── presentation/
    ├── pages/
    │   └── study/
    │       ├── study.component.ts + html + scss + spec
    ├── components/
    │   ├── study-header/
    │   │   ├── study-header.component.ts + html + scss + spec
    │   │   └── export-dialog/
    │   │       ├── export-dialog.component.ts + html + scss
    │   └── sections-tab/
    │       ├── sectionsTab.component.ts + html + scss + spec
    │       ├── initialConditionModal/   (4 files)
    │       └── newSectionModal/         (6 files)
    │           └── manualSection/       (5 files)
    │               └── supportsTable/   (6 files)
    │                   └── attachmentSetModal/ (4 files)
    └── study.routes.ts
```

#### Fichiers créés

| Fichier | Rôle |
|---------|------|
| `features/study/domain/helpers/sections.helpers.ts` | Factories `createEmptySupport()`, `createEmptySection()` (+ `createFirstAndLastSupport` privée) |
| `features/study/presentation/study.routes.ts` | Route lazy study → StudyComponent + studio |

#### Fichiers modifiés (hors déplacements)

| Fichier | Modification |
|---------|-------------|
| `core/services/sections/helpers.ts` | Remplacé par re-export bridge → `@features/study/domain/helpers/sections.helpers` |
| `core/services/sections/section.service.ts` | Remplacé par re-export bridge → `@features/study/infrastructure/services/section.service` |
| `core/services/initial-conditions/initial-condition.service.ts` | Remplacé par re-export bridge → `@features/study/infrastructure/services/initial-condition.service` (avec `export type` pour interfaces) |
| `core/services/charges/charges.service.ts` | Remplacé par re-export bridge → `@features/study/infrastructure/services/charges.service` |
| `ui/app.routes.ts` | Route `study/:uuid` → `loadChildren` + `@features/study/presentation/study.routes` |
| `features/studies/.../studies.component.ts` | Import `ExportDialogComponent` → `@features/study/` |
| `ui/pages/studio/.../parameter-calculation-15-without-wind.component.ts` | Import `InitialConditionModalComponent` → `@features/study/` |

#### Décisions architecturales appliquées

- **Services `SectionService`, `InitialConditionService`, `ChargesService` dans `study` bounded context** — gèrent sections/IC/charges au sein des études, studio les consomme en lecture seule via bridges
- **Domain helpers (`createEmptySection`, `createEmptySupport`) dans `features/study/domain/helpers/`** — fonctions factory pour les objets domaine du contexte study
- **Noms de fichiers préservés** (ex. `sectionsTab.component.ts` non renommé) — renommage hors scope
- **Dossier `tabs/sections/` aplati en `sections-tab/`** — le niveau `tabs/` était du bruit organisationnel
- **Services catalogue (`@services/cables/`, `@services/chains/`, `@services/lines/`, `@services/attachment/`, `@services/maintenance/`) NON déplacés** — appartiennent au futur `shared/catalog/` (Phase 3E)
- **Dépendances cross-feature vers studio (`PlotService`, `ToolbarDialogService/Component`)** — conservées en `@ui/pages/studio/`, seront résolues lors de la migration studio (Phase 3D)
- **`isolatedModules` et re-export de types** — les interfaces (`InitialConditionFunctionsInput`, `DuplicateInitialConditionFunctionsInput`) nécessitent `export type` dans le bridge

#### Definition of Done — Phase 3C

- [x] `src/app/features/study/` existe avec `domain/`, `infrastructure/` et `presentation/`
- [x] `sections.helpers.ts` dans `domain/helpers/` — `createEmptySupport`, `createEmptySection` extraites
- [x] 3 services + 3 specs dans `features/study/infrastructure/services/`
- [x] 4 re-export bridges dans `core/services/` (sections/helpers, sections/section.service, initial-conditions, charges)
- [x] 41 fichiers composant/route déplacés dans `features/study/presentation/`
- [x] `study.routes.ts` créé avec imports mis à jour (`./pages/study/`, `@ui/pages/studio/`)
- [x] `app.routes.ts` utilise `loadChildren` + `@features/study/presentation/study.routes`
- [x] `studies.component.ts` import de `ExportDialogComponent` mis à jour vers `@features/study/`
- [x] `parameter-calculation-15-without-wind.component.ts` import de `InitialConditionModalComponent` mis à jour vers `@features/study/`
- [x] `HttpClientTestingModule` supprimé de 5 specs (study, sectionsTab, newSectionModal, manualSection, supportsTable)
- [x] `provideHttpClientTesting()` supprimé de initialConditionModal spec (inutile car services mockés)
- [x] `NO_ERRORS_SCHEMA` / `CUSTOM_ELEMENTS_SCHEMA` supprimés de sectionsTab spec
- [x] 4 specs migrées vers `provideHttpClient()` + `provideHttpClientTesting()` (pattern moderne)
- [x] Ancien dossier `ui/pages/study/` supprimé
- [x] `grep -r "@ui/pages/study" src/ --include="*.ts"` — 0 résultats
- [x] `grep -r "ui/pages/study" src/ --include="*.ts"` — 0 résultats
- [x] `npm run build` — 0 erreurs
- [x] `npm run test` — 88 suites, 1702 tests pass
- [x] `npm run lint-check` — 0 erreurs (309 warnings)
- [x] **(Humain)** Navigation : Studies → Create study → Open study → Study header → Sections tab → Create section → Add supports → Add IC → Generate state → Studio

### Phase 3D — DDD : Feature `studio` (sous-features) ✅ TERMINÉE
*Dépend de Phase 3C. Feature la plus complexe — découpée en sous-features (~117 fichiers déplacés).*

#### État actuel

| Étape | Statut | Détail |
|-------|--------|--------|
| Structure DDD (28+ répertoires) | ✅ Fait | `features/studio/{core,obstacles,loads,field-measuring,toolbar}/{domain,infrastructure,presentation}/{components,services,pages}/` |
| PlotService + SideTabsService → `studio/core/services/` | ✅ Fait | 2 re-export bridges créés |
| ObstaclesService → `studio/obstacles/infrastructure/services/` | ✅ Fait | 1 re-export bridge créé |
| Composants shell → `studio/core/presentation/` | ✅ Fait | studio-page, top-toolbar, scale-view, menu-bar, side-tabs, side-tab, cards (7 composants) |
| Obstacles sub-feature → `studio/obstacles/presentation/` | ✅ Fait | obstaclesForm composant + service + interfaces + constants (1 re-export bridge) |
| Loads sub-feature → `studio/loads/presentation/` | ✅ Fait | climate, span, new-charge-modal + loadForms.service + helpers |
| Toolbar sub-feature → `studio/toolbar/presentation/` | ✅ Fait | toolbar-dialog service/composant, l0-sum, loads-table, vtl-and-guying |
| Field-measuring sub-feature → `studio/field-measuring/` | ✅ Fait | domain/types.ts + presentation/ (14 composants : field-measuring, header, init, field-datas, calculus-setting, papoto, pep, tangent-aiming, temperature-calculation, parameter-calculation-15 + helpers, constants, mock-data) |
| Lazy loading study.routes.ts | ✅ Fait | `loadComponent` lazy vers StudioPageComponent |
| Cross-feature imports (study → studio) | ✅ Fait | PlotService, ToolbarDialogService/Component, FieldMeasure type |
| Imports ui/shared → @features/studio/ | ✅ Fait | section-plot, free-positioning, studio shared components |
| Tests dépréciés corrigés | ✅ Fait | `HttpClientTestingModule` → `provideHttpClient()` + `provideHttpClientTesting()` (4 specs) |
| Nettoyage répertoires vides | ✅ Fait | Anciens dossiers vides supprimés |
| Vérification build | ✅ Fait | 0 erreurs |
| Vérification tests | ✅ Fait | 88 suites, 1702 tests pass |

#### Ce qui a été fait

21. ~~**Structure DDD**~~ ✅ — 28+ répertoires créés sous `features/studio/` avec 5 sous-features

22. ~~**PlotService + SideTabsService**~~ ✅ — déplacés de `ui/pages/studio/services/` vers `features/studio/core/services/`
    - PlotService : service central (~15 consommateurs), exporte `PLOT_ID`, `SelectedDisplayOptions`, `SpanOption`, `checkIfProjectionNeedRefresh`, `defaultPlotOptions`
    - SideTabsService : service simple avec signal `sideTabs`
    - 2 re-export bridges créés dans les anciens emplacements

23. ~~**ObstaclesService**~~ ✅ — déplacé de `core/services/obstacles/` vers `features/studio/obstacles/infrastructure/services/`
    - CSV catalog + `currentPointIndex` signal
    - 1 re-export bridge créé dans `core/services/obstacles/`

24. ~~**Composants shell**~~ ✅ — 7 composants déplacés vers `features/studio/core/presentation/`
    - studio-page (page principale), top-toolbar, scale-view, menu-bar, side-tabs, side-tab, cards
    - Routes mises à jour dans `app.routes.ts` et `study.routes.ts`

25. ~~**Obstacles sub-feature**~~ ✅ — obstaclesForm composant + service + interfaces + constants → `features/studio/obstacles/presentation/`
    - 1 re-export bridge créé pour `obstaclesForm.service`
    - Import PlotService mis à jour vers nouveau chemin

26. ~~**Loads sub-feature**~~ ✅ — climate, span, new-charge-modal + loadForms.service + helpers → `features/studio/loads/presentation/`
    - Tous les imports internes corrigés

27. ~~**Toolbar sub-feature**~~ ✅ — toolbar-dialog service/composant, l0-sum, loads-table, vtl-and-guying → `features/studio/toolbar/presentation/`
    - Cross-feature imports depuis study (sectionsTab) corrigés immédiatement

28. ~~**Field-measuring sub-feature**~~ ✅ — la plus complexe (~30 fichiers)
    - `types.ts` déplacé vers `domain/types.ts` (entités FieldMeasure, FieldMeasureOutputs, etc.)
    - Composant principal + 10 sous-composants → `presentation/components/`
    - helpers, constants, mock-data → `presentation/`
    - ~40 imports corrigés (relatifs + alias `@ui/` → `@features/studio/`)
    - 1 re-export bridge créé pour `types.ts`

29. ~~**Lazy loading**~~ ✅ — `study.routes.ts` converti de static import vers `loadComponent()` lazy pour StudioPageComponent

30. ~~**Cross-feature imports**~~ ✅ — tous les imports `@ui/pages/studio/` et `@src/app/ui/pages/studio/` mis à jour :
    - `study/sectionsTab.component.ts` → PlotService, ToolbarDialogService/Component
    - `study/manualSection.component.ts` → PlotService
    - `core/domain/models/section.model.ts` → FieldMeasure type
    - `ui/shared/components/studio/` (section-plot, free-positioning, studio) → PlotService, SideTabsService, ObstacleFormService

31. ~~**Tests dépréciés**~~ ✅ — `HttpClientTestingModule` remplacé par `provideHttpClient()` + `provideHttpClientTesting()` dans 4 specs :
    - `plot.service.spec.ts`
    - `obstacles.service.spec.ts`
    - `new-charge-modal.component.spec.ts`
    - `parameter-calculation-15-without-wind.component.spec.ts`

32. ~~**Nettoyage**~~ ✅ — répertoires vides supprimés, 5 re-export bridges conservés

#### Architecture résultante

```
src/app/features/studio/
├── core/
│   ├── services/
│   │   ├── plot.service.ts + spec          ← service central Plotly
│   │   └── side-tabs.service.ts + spec     ← gestion onglets latéraux
│   └── presentation/
│       ├── pages/
│       │   └── studio-page/                ← page principale studio
│       └── components/
│           ├── top-toolbar/                ← barre d'outils supérieure
│           │   └── scale-view/             ← vue échelle
│           ├── menu-bar/                   ← barre de menu
│           ├── side-tabs/                  ← onglets latéraux
│           │   └── side-tab/               ← onglet individuel
│           └── cards/                      ← cartes d'information
├── obstacles/
│   ├── infrastructure/
│   │   └── services/
│   │       └── obstacles.service.ts + spec ← catalogue obstacles CSV
│   └── presentation/
│       ├── components/
│       │   └── obstaclesForm/              ← formulaire obstacles (composant + service + interfaces + constants)
│       └── services/
│           └── obstaclesForm.service.ts    ← service formulaire obstacles
├── loads/
│   └── presentation/
│       ├── components/
│       │   ├── climate/                    ← formulaire climat
│       │   ├── span/                       ← formulaire portée
│       │   └── new-charge-modal/           ← modal nouveau cas de charge
│       ├── services/
│       │   └── loadForms.service.ts        ← service formulaires charges
│       └── helpers/                        ← helpers charges
├── toolbar/
│   └── presentation/
│       ├── components/
│       │   ├── toolbar-dialog/             ← dialog barre d'outils
│       │   ├── l0-sum/                     ← somme L0
│       │   ├── loads-table/                ← tableau charges
│       │   └── vtl-and-guying/             ← VTL et haubanage
│       └── services/
│           └── toolbar-dialog.service.ts + spec
└── field-measuring/
    ├── domain/
    │   └── types.ts                        ← FieldMeasure, FieldMeasureOutputs, etc.
    └── presentation/
        ├── components/
        │   ├── field-measuring/             ← composant principal
        │   ├── header/                     ← en-tête
        │   ├── init/                       ← initialisation
        │   ├── field-datas/                ← données terrain
        │   ├── calculus-setting/            ← paramètres calcul
        │   │   ├── papoto/                 ← calcul PAPOTO
        │   │   ├── pep/                    ← calcul PEP
        │   │   └── tangent-aiming/         ← visée tangente
        │   ├── temperature-calculation/     ← calcul température
        │   └── parameter-calculation-15-without-wind/ ← paramètre 15°C sans vent
        ├── helpers.ts                      ← helpers mesures terrain
        ├── constants.ts                    ← constantes
        └── mock-data.ts                    ← données mock pour tests
```

#### Re-export bridges (5 au total)

| Bridge (ancien chemin) | Redirige vers | Consommateurs |
|------------------------|--------------|---------------|
| `ui/pages/studio/services/plot.service.ts` | `@features/studio/core/services/plot.service` | ~~15+ → tous migrés~~ 0 restants |
| `ui/pages/studio/side-tabs/side-tabs.service.ts` | `@features/studio/core/services/side-tabs.service` | 0 restants |
| `core/services/obstacles/obstacles.service.ts` | `@features/studio/obstacles/infrastructure/services/obstacles.service` | consommateurs via `@services/obstacles/` |
| `ui/pages/studio/obstacles/obstaclesForm/obstaclesForm.service.ts` | `@features/studio/obstacles/presentation/services/obstaclesForm.service` | 0 restants |
| `ui/pages/studio/toolbar-dialog/field-measuring/types.ts` | `@features/studio/field-measuring/domain/types` | `core/domain/models/section.model.ts` (via bridge `@services/`) |

> **Note** : Les bridges PlotService, SideTabsService et ObstacleFormService n'ont plus de consommateurs (tous les imports ont été migrés vers `@features/studio/`). Ils peuvent être supprimés lors du nettoyage Phase 7.

#### Fichiers modifiés (hors déplacements)

| Fichier | Modification |
|---------|-------------|
| `features/study/presentation/study.routes.ts` | Import statique StudioPageComponent → `loadComponent` lazy |
| `features/study/.../sectionsTab.component.ts` | Imports PlotService, ToolbarDialogService/Component → `@features/studio/` |
| `features/study/.../manualSection.component.ts` | Import PlotService → `@features/studio/` |
| `core/domain/models/section.model.ts` | Import FieldMeasure → `@features/studio/field-measuring/domain/types` |
| `ui/shared/components/studio/section/section-plot.component.ts + spec` | Imports PlotService, SideTabsService, ObstacleFormService → `@features/studio/` |
| `ui/shared/components/studio/free-positioning/free-positioning.component.ts + spec` | Imports PlotService, SideTabsService, ObstacleFormService → `@features/studio/` |
| `ui/shared/components/studio/studio.component.ts + spec` | Import PlotService → `@features/studio/` |

#### Definition of Done — Phase 3D

- [x] `src/app/features/studio/` existe avec 5 sous-features : `core`, `obstacles`, `loads`, `toolbar`, `field-measuring`
- [x] ~117 fichiers déplacés depuis `ui/pages/studio/` et `core/services/obstacles/`
- [x] 5 re-export bridges créés (plot.service, side-tabs.service, obstacles.service, obstaclesForm.service, types.ts)
- [x] `study.routes.ts` utilise `loadComponent` lazy pour StudioPageComponent
- [x] Tous les imports `@ui/pages/studio/` et `@src/app/ui/pages/studio/` migrés vers `@features/studio/`
- [x] `HttpClientTestingModule` supprimé de 4 specs studio
- [x] Répertoires vides nettoyés
- [x] `npm run build` — 0 erreurs
- [x] `npm run test` — 88 suites, 1702 tests pass
- [x] 0 erreurs TypeScript
- [x] **(Humain)** Navigation Studio complète : Studio page → 2D/3D → Obstacles → Loads → Climate → Field Measuring → Toolbar dialogs

### Phase 3E — Shared : `catalog` (données de référence partagées) ✅ TERMINÉE
*Dépend de Phase 3D (les catalogues sont consommés par studio, study, etc.).*

Les catalogues ne sont **pas un bounded context** — ce sont des données de référence partagées (CSV → IndexedDB → lookup) consommées par plusieurs features. Ils vont dans `shared/catalog/` (Shared Kernel).

23. ~~**`shared/catalog/services/`** (ressources partagées)~~ :
    - ~~cables.service, chains.service, lines.service, attachment.service, maintenance.service~~ — déplacés
    - DTOs et models restent dans `@core/infrastructure/dto/` et `@core/domain/models/catalog/` (Phase 3F)
24. ~~**Vérification**~~ : build + test après chaque déplacement ✅

#### Config modifiée

| Fichier | Modification |
|---------|-------------|
| `jest.config.ts` | Ajout alias `'^@shared/(.*)$': '<rootDir>/src/app/shared/$1'` dans `moduleNameMapper` |

> **Note** : `@shared/*` était déjà dans `tsconfig.json` et `tsconfig.spec.json` (Phase 0).

#### Structure créée

```
src/app/shared/                              ← NOUVEAU répertoire
└── catalog/
    └── services/
        ├── cables.service.ts + spec
        ├── chains.service.ts + spec
        ├── lines.service.ts + spec
        ├── attachment.service.ts + spec
        └── maintenance.service.ts + spec
```

#### Fichiers déplacés (10 fichiers)

| Source | Destination |
|--------|------------|
| `core/services/cables/cables.service.ts` + `.spec.ts` | `shared/catalog/services/cables.service.ts` + `.spec.ts` |
| `core/services/chains/chains.service.ts` + `.spec.ts` | `shared/catalog/services/chains.service.ts` + `.spec.ts` |
| `core/services/lines/lines.service.ts` + `.spec.ts` | `shared/catalog/services/lines.service.ts` + `.spec.ts` |
| `core/services/attachment/attachment.service.ts` + `.spec.ts` | `shared/catalog/services/attachment.service.ts` + `.spec.ts` |
| `core/services/maintenance/maintenance.service.ts` + `.spec.ts` | `shared/catalog/services/maintenance.service.ts` + `.spec.ts` |

#### Re-export bridges (5 au total)

| Bridge (ancien chemin) | Redirige vers | Symbole |
|------------------------|--------------|--------|
| `core/services/cables/cables.service.ts` | `@shared/catalog/services/cables.service` | `CablesService` |
| `core/services/chains/chains.service.ts` | `@shared/catalog/services/chains.service` | `ChainsService` |
| `core/services/lines/lines.service.ts` | `@shared/catalog/services/lines.service` | `LinesService` |
| `core/services/attachment/attachment.service.ts` | `@shared/catalog/services/attachment.service` | `AttachmentService` |
| `core/services/maintenance/maintenance.service.ts` | `@shared/catalog/services/maintenance.service` | `MaintenanceService` |

> **60+ consommateurs** via `@services/cables/`, `@services/chains/`, etc. continuent à fonctionner sans modification grâce aux bridges.

#### Modernisation des specs catalogue

- `HttpClientTestingModule` (déprécié) remplacé par `provideHttpClient()` + `provideHttpClientTesting()` dans les 5 specs catalogue

#### Definition of Done — Phase 3E

- [x] `src/app/shared/catalog/services/` existe avec 5 services + 5 specs (10 fichiers)
- [x] 5 re-export bridges créés dans `core/services/{cables,chains,lines,attachment,maintenance}/`
- [x] `@shared/` alias ajouté dans `jest.config.ts` (`moduleNameMapper`)
- [x] `tsconfig.spec.json` a l'alias `@shared/*` (hérité de tsconfig.json)
- [x] Aucun import modifié dans les 60+ consommateurs (tous passent par les bridges)
- [x] Anciens specs supprimés des dossiers `core/services/xxx/` (seul le bridge y reste)
- [x] `HttpClientTestingModule` supprimé des 5 specs catalogue
- [x] `npm run build` — 0 erreurs
- [x] `npm run test` — 88 suites, 1702 tests pass
- [x] `npm run lint-check` — 0 erreurs (313 warnings)
- [x] **(Humain)** L'app démarre, les catalogues se chargent (CSV → IndexedDB), Studio et Study fonctionnent

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
- ~~`core/services/studies/studies.service.ts` → `features/studies/infrastructure/`~~ ✅ (Phase 3B — re-export bridge en place)
- ~~`core/services/sections/section.service.ts` → `features/study/infrastructure/`~~ ✅ (Phase 3C — re-export bridge en place)
- ~~`core/services/charges/charges.service.ts` → `features/study/infrastructure/`~~ ✅ (Phase 3C — re-export bridge en place)
- ~~`core/services/obstacles/obstacles.service.ts` → `features/studio/obstacles/infrastructure/`~~ ✅ (Phase 3D — re-export bridge en place)
- ~~`core/services/initial-conditions/initial-condition.service.ts` → `features/study/infrastructure/`~~ ✅ (Phase 3C — re-export bridge en place)
- `core/services/attachment/attachment.service.ts` → `shared/catalog/services/`
- `core/services/cables/cables.service.ts` → `shared/catalog/services/`
- `core/services/chains/chains.service.ts` → `shared/catalog/services/`
- `core/services/lines/lines.service.ts` → `shared/catalog/services/`
- `core/services/maintenance/maintenance.service.ts` → `shared/catalog/services/`

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
- **Catalog** : **ressources partagées** dans `shared/catalog/` (pas un bounded context — données de référence consommées par plusieurs features via injection)
- **Dexie DB** : **centralisé** dans `infrastructure/database/` au top-level, singleton injecté via `InjectionToken`, accédé uniquement par les repositories des features
- **Signals-first** : Migrer signal() AVANT d'appliquer OnPush — l'inverse provoque des régressions silencieuses
- **Propriétés statiques** (altitudeTypeOptions, symmetryOptions, etc.) : restent `readonly`, signals inutiles pour données immuables
- **Code mort** : inventorié dans `deadcode.md`, Phase 7 dédiée avec validation humaine avant toute suppression
- **`[(ngModel)]` + signal** : split binding `[ngModel]="sig()" (ngModelChange)="sig.set($event)"` (Angular 19 ne supporte pas `[(ngModel)]` sur signal nativement)
- **StudyComponent.study** : pattern immutable avec spread (pas de mutation locale d'objet/array)
