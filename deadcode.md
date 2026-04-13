# Dead Code Inventory — phlowers-stellar-app

> Ce fichier liste tout le code mort identifié dans le projet. Chaque entrée nécessite une validation avant suppression.

## Légende
- **📍 Source** : fichier et numéro de ligne
- **🔍 Preuve** : pourquoi c'est considéré comme mort
- **⚠️ Confiance** : HIGH (certain), MEDIUM (probable), LOW (à vérifier)

---

## 1. LoggedLayoutComponent — `currentRoute` + `ngOnInit()`

| | |
|---|---|
| 📍 Source | `src/app/shared/components/layout/logged-layout/logged-layout.component.ts` lignes 25, 28-32 |
| Code | `currentRoute = window.location.pathname;` + `ngOnInit()` avec `router.events.subscribe()` qui met à jour `this.currentRoute = event.url` |
| 🔍 Preuve | `currentRoute` n'est référencé nulle part dans le template (`logged-layout.component.html`). Aucune autre référence dans le codebase hors de ce fichier. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Supprimer la propriété, la méthode `ngOnInit`, l'interface `OnInit`, et les imports `NavigationEnd`, `filter` devenus inutiles |
| ✅ Validé | 🗑️ SUPPRIMÉ (Phase 6) — 13/03/2026 |

---

## 2. StudioPageComponent — `spanData` + `supportData`

| | |
|---|---|
| 📍 Source | `src/app/features/studio/core/presentation/pages/studio-page/studio-page.component.ts` lignes 106-116 |
| Code | `spanData = [{ label: 'Span 1-2', ... }, ...]` et `supportData = [{ label: 'Support 1', ... }, ...]` |
| 🔍 Preuve | Aucune référence dans `studio-page.component.html`. Données mock jamais consommées. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Supprimer les 2 propriétés (11 lignes) |
| ✅ Validé | 🗑️ SUPPRIMÉ (Phase 6) — 13/03/2026 |

---

## 3. StudioPageComponent — `subscription` (type Dexie.Subscription)

| | |
|---|---|
| 📍 Source | `src/app/features/studio/core/presentation/pages/studio-page/studio-page.component.ts` ligne 75 |
| Code | `subscription: Subscription | null = null;` — utilisée dans `ngOnInit()` et `ngOnDestroy()` pour gérer le cycle de vie d'un abonnement Dexie |
| 🔍 Preuve | N'est PAS du code mort — c'est du code interne de gestion de cycle de vie. Non référencé dans le template mais nécessaire. |
| ⚠️ Confiance | **NOT DEAD** — à ne pas supprimer |
| ✅ Validé | N/A |

---

*Dernière mise à jour : 12/03/2026 — Audit Phase 3A*

---

## 4. `recheckSpanLoads` — `src/app/features/studio/loads/presentation/helpers.ts`

- **Type**: function
- **Reason**: `loadForms.service.ts` now imports `recheckSpanLoads` from `@shared/domain/helpers/span-loads.helpers` (the improved, immutable version). The local `helpers.ts` export is never imported anywhere. Note: `emptySpanLoad` from the same file IS still used by `load-marking.component.ts`.
- **Detected on**: 2026-04-13
- **Status**: ⏳ PENDING REVIEW

---

## 5. `ServerStatus` — `core/services/news/news.service.ts`

| | |
|---|---|
| 📍 Source | `src/app/core/services/news/news.service.ts` |
| Code | `export enum ServerStatus { LOADING, ONLINE, OFFLINE }` |
| 🔍 Preuve | Duplicate of `ServerStatus` in `online.service.ts`, never imported by any file |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Enum removed during DDD migration |
| ✅ Validé | 🗑️ SUPPRIMÉ (Phase 3A) |

---

## 6. `ServerStatus` — `core/services/changelog/changelog.service.ts`

| | |
|---|---|
| 📍 Source | `src/app/core/services/changelog/changelog.service.ts` |
| Code | `export enum ServerStatus { LOADING, ONLINE, OFFLINE }` |
| 🔍 Preuve | Duplicate of `ServerStatus` in `online.service.ts`, never imported by any file |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Enum removed during DDD migration |
| ✅ Validé | 🗑️ SUPPRIMÉ (Phase 3A) |

---

## 7. Stale UI component files after DDD migration

### `FieldMeasuringComponent` — `ui/pages/studio/toolbar-dialog/field-measuring/field-measuring.component.ts`

| | |
|---|---|
| 📍 Source | `src/app/features/studio/field-measuring/presentation/components/field-measuring/field-measuring.component.ts` (stale copy — already migrated) |
| 🔍 Preuve | Stale copy after migration to `features/studio/field-measuring/presentation/components/field-measuring/`. Missing `.html` and `.scss` template files. Not imported by any file. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Delete file — the real component lives in `features/` |
| Status | 🗑️ SUPPRIMÉ (Phase 3D) — fichier n'existe plus |

### `InitComponent` — `ui/pages/studio/toolbar-dialog/field-measuring/components/init/init.component.ts`

| | |
|---|---|
| 📍 Source | `src/app/features/studio/field-measuring/presentation/components/init/init.component.ts` (stale copy — already migrated) |
| 🔍 Preuve | Stale copy after migration to `features/studio/field-measuring/presentation/components/init/`. Missing `.html` and `.scss` template files. Not imported by any file. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Delete file — the real component lives in `features/` |
| Status | 🗑️ SUPPRIMÉ (Phase 3D) — fichier n'existe plus |

---

## 8. Re-export bridge `obstacles.service.ts` — `core/services/obstacles/`

| | |
|---|---|
| 📍 Source | `src/app/core/services/obstacles/obstacles.service.ts` |
| Code | Re-export bridge vers `@features/studio/obstacles/infrastructure/services/obstacles.service` |
| 🔍 Preuve | 0 consommateurs — tous les imports migrent directement vers `@features/studio/obstacles/` |
| ⚠️ Confiance | **HIGH** |
| ✅ Validé | 🗑️ SUPPRIMÉ (Phase 6) — 13/03/2026 |

---

## 9. Re-export bridge `index.ts` — `core/infrastructure/`

| | |
|---|---|
| 📍 Source | `src/app/core/infrastructure/index.ts` |
| Code | Re-export bridge vers `@infrastructure/` |
| 🔍 Preuve | 0 consommateurs production — seul `plan.md` le mentionne |
| ⚠️ Confiance | **HIGH** |
| ✅ Validé | 🗑️ SUPPRIMÉ (Phase 6) — 13/03/2026 |

---

## Accepted Technical Debt — Cross-Feature Imports (Phase 8, Step E)

### `ToolbarDialogService` + `ToolbarDialogComponent` — `study` → `studio`

| | |
|---|---|
| 📍 Source | `src/app/features/study/presentation/components/sections-tab/sectionsTab.component.ts` lines 25-26 |
| Code | `import { ToolbarDialogService }` and `import { ToolbarDialogComponent }` from `@features/studio/toolbar/` |
| 🔍 Reason | `ToolbarDialogService` has hard dependencies on 5 studio-specific components (`FieldMeasuringComponent`, `InitComponent`, `L0SumComponent`, `VhlAndGuyingComponent`, `LoadsTableComponent`). Moving to `core/` or `shared/` would create `core → features` violations. |
| ⚠️ Status | **⏳ ACCEPTED DEBT** — 2 violations remaining out of 71 original |
| Resolution | Requires decoupling `ToolbarDialogService` from concrete components via `InjectionToken` or a registry pattern. |
| Detected on | 2026-03-16 |

---

## 10. `jest.config.ts` — root file

| | |
|---|---|
| 📍 Source | `jest.config.ts` (project root) |
| Code | Full Jest configuration file (`JestConfigWithTsJest`) |
| 🔍 Preuve | Project uses Vitest as test runner (`vitest.config.ts`, `npm run test` → `vitest run`). Jest config is unused. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Delete `jest.config.ts` and `fileTransformer.js` (Jest-specific transform) |
| Status | ⏳ PENDING REVIEW |
| Detected on | 2026-03-18 |

---

## 11. `loadObstacle` / `patchFormFromObstacle` / `findObstacle` — `src/app/core/services/obstacles-form/obstaclesForm.service.ts`

| | |
|---|---|
| 📍 Source | `src/app/core/services/obstacles-form/obstaclesForm.service.ts` |
| Code | Public `loadObstacle(uuid)` + private helpers `patchFormFromObstacle` and `findObstacle` |
| 🔍 Preuve | `loadObstacle` is never called from any component or service — only referenced in its own spec file. Its logic partially duplicates `setExistingObstacle`. The two private helpers are only reachable via `loadObstacle`. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Remove `loadObstacle`, `patchFormFromObstacle`, `findSupportForObstacle`, and `findObstacle` (~30 lines) and their spec coverage |
| Status | ⏳ PENDING REVIEW |
| Detected on | 2026-03-26 |
