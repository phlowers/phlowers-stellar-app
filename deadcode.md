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

*Last updated: 2026-04-20 — Remove dead saveUser login flow*

---

## 4. AppComponent — `saveUser()` + `submitted` signal (removed login flow)

| | |
|---|---|
| 📍 Source | `src/app/app.component.ts` lines 134-145 (`saveUser`), line 57 (`submitted`) |
| Code | `saveUser()` method referencing `this.form`, `this.userService`, `this.userDialog` — none of which existed on the component. `submitted` signal only used inside `saveUser()`. |
| 🔍 Preuve | Build errors (TS2339). Test at line 165 confirmed: "should not have userDialog or saveUser (login flow removed)". No references in template. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Removed method, signal, and related dead tests (user dialog, email validation, saveUser calls). |
| ✅ Validé | 🗑️ SUPPRIMÉ — 2026-04-20 |

---

## 11. `recheckSpanLoads` — `src/app/features/studio/loads/presentation/helpers.ts`

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

## 12. `clearPersistedFormData()` — `src/app/features/studio/loads/presentation/services/cableModifications.service.ts`
- **Type**: method
- **Reason**: No-op placeholder with no body. Called by `CableLengthChangeComponent.deleteForm()` but has no observable side effects. Component-level tests already verify the call sites; no meaningful unit test can be written for the service method itself until a real implementation is added.
- **Detected on**: 2026-04-13
- **Status**: ⏳ PENDING REVIEW

---

## 13. `loadObstacle` / `patchFormFromObstacle` / `findObstacle` — `src/app/core/services/obstacles-form/obstaclesForm.service.ts`
| Code | Public `loadObstacle(uuid)` + private helpers `patchFormFromObstacle` and `findObstacle` |
| 🔍 Preuve | `loadObstacle` is never called from any component or service — only referenced in its own spec file. Its logic partially duplicates `setExistingObstacle`. The two private helpers are only reachable via `loadObstacle`. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Remove `loadObstacle`, `patchFormFromObstacle`, `findSupportForObstacle`, and `findObstacle` (~30 lines) and their spec coverage |
| Status | ⏳ PENDING REVIEW |
| Detected on | 2026-03-26 |

---

## 14. `recheckSpanLoads` — `src/app/features/studio/loads/presentation/helpers.ts`

| | |
|---|---|
| 📍 Source | `src/app/features/studio/loads/presentation/helpers.ts` |
| **Type** | function |
| 🔍 Preuve | Removed in PR `feat/694/base-form--cable-span-manipulation` as unused/duplicate. No remaining references in the codebase after removal. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Function deleted from `helpers.ts`; confirm no callers exist before closing the PR |
| Status | ⏳ PENDING REVIEW |
| Detected on | 2026-04-13 |

---

## 15 `deleteLoad()` — `src/app/features/studio/loads/presentation/services/loadForms.service.ts`

- **Type**: method
- **Reason**: After the fix for bug #526, `deleteCharge()` in `load-marking.component.ts` no longer calls `deleteLoad()`. No other caller exists in the codebase.
- **Detected on**: 2026-04-14
- **Status**: ⏳ PENDING REVIEW

---

## 16. `getCachedAppVersion` + `areVersionsEqual` + `getOrMigrateAppVersionCacheEntry` + `LEGACY_APP_VERSION_CACHE_KEY` — `core/services/worker_update/service-worker.ts`

| | |
|---|---|
| 📍 Source | `src/app/core/services/worker_update/service-worker.ts` |
| Code | Private functions `getCachedAppVersion()`, `areVersionsEqual()`, `getOrMigrateAppVersionCacheEntry()`, and constant `LEGACY_APP_VERSION_CACHE_KEY` |
| 🔍 Preuve | All were only used by the V1 activate logic removed in V2 (OIDC migration). No remaining callers. Also removed unused `AppVersion` type import. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Removed ~50 lines of dead code and the legacy cache migration path. |
| ✅ Validé | 🗑️ SUPPRIMÉ — 02/04/2026 |

---

## 17. `postMessageToAllClients` — `core/services/worker_update/service-worker.ts`

| | |
|---|---|
| 📍 Source | `src/app/core/services/worker_update/service-worker.ts` |
| Code | `async function postMessageToAllClients(message, payload)` |
| 🔍 Preuve | Only used by the removed V1 activate logic (`activateWhenAppInstalled`, `activateWhenAppNotInstalled`). No remaining callers after V2 migration. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Removed ~10 lines. |
| ✅ Validé | 🗑️ SUPPRIMÉ — 02/04/2026 |

---

## 18. `checkIfAppInstalled` — `core/services/worker_update/service-worker.ts`

| | |
|---|---|
| 📍 Source | `src/app/core/services/worker_update/service-worker.ts` |
| Code | `export async function checkIfAppInstalled()` |
| 🔍 Preuve | Exported function never called in production code. Only referenced in `service-worker.spec.ts`. Was part of V1 activate logic. In V2, the update check is driven by `UpdateService.checkForUpdateOnce()` which reads cache directly via `getCurrentVersion()`. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Remove ~5 lines + update spec to remove corresponding tests. |
| Status | ✅ INTERNALIZED — export removed, function kept private, tests removed (2026-04-03) |
| Detected on | 2026-04-02 |

---

## 19. Duplicate `install_complete` message — `installApp()` in `service-worker.ts` (BUG FIX)

| | |
|---|---|
| 📍 Source | `src/app/core/services/worker_update/service-worker.ts` |
| Code | `installApp()` contained `clients.matchAll()` + `client.postMessage({ message: 'install_complete' })` |
| 🔍 Preuve | `handleMessage()` already sends `install_complete` to `event.source` after `installApp()` returns. The internal broadcast in `installApp()` caused duplicate messages to the triggering client. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Removed ~8 lines of duplicate client notification from `installApp()`. `handleMessage()` is now the single source of client notification. |
| ✅ Validé | 🐛 FIXED — 02/04/2026 |

---

## 20. `lodash.isEqual` import — `core/services/worker_update/worker_update.service.ts` (CLEANUP)

| | |
|---|---|
| 📍 Source | `src/app/core/services/worker_update/worker_update.service.ts` |
| Code | `import { isEqual } from 'lodash'` used for comparing two `AppVersion` objects (3 string fields) |
| 🔍 Preuve | Deep equality via lodash is unnecessary for a flat object with 3 string properties. Replaced with a dedicated `areVersionsEqual()` method. Reduces bundle size by removing the lodash dependency from this service. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Replaced with inline `areVersionsEqual()` — 3 string comparisons. |
| ✅ Validé | 🔧 REPLACED — 02/04/2026 |

---

## 21. `isFirstUseOffline` signal — `core/services/auth/auth.service.ts`

| | |
|---|---|
| 📍 Source | `src/app/core/services/auth/auth.service.ts` |
| Code | `readonly isFirstUseOffline = signal(false);` |
| 🔍 Preuve | Signal defined in AuthService but never consumed by any component, template, or other service. Only referenced in `auth.service.spec.ts`. No UI ever reads this signal. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Removed signal and simplified `initialize()` (no longer sets the flag on first-use offline). Simplified OIDC+PKCE auth simplification. |
| ✅ Validé | 🗑️ SUPPRIMÉ — 03/04/2026 |

---

## 22. `OidcClaims` type alias — `core/services/auth/auth.service.ts` (CLEANUP)

| | |
|---|---|
| 📍 Source | `src/app/core/services/auth/auth.service.ts` |
| Code | `export type OidcClaims = Required<Pick<User, 'email'>> & Pick<User, 'sub' \| 'given_name' \| 'family_name' \| 'roles'>;` |
| 🔍 Preuve | Overly complex type-level gymnastics (`Required<Pick<>>`) for what is a simple flat interface with 5 fields. Replaced with a plain `interface OidcClaims { email: string; sub?: string; ... }` — clearer and self-contained. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Replaced type alias with explicit interface — no behavioral change. |
| ✅ Validé | 🔧 REPLACED — 03/04/2026 |

---

## 23. `checkIfAppInstalled` — `core/services/worker_update/service-worker.ts`

| | |
|---|---|
| 📍 Source | `src/app/core/services/worker_update/service-worker.ts` |
| Code | `async function checkIfAppInstalled()` — checks for `app_version` entry in cache |
| 🔍 Preuve | Was previously exported, internalized in Phase 6 but kept "for testability". No runtime caller, no test references it. Dead code with no justification to keep. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Removed function entirely. No callers affected. |
| ✅ Validé | 🗑️ SUPPRIMÉ — 03/04/2026 |

---

## 24. `noCacheHeaders` function — `core/services/worker_update/service-worker.ts` (CLEANUP)

| | |
|---|---|
| 📍 Source | `src/app/core/services/worker_update/service-worker.ts` |
| Code | `const noCacheHeaders = () => { ... }` — arrow function recreating `Headers` object on every call |
| 🔍 Preuve | Unnecessary allocation per fetch call. Replaced with immutable `NO_CACHE_INIT` constant — same semantics, zero overhead. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Replaced with `const NO_CACHE_INIT: RequestInit` constant. |
| ✅ Validé | 🔧 REPLACED — 03/04/2026 |

---

## 25. `export type { AppVersion }` re-export — `core/services/worker_update/worker_update.service.ts` (CLEANUP)

| | |
|---|---|
| 📍 Source | `src/app/core/services/worker_update/worker_update.service.ts` line 8 |
| Code | `export type { AppVersion } from './service-worker.interfaces';` |
| 🔍 Preuve | `AppVersion` is only used internally within `worker_update.service.ts` (local type annotations). No other file in the codebase imports `AppVersion` from this service. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Changed to a plain `import type` — no external consumers affected. |
| ✅ Validé | 🔧 REPLACED — 03/04/2026 |

---

## 26. `createUser()` + `validateEmail()` + `user$` + `userSubject` — `core/services/user/user.service.ts`

| | |
|---|---|
| 📍 Source | `src/app/core/services/user/user.service.ts` |
| Code | `async createUser(user)`, `const validateEmail`, `private readonly userSubject`, `public user$`, constructor `ready$.subscribe(...)` |
| 🔍 Preuve | `createUser()` had no runtime callers (only in tests). `user$` was consumed only by TopbarComponent, which now reads `AuthService.currentUser` signal directly. `validateEmail` was only used inside `createUser`. The `ready$` subscription in the constructor was an unmanaged leak. AuthService is the canonical write path for the `users` table. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Removed `createUser`, `validateEmail`, `userSubject`, `user$`, constructor subscription, and `BehaviorSubject`/`Observable` imports. UserService simplified to read-only `getUser()`. TopbarComponent now uses `AuthService.currentUser` signal. |
| ✅ Validé | 🗑️ SUPPRIMÉ — 03/04/2026 |

---

## 27. `mockCurrentVersion` + `mockLatestVersion` dev constants — `core/services/worker_update/worker_update.service.ts`

| | |
|---|---|
| 📍 Source | `src/app/core/services/worker_update/worker_update.service.ts` lines 10-20 |
| Code | `const mockCurrentVersion` and `const mockLatestVersion` used to initialize signals in `isDevMode()` |
| 🔍 Preuve | Dev-only mock versions with hardcoded hashes (`0000...`, `1111...`) always caused `needUpdate=true` in dev mode. This created confusing false-positive update prompts during development. Signals now start as `null` in all modes, consistent with production behavior. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Removed both constants, removed `isDevMode` and `environment` imports. Signals initialized to `null`. |
| ✅ Validé | 🗑️ SUPPRIMÉ — 03/04/2026 |

---

## 24. `buildSupportNameFilterTables` + `getUniqueSortedSupportNamesFromAttachments` — `supportsTable/helpers.ts`

| | |
|---|---|
| 📍 Source | `src/app/features/study/presentation/components/sections-tab/newSectionModal/manualSection/supportsTable/helpers.ts` |
| Code | `getUniqueSortedSupportNamesFromAttachments()` and `buildSupportNameFilterTables()` |
| 🔍 Preuve | Replaced by `AttachmentService.distinctSupportNames$` which uses Dexie `uniqueKeys()` index-level query instead of loading all entities. No remaining consumers after refactor. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Removed both functions + `CatalogAttachment` import. Perf improvement: ~3s → ~100ms for support name dropdown. |
| ✅ Validé | 🗑️ SUPPRIMÉ — 19/05/2026 |

---

## 25. `hasCableModifications` computed + `data-has-cable-modification` attribute — `section-plot.component`

| | |
|---|---|
| 📍 Source | `src/app/shared/components/studio/section/section-plot.component.ts` line 68 and `section-plot.component.html` line 5 |
| Code | `readonly hasCableModifications = computed(() => (this.spanService.section()?.cable_modifications?.length ?? 0) > 0);` and `[attr.data-has-cable-modification]="hasCableModifications()"` |
| 🔍 Preuve | No SCSS selector targets `[data-has-cable-modification]`, no spec reads the attribute, no JS/TS queries the DOM for it. Not a `data-testid` and not consumed anywhere in the codebase. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Remove the `computed` from the component and the `[attr.data-has-cable-modification]` binding from the template. |
| Status | 🗑️ SUPPRIMÉ — 01/06/2026 |
| Detected on | 2026-06-01 |
