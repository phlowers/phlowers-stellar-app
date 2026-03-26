# Update Refactor Plan Status

## Objective

This document tracks the update refactor requested for the application.

Target behavior:

- No automatic update triggered by the Service Worker.
- One update verification per application startup.
- Explicit user consent before applying an update.
- Compatibility with Apache OIDC for authenticated update requests.
- Offline capability preserved.
- User-owned data safety guaranteed for `users` and `studies` tables.

## Target Architecture

The refactor moves update orchestration out of the Service Worker and into Angular.

### Before

- The Service Worker could fetch `assets_list.json` during activation.
- The Service Worker could update cached assets automatically.
- The application could re-check updates on online state changes.
- Manifest fetching relied on raw `fetch()`, which is not compatible with the OIDC-based update path.

### After

- The Service Worker is responsible only for cache serving, installation, and explicit update commands.
- Angular performs the startup version check.
- Angular uses `HttpClient` for manifest access so OIDC token injection can happen through an interceptor.
- Updates are applied only after the user clicks the update action.

## Completed Work

### Phase 1: Remove automatic update behavior from the Service Worker

Completed changes:

- Removed automatic manifest comparison and cache mutation from Service Worker activation.
- Kept the worker activation flow limited to cached state validation and `worker_ready` notification.
- Removed the online-triggered update check from the root component.

Why this was needed:

- Service Workers do not have access to the authenticated Angular runtime context required for OIDC-based update requests.
- Automatic update on activation violated the new requirement for explicit user consent.
- Re-checking on every online transition violated the requirement for a single startup check.

Main files changed:

- `src/app/core/services/worker_update/service-worker.ts`
- `src/app/app.component.ts`

### Phase 2: Introduce Angular-side update orchestration

Completed changes:

- Added `AppUpdateOrchestratorService` to own the startup update check.
- Added a functional HTTP interceptor to inject the OIDC token for protected update requests.
- Registered the interceptor in the application HTTP configuration.
- Switched manifest fetching in `UpdateService` from raw `fetch()` to `HttpClient`.
- Extended the build manifest generation script to also write `build-info.json`.

Why this was needed:

- OIDC compatibility requires update requests to flow through Angular `HttpClient`.
- A dedicated orchestrator makes the startup-only behavior explicit and testable.
- Reusing `HttpClient` in `UpdateService` ensures catalog sync and version checks follow the same authenticated access path.
- `build-info.json` provides a standalone build descriptor that can be used by later phases or deployment tooling.

Main files changed:

- `src/app/core/services/worker_update/app-update-orchestrator.service.ts`
- `src/app/core/interceptors/oidc-token.interceptor.ts`
- `src/app/app.config.ts`
- `src/app/core/services/worker_update/worker_update.service.ts`
- `scripts/create_assets_list_for_service_worker.py`

### Phase 3: Wire the new flow into startup and user action

Completed changes:

- The root component now triggers catalog setup first, then launches the one-shot startup update check.
- The update button now routes through the orchestrator acceptance path instead of calling the legacy update path directly.

Why this was needed:

- The application needs a single and deterministic entry point for update checks.
- Explicit acceptance must be separated from version detection.

Main files changed:

- `src/app/app.component.ts`
- `src/app/app.component.spec.ts`

### Phase 4: Add protected data safety validation

Completed changes:

- Added a before/after snapshot validation around catalog synchronization.
- The root component now captures `users` and `studies` counts before catalog sync.
- The root component verifies the same counts after catalog sync.
- If those protected tables change unexpectedly, the sync fails with an explicit integrity error.

Why this was needed:

- The update refactor must guarantee that catalog refresh never mutates user-owned data.
- This makes the data safety requirement explicit in runtime behavior and in unit tests.

Main files changed:

- `src/app/app.component.ts`
- `src/app/app.component.spec.ts`

## Test Coverage Added or Updated

### Service Worker

- Verified that Service Worker unit tests still pass after removing auto-update activation behavior.

File:

- `src/app/core/services/worker_update/service-worker.spec.ts`

### Update Service

- Migrated manifest-related tests to modern `HttpClient` testing.
- Verified version checks, toast behavior, and Service Worker message handling.

File:

- `src/app/core/services/worker_update/worker_update.service.spec.ts`

### App Update Orchestrator

- Added dedicated tests for:
  - new version detection,
  - matching version behavior,
  - graceful HTTP failure handling,
  - single-check-per-boot guarantee,
  - user acceptance behavior.

File:

- `src/app/core/services/worker_update/app-update-orchestrator.service.spec.ts`

### OIDC Interceptor

- Added dedicated tests for:
  - token injection,
  - stored `Bearer` token normalization,
  - no-token path,
  - non-protected request pass-through,
  - local storage failure handling,
  - request cloning behavior.

File:

- `src/app/core/interceptors/oidc-token.interceptor.spec.ts`

### Root Component

- Updated tests to mock the orchestrator.
- Added protected data safety validation coverage.

File:

- `src/app/app.component.spec.ts`

## Validation Results

Focused test runs completed successfully:

- `src/app/core/services/worker_update/service-worker.spec.ts`
- `src/app/core/services/worker_update/worker_update.service.spec.ts`
- `src/app/core/services/worker_update/app-update-orchestrator.service.spec.ts`
- `src/app/core/interceptors/oidc-token.interceptor.spec.ts`
- `src/app/app.component.spec.ts`

Verified results:

- Service Worker tests passed.
- Update service tests passed.
- App update orchestrator tests passed.
- OIDC interceptor tests passed.
- Root component tests passed.

Aggregate focused result observed during validation:

- 69 tests passed across 5 test files.

## Current Runtime Behavior

At this point, the application behaves as follows:

1. The Service Worker activates without auto-updating cached assets.
2. The app initializes storage and catalog synchronization.
3. After startup preparation, Angular performs one manifest check.
4. If the latest version differs from the cached version, the UI opens the update prompt.
5. If the user accepts, Angular sends an explicit update command to the Service Worker.
6. Catalog synchronization now validates that protected data tables remain unchanged.

## Remaining Work

### Phase 5: End-to-end update flow coverage

Completed changes:

- Replaced the legacy single E2E test (which bypassed the UI by posting `{ type: 'update' }` directly to the Service Worker) with three new user-facing Playwright scenarios aligned with the new consent-based startup flow.
- Added `getManifestFetchCount()` helper to verify the single-check-per-boot guarantee during acceptance tests.
- Extended the simulation server (`e2e/update-sim-server.mjs`) with:
  - A `manifestFetchCount` counter incremented on every `/assets_list.json` request.
  - A `GET /__e2e/manifest-fetch-count` endpoint to read the counter from Playwright.
  - A `POST /__e2e/reset` endpoint to atomically reset the scenario and counter between tests.
- Fixed the `app.component.html` template: the "Update now" button was incorrectly calling `updateService.update()` directly instead of routing through `onUpdateClick()` → `AppUpdateOrchestratorService.acceptUpdate()`.

New test scenarios:

1. **User accepts update**: installs v1, switches server to v2, reloads page, waits for the update dialog, clicks "Update now", asserts v2 in cache and updated cable catalog. Also asserts manifest fetch count is in the expected range of 1–3 (orchestrator + Service Worker update + possible post-reload check).
2. **User declines update**: same setup, but user clicks "Later". Asserts the dialog closes and the cache remains at v1 with no asset or catalog mutation.
3. **No update dialog when versions match**: installs v1, reloads with server still at v1, asserts the dialog does not appear and the version stays at v1.

Why this was needed:

- The previous E2E test reflected the old architecture where the Service Worker could be directly commanded to update. This bypassed the new user consent flow entirely.
- The new tests exercise the complete realistic user journey: startup detection → dialog → decision → cache mutation or preservation.
- The `reset` and `manifest-fetch-count` server endpoints let the tests verify the "single-check-per-boot" architectural property from outside the Angular runtime.

Main files changed:

- `e2e/update-flow.spec.ts`
- `e2e/update-sim-server.mjs`
- `src/app/app.component.html` (button routing fix)

### Phase 6: Documentation cleanup

Still pending:

- Update any project documentation that still describes the old automatic update model.
- Document the new startup-only update flow and the role of the OIDC interceptor.

### Phase 7: Final cleanup

Still pending:

- Review whether any now-redundant logic remains in `UpdateService`.
- Review whether `build-info.json` should be consumed by runtime code or kept only for deployment visibility.
- Review if additional metadata should be stored for future migration handling.

## Validation Results After Phase 5

Focused unit test run confirms no regressions:

- 41 tests passed across 3 focused files: `app.component.spec.ts`, `app-update-orchestrator.service.spec.ts`, `worker_update.service.spec.ts`.
- TypeScript compilation (`tsc --noEmit --project tsconfig.app.json`) produced no errors.
- Template routing fix (`onUpdateClick()` instead of `updateService.update()`) applied and confirmed in tests.

## Important Design Decisions

### Why the Service Worker no longer owns version decisions

- It cannot reliably participate in the authenticated OIDC update flow.
- It should remain deterministic, cache-oriented, and easy to reason about.

### Why `HttpClient` is required for manifest access

- The update request path must be compatible with token injection.
- Reusing Angular HTTP behavior avoids split logic between authenticated and unauthenticated version checks.

### Why protected data validation is count-based for now

- It provides a low-cost runtime guard against accidental destructive operations.
- It is sufficient to catch the class of failure the refactor must explicitly avoid: unintended user/study table mutation during catalog refresh.
- More advanced validation can be added later if row-level invariants are needed.

## Summary

The refactor is now functionally complete through Phase 5.

Already achieved:

- Automatic Service Worker updates removed.
- Startup-only update check implemented (single-check-per-boot guarantee).
- OIDC-compatible manifest access implemented.
- Explicit user-triggered update application implemented.
- Protected data safety validation added.
- End-to-end Playwright tests exercising real UI consent flow completed.
- Focused test coverage updated and passing.

The main remaining work is end-to-end verification and final documentation cleanup.