# Dead Code Inventory — phlowers-stellar-app

> This file lists all dead code identified in the project. Each entry requires validation before deletion.

## Legend
- **📍 Source**: file and line number
- **🔍 Evidence**: why it is considered dead
- **⚠️ Confidence**: HIGH (certain), MEDIUM (likely), LOW (needs verification)

---

## 1. LoggedLayoutComponent — `currentRoute` + `ngOnInit()`

| | |
|---|---|
| 📍 Source | `src/app/shared/components/layout/logged-layout/logged-layout.component.ts` lines 25, 28-32 |
| Code | `currentRoute = window.location.pathname;` + `ngOnInit()` with `router.events.subscribe()` updating `this.currentRoute = event.url` |
| 🔍 Evidence | `currentRoute` is not referenced anywhere in the template (`logged-layout.component.html`). No other reference in the codebase outside this file. |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Remove the property, the `ngOnInit` method, the `OnInit` interface, and the now-unused `NavigationEnd`, `filter` imports |
| ✅ Validated | 🗑️ REMOVED (Phase 6) — 2026-03-13 |

---

## 2. StudioPageComponent — `spanData` + `supportData`

| | |
|---|---|
| 📍 Source | `src/app/features/studio/core/presentation/pages/studio-page/studio-page.component.ts` lines 106-116 |
| Code | `spanData = [{ label: 'Span 1-2', ... }, ...]` and `supportData = [{ label: 'Support 1', ... }, ...]` |
| 🔍 Evidence | No reference in `studio-page.component.html`. Mock data never consumed. |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Remove the 2 properties (11 lines) |
| ✅ Validated | 🗑️ REMOVED (Phase 6) — 2026-03-13 |

---

## 3. StudioPageComponent — `subscription` (type Dexie.Subscription)

| | |
|---|---|
| 📍 Source | `src/app/features/studio/core/presentation/pages/studio-page/studio-page.component.ts` line 75 |
| Code | `subscription: Subscription | null = null;` — used in `ngOnInit()` and `ngOnDestroy()` to manage the lifecycle of a Dexie subscription |
| 🔍 Evidence | NOT dead code — internal lifecycle management. Not referenced in the template but required. |
| ⚠️ Confidence | **NOT DEAD** — do not remove |
| ✅ Validated | N/A |

---

*Last updated: 2026-04-20 — Remove dead saveUser login flow*

---

## 4. AppComponent — `saveUser()` + `submitted` signal (removed login flow)

| | |
|---|---|
| 📍 Source | `src/app/app.component.ts` lines 134-145 (`saveUser`), line 57 (`submitted`) |
| Code | `saveUser()` method referencing `this.form`, `this.userService`, `this.userDialog` — none of which existed on the component. `submitted` signal only used inside `saveUser()`. |
| 🔍 Evidence | Build errors (TS2339). Test at line 165 confirmed: "should not have userDialog or saveUser (login flow removed)". No references in template. |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Removed method, signal, and related dead tests (user dialog, email validation, saveUser calls). |
| ✅ Validated | 🗑️ REMOVED — 2026-04-20 |

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
| 🔍 Evidence | Duplicate of `ServerStatus` in `online.service.ts`, never imported by any file |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Enum removed during DDD migration |
| ✅ Validated | 🗑️ REMOVED (Phase 3A) |

---

## 6. `ServerStatus` — `core/services/changelog/changelog.service.ts`

| | |
|---|---|
| 📍 Source | `src/app/core/services/changelog/changelog.service.ts` |
| Code | `export enum ServerStatus { LOADING, ONLINE, OFFLINE }` |
| 🔍 Evidence | Duplicate of `ServerStatus` in `online.service.ts`, never imported by any file |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Enum removed during DDD migration |
| ✅ Validated | 🗑️ REMOVED (Phase 3A) |

---

## 7. Stale UI component files after DDD migration

### `FieldMeasuringComponent` — `ui/pages/studio/toolbar-dialog/field-measuring/field-measuring.component.ts`

| | |
|---|---|
| 📍 Source | `src/app/features/studio/field-measuring/presentation/components/field-measuring/field-measuring.component.ts` (stale copy — already migrated) |
| 🔍 Evidence | Stale copy after migration to `features/studio/field-measuring/presentation/components/field-measuring/`. Missing `.html` and `.scss` template files. Not imported by any file. |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Delete file — the real component lives in `features/` |
| Status | 🗑️ REMOVED (Phase 3D) — file no longer exists |

### `InitComponent` — `ui/pages/studio/toolbar-dialog/field-measuring/components/init/init.component.ts`

| | |
|---|---|
| 📍 Source | `src/app/features/studio/field-measuring/presentation/components/init/init.component.ts` (stale copy — already migrated) |
| 🔍 Evidence | Stale copy after migration to `features/studio/field-measuring/presentation/components/init/`. Missing `.html` and `.scss` template files. Not imported by any file. |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Delete file — the real component lives in `features/` |
| Status | 🗑️ REMOVED (Phase 3D) — file no longer exists |

---

## 8. Re-export bridge `obstacles.service.ts` — `core/services/obstacles/`

| | |
|---|---|
| 📍 Source | `src/app/core/services/obstacles/obstacles.service.ts` |
| Code | Re-export bridge to `@features/studio/obstacles/infrastructure/services/obstacles.service` |
| 🔍 Evidence | 0 consumers — all imports migrate directly to `@features/studio/obstacles/` |
| ⚠️ Confidence | **HIGH** |
| ✅ Validated | 🗑️ REMOVED (Phase 6) — 2026-03-13 |

---

## 9. Re-export bridge `index.ts` — `core/infrastructure/`

| | |
|---|---|
| 📍 Source | `src/app/core/infrastructure/index.ts` |
| Code | Re-export bridge to `@infrastructure/` |
| 🔍 Evidence | 0 production consumers — only `plan.md` mentions it |
| ⚠️ Confidence | **HIGH** |
| ✅ Validated | 🗑️ REMOVED (Phase 6) — 2026-03-13 |

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
| 🔍 Evidence | Project uses Vitest as test runner (`vitest.config.ts`, `npm run test` → `vitest run`). Jest config is unused. |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Delete `jest.config.ts` and `fileTransformer.js` (Jest-specific transform) |
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
| 🔍 Evidence | `loadObstacle` is never called from any component or service — only referenced in its own spec file. Its logic partially duplicates `setExistingObstacle`. The two private helpers are only reachable via `loadObstacle`. |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Remove `loadObstacle`, `patchFormFromObstacle`, `findSupportForObstacle`, and `findObstacle` (~30 lines) and their spec coverage |
| Status | ⏳ PENDING REVIEW |
| Detected on | 2026-03-26 |

---

## 14. `recheckSpanLoads` — `src/app/features/studio/loads/presentation/helpers.ts`

| | |
|---|---|
| 📍 Source | `src/app/features/studio/loads/presentation/helpers.ts` |
| **Type** | function |
| 🔍 Evidence | Removed in PR `feat/694/base-form--cable-span-manipulation` as unused/duplicate. No remaining references in the codebase after removal. |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Function deleted from `helpers.ts`; confirm no callers exist before closing the PR |
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
| 🔍 Evidence | All were only used by the V1 activate logic removed in V2 (OIDC migration). No remaining callers. Also removed unused `AppVersion` type import. |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Removed ~50 lines of dead code and the legacy cache migration path. |
| ✅ Validated | 🗑️ REMOVED — 2026-04-02 |

---

## 17. `postMessageToAllClients` — `core/services/worker_update/service-worker.ts`

| | |
|---|---|
| 📍 Source | `src/app/core/services/worker_update/service-worker.ts` |
| Code | `async function postMessageToAllClients(message, payload)` |
| 🔍 Evidence | Only used by the removed V1 activate logic (`activateWhenAppInstalled`, `activateWhenAppNotInstalled`). No remaining callers after V2 migration. |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Removed ~10 lines. |
| ✅ Validated | 🗑️ REMOVED — 2026-04-02 |

---

## 18. `checkIfAppInstalled` — `core/services/worker_update/service-worker.ts`

| | |
|---|---|
| 📍 Source | `src/app/core/services/worker_update/service-worker.ts` |
| Code | `export async function checkIfAppInstalled()` |
| 🔍 Evidence | Exported function never called in production code. Only referenced in `service-worker.spec.ts`. Was part of V1 activate logic. In V2, the update check is driven by `UpdateService.checkForUpdateOnce()` which reads cache directly via `getCurrentVersion()`. |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Remove ~5 lines + update spec to remove corresponding tests. |
| Status | ✅ INTERNALIZED — export removed, function kept private, tests removed (2026-04-03) |
| Detected on | 2026-04-02 |

---

## 19. Duplicate `install_complete` message — `installApp()` in `service-worker.ts` (BUG FIX)

| | |
|---|---|
| 📍 Source | `src/app/core/services/worker_update/service-worker.ts` |
| Code | `installApp()` contained `clients.matchAll()` + `client.postMessage({ message: 'install_complete' })` |
| 🔍 Evidence | `handleMessage()` already sends `install_complete` to `event.source` after `installApp()` returns. The internal broadcast in `installApp()` caused duplicate messages to the triggering client. |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Removed ~8 lines of duplicate client notification from `installApp()`. `handleMessage()` is now the single source of client notification. |
| ✅ Validated | 🐛 FIXED — 2026-04-02 |

---

## 20. `lodash.isEqual` import — `core/services/worker_update/worker_update.service.ts` (CLEANUP)

| | |
|---|---|
| 📍 Source | `src/app/core/services/worker_update/worker_update.service.ts` |
| Code | `import { isEqual } from 'lodash'` used for comparing two `AppVersion` objects (3 string fields) |
| 🔍 Evidence | Deep equality via lodash is unnecessary for a flat object with 3 string properties. Replaced with a dedicated `areVersionsEqual()` method. Reduces bundle size by removing the lodash dependency from this service. |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Replaced with inline `areVersionsEqual()` — 3 string comparisons. |
| ✅ Validated | 🔧 REPLACED — 2026-04-02 |

---

## 21. `isFirstUseOffline` signal — `core/services/auth/auth.service.ts`

| | |
|---|---|
| 📍 Source | `src/app/core/services/auth/auth.service.ts` |
| Code | `readonly isFirstUseOffline = signal(false);` |
| 🔍 Evidence | Signal defined in AuthService but never consumed by any component, template, or other service. Only referenced in `auth.service.spec.ts`. No UI ever reads this signal. |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Removed signal and simplified `initialize()` (no longer sets the flag on first-use offline). Simplified OIDC+PKCE auth simplification. |
| ✅ Validated | 🗑️ REMOVED — 2026-04-03 |

---

## 22. `OidcClaims` type alias — `core/services/auth/auth.service.ts` (CLEANUP)

| | |
|---|---|
| 📍 Source | `src/app/core/services/auth/auth.service.ts` |
| Code | `export type OidcClaims = Required<Pick<User, 'email'>> & Pick<User, 'sub' \| 'given_name' \| 'family_name' \| 'roles'>;` |
| 🔍 Evidence | Overly complex type-level gymnastics (`Required<Pick<>>`) for what is a simple flat interface with 5 fields. Replaced with a plain `interface OidcClaims { email: string; sub?: string; ... }` — clearer and self-contained. |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Replaced type alias with explicit interface — no behavioral change. |
| ✅ Validated | 🔧 REPLACED — 2026-04-03 |

---

## 23. `checkIfAppInstalled` — `core/services/worker_update/service-worker.ts`

| | |
|---|---|
| 📍 Source | `src/app/core/services/worker_update/service-worker.ts` |
| Code | `async function checkIfAppInstalled()` — checks for `app_version` entry in cache |
| 🔍 Evidence | Was previously exported, internalized in Phase 6 but kept "for testability". No runtime caller, no test references it. Dead code with no justification to keep. |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Removed function entirely. No callers affected. |
| ✅ Validated | 🗑️ REMOVED — 2026-04-03 |

---

## 24. `noCacheHeaders` function — `core/services/worker_update/service-worker.ts` (CLEANUP)

| | |
|---|---|
| 📍 Source | `src/app/core/services/worker_update/service-worker.ts` |
| Code | `const noCacheHeaders = () => { ... }` — arrow function recreating `Headers` object on every call |
| 🔍 Evidence | Unnecessary allocation per fetch call. Replaced with immutable `NO_CACHE_INIT` constant — same semantics, zero overhead. |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Replaced with `const NO_CACHE_INIT: RequestInit` constant. |
| ✅ Validated | 🔧 REPLACED — 2026-04-03 |

---

## 25. `export type { AppVersion }` re-export — `core/services/worker_update/worker_update.service.ts` (CLEANUP)

| | |
|---|---|
| 📍 Source | `src/app/core/services/worker_update/worker_update.service.ts` line 8 |
| Code | `export type { AppVersion } from './service-worker.interfaces';` |
| 🔍 Evidence | `AppVersion` is only used internally within `worker_update.service.ts` (local type annotations). No other file in the codebase imports `AppVersion` from this service. |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Changed to a plain `import type` — no external consumers affected. |
| ✅ Validated | 🔧 REPLACED — 2026-04-03 |

---

## 26. `createUser()` + `validateEmail()` + `user$` + `userSubject` — `core/services/user/user.service.ts`

| | |
|---|---|
| 📍 Source | `src/app/core/services/user/user.service.ts` |
| Code | `async createUser(user)`, `const validateEmail`, `private readonly userSubject`, `public user$`, constructor `ready$.subscribe(...)` |
| 🔍 Evidence | `createUser()` had no runtime callers (only in tests). `user$` was consumed only by TopbarComponent, which now reads `AuthService.currentUser` signal directly. `validateEmail` was only used inside `createUser`. The `ready$` subscription in the constructor was an unmanaged leak. AuthService is the canonical write path for the `users` table. |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Removed `createUser`, `validateEmail`, `userSubject`, `user$`, constructor subscription, and `BehaviorSubject`/`Observable` imports. UserService simplified to read-only `getUser()`. TopbarComponent now uses `AuthService.currentUser` signal. |
| ✅ Validated | 🗑️ REMOVED — 2026-04-03 |

---

## 27. `mockCurrentVersion` + `mockLatestVersion` dev constants — `core/services/worker_update/worker_update.service.ts`

| | |
|---|---|
| 📍 Source | `src/app/core/services/worker_update/worker_update.service.ts` lines 10-20 |
| Code | `const mockCurrentVersion` and `const mockLatestVersion` used to initialize signals in `isDevMode()` |
| 🔍 Evidence | Dev-only mock versions with hardcoded hashes (`0000...`, `1111...`) always caused `needUpdate=true` in dev mode. This created confusing false-positive update prompts during development. Signals now start as `null` in all modes, consistent with production behavior. |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Removed both constants, removed `isDevMode` and `environment` imports. Signals initialized to `null`. |
| ✅ Validated | 🗑️ REMOVED — 2026-04-03 |

---

## 28. `buildSupportNameFilterTables` + `getUniqueSortedSupportNamesFromAttachments` — `supportsTable/helpers.ts`

| | |
|---|---|
| 📍 Source | `src/app/features/study/presentation/components/sections-tab/newSectionModal/manualSection/supportsTable/helpers.ts` |
| Code | `getUniqueSortedSupportNamesFromAttachments()` and `buildSupportNameFilterTables()` |
| 🔍 Evidence | Replaced by `AttachmentService.distinctSupportNames$` which uses Dexie `uniqueKeys()` index-level query instead of loading all entities. No remaining consumers after refactor. |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Removed both functions + `CatalogAttachment` import. Perf improvement: ~3s → ~100ms for support name dropdown. |
| ✅ Validated | 🗑️ REMOVED — 2026-05-19 |


---

## 29. Legacy attachments flat-table API — `AttachmentService` + `catAttachments`

| | |
|---|---|
| 📍 Source | `src/app/shared/catalog/services/attachment.service.ts` (pre-V6 refactor), `src/app/infrastructure/database/schemas/catalog-attachment.schema.ts`, `src/app/shared/catalog/services/attachment.helpers.ts::mapAttachmentCsvToEntities` |
| Code | `getAttachments()` + `allAttachments$` exposed by `AttachmentService`, along with the `parseCsvAndStore` + `replaceTableData(catAttachments)` pipeline. The `mapAttachmentCsvToEntities` helper (flat shape) is still exported temporarily for backward compatibility. The Dexie `catAttachments` table is removed in V6 (replaced by `catSupportAttachments` grouped by `support_name`). The `CATALOG_ATTACHMENT_SCHEMA` schema is now only referenced by the historical V1–V5 versions of `AppDatabase`. |
| 🔍 Evidence | No external consumer references `getAttachments()`/`allAttachments$` anymore after switching to streaming via Web Worker (`attachment-import.worker.ts`). The flat mapping is only used by legacy tests (compat helper). The `Papa.parse complete` + flat `bulkAdd` pipeline caused a ~278 MB memory peak for a 25 MB CSV. |
| ⚠️ Confidence | **MEDIUM** (`getAttachments`/`allAttachments$` ⇒ HIGH; full removal of the `CATALOG_ATTACHMENT_SCHEMA` symbol and of the `catAttachments!: Table<...>` declaration is not possible while V1–V5 versions remain in `AppDatabase`) |
| Removal impact | Remove `getAttachments()`, `allAttachments$`, and the `mapAttachmentCsvToEntities` helper (and its spec) after a release without regression. Keep `CATALOG_ATTACHMENT_SCHEMA` and the `catAttachments` declaration for the Dexie migration. |
| ✅ Validated | ⏳ PENDING — proposed on 2026-06-02 |


---

## 30. Legacy `attachment-import.worker` (attachment-only Web Worker)

| | |
|---|---|
| 📍 Source | `src/app/shared/catalog/services/attachment-import.worker.ts`, `attachment-import.worker.interfaces.ts`, `attachment-import.worker.spec.ts` |
| Code | Worker dedicated solely to `attachments.csv` (request/response types `AttachmentImportWorkerRequest`/`AttachmentImportWorkerResponse`, function `runImport`). |
| 🔍 Evidence | Replaced by the generic pipeline `src/app/shared/catalog/csv-import/` (engine + worker + client + 6 configs) that shares PapaParse + IndexedDB streaming across all 6 catalog CSVs. `AttachmentService.importFromFile()` now delegates to `CsvImportClientService.importCsv('attachments')`. No remaining consumers. |
| ⚠️ Confidence | **HIGH** |
| Removal impact | 3 files removed. Code shared across the 6 catalogs (cables/chains/lines/maintenance/obstacles/attachments). |
| ✅ Validated | 🗑️ REMOVED — CSV pipeline consolidation |

---

## 31. `obstacle_type_rte.csv` (legacy obstacle CSV catalog)

| | |
|---|---|
| 📍 Source | `public/data/obstacle_type_rte.csv` |
| Code | 3-column CSV (`obstacle_type;obstacle_type_name;details`) historically imported by `ObstaclesService.importFromFile()`. |
| 🔍 Evidence | Superseded by `public/data/obstacle_configuration.json` which carries the same 3 fields plus per-obstacle `redZone`/`conformity`, regulatory rules, conformity distances, wind zones and scalar config. The CSV file is no longer fetched by any worker config (`obstacles.config.ts` now points at `obstacle_configuration.json`). |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Delete the CSV file. The Python asset-hash script ignores extensions other than `.csv`/`.json` automatically. |
| ✅ Validated | ⏳ PENDING — proposed on 2026-06-05 |

---

## 32. `ObstacleTypeCsvDto` interface

| | |
|---|---|
| 📍 Source | `src/app/infrastructure/dto/obstacle-type-csv.dto.ts`, re-export in `src/app/infrastructure/dto/index.ts` line 14 |
| Code | `export interface ObstacleTypeCsvDto { obstacle_type, obstacle_type_name, details }` |
| 🔍 Evidence | Only consumed by the legacy CSV-based `obstacles.config.ts` and its spec file. After the JSON pivot, the obstacle import path uses `ObstacleConfigurationJsonDto` (co-located in `configs/obstacles.config.interfaces.ts`). The DTO and its re-export become orphan. The spec file `obstacles.config.spec.ts` is rewritten in Phase 5 to drop the import. |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Delete `obstacle-type-csv.dto.ts` and remove the re-export line in `infrastructure/dto/index.ts`. |
| ✅ Validated | ⏳ PENDING — proposed on 2026-06-05 |

---

## 33. `applyObstacleOutputToLitData` + obstacle rendering from registration tasks

| | |
|---|---|
| 📍 Source | `obstaclesForm.service.ts` (method removed), `plot.service.ts` (syncedOutput usage removed), `loadForms.service.ts` (syncedOutput usage removed) |
| Code | `applyObstacleOutputToLitData(obstacleOutput)` — merged `ObstacleOutput.obstacles` into `litData` after `addBulkObstacles`/`addSingleObstacle`/`syncObstacles` calls |
| 🔍 Evidence | Obstacle registration tasks (`addBulkObstacles`, `addSingleObstacle`, `deleteObstacle`, `clearObstacles`) now return `undefined` — they only register in the engine. Obstacle 3D rendering coordinates are obtained via `refreshProjection` instead. |
| ⚠️ Confidence | **HIGH** |
| Removal impact | Already removed. `ObstacleOutput` interface kept for `refreshProjection` output. |
| ✅ Validated | 🗑️ REMOVED — 2026-06-17 |
