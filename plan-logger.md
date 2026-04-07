# Plan: LoggerService + Toast Duration

## Status: ✅ COMPLETED

---

## Phase 1 — Create `LoggerService` ✅

### Files created

**`src/app/core/services/logger/logger.service.ts`** ✅
- `@Injectable({ providedIn: 'root' })`, no dependencies, `inject()` pattern.
- Four public methods: `log()`, `error()`, `warn()`, `info()` — each wrapping the corresponding `console.*`.
- Import alias: `@core/services/logger/logger.service`

**`src/app/core/services/logger/logger.service.spec.ts`** ✅
- 8/8 tests passing.
- Covers single-message and multi-arg spread for each method.

---

## Phase 2 — Replace `console.*` in Angular DI files ✅

All 20 files migrated. Pattern: `private readonly logger = inject(LoggerService)` + `this.logger.xxx(...)`.

| File | Status |
|------|--------|
| `src/app/app.component.ts` | ✅ |
| `src/app/core/services/plot/plot.service.ts` | ✅ |
| `src/app/core/services/obstacles/obstacles.service.ts` | ✅ |
| `src/app/core/services/studies/studies.service.ts` | ✅ |
| `src/app/core/services/storage/storage.service.ts` | ✅ |
| `src/app/shared/components/studio/support/support-plot.component.ts` | ✅ |
| `src/app/shared/components/studio/section/section-plot.component.ts` | ✅ |
| `src/app/shared/catalog/services/maintenance.service.ts` | ✅ |
| `src/app/shared/catalog/services/cables.service.ts` | ✅ |
| `src/app/shared/catalog/services/attachment.service.ts` | ✅ |
| `src/app/shared/catalog/services/chains.service.ts` | ✅ |
| `src/app/shared/catalog/services/lines.service.ts` | ✅ |
| `src/app/shared/components/atoms/icon/icon.component.ts` | ✅ |
| `src/app/features/studies/presentation/components/import-study/import-study.component.ts` | ✅ |
| `src/app/features/studio/toolbar/presentation/components/l0-sum/l0-sum.component.ts` | ✅ |
| `src/app/features/studio/toolbar/presentation/components/vtl-and-guying/vtl-and-guying.component.ts` | ✅ |
| `src/app/features/studio/core/presentation/components/top-toolbar/top-toolbar.component.ts` | ✅ |
| `src/app/features/studio/field-measuring/presentation/components/parameter-calculation-15-without-wind/parameter-calculation-15-without-wind.component.ts` | ✅ |
| `src/app/features/studio/field-measuring/presentation/components/field-measuring/field-measuring.component.ts` | ✅ |
| `src/app/features/studio/core/presentation/components/free-positioning/free-positioning.component.ts` | ✅ |

---

## Phase 3 — Files left unchanged (no DI possible) ✅

| File | Reason |
|------|--------|
| `src/main.ts` | Bootstrap callback — no Angular DI context |
| `src/app/shared/components/studio/section/helpers/createPlot.ts` | Pure exported function — not a class |
| `src/app/core/services/worker_python/worker-python.ts` | Web Worker — no Angular DI |
| `src/app/core/services/worker_python/tasks/handle-task.ts` | Web Worker module — no Angular DI |
| `src/app/core/services/worker_update/service-worker.ts` | Compiled separately by `tsconfig.worker.json` → `public/service-worker.js`, no Angular DI |

---

## Phase 4 — Toast duration: 3000 → 10000 ms ✅

- `src/app/core/services/notification/notification.service.ts` — `DEFAULT_LIFE` changé de `3000` à `10000`.
- `src/app/core/services/notification/notification.service.spec.ts` — 8 assertions `life: 3000` → `life: 10000`. Tests avec valeur custom (`5000`, `6000`) inchangés.

---

## Verification ✅

- `npx vitest run` — 18/18 tests passent (8 LoggerService + 10 NotificationService).
- `grep console.* src/app` (hors logger, workers, createPlot) — aucun résultat.


## Summary

Create an injectable `LoggerService` in `src/app/core/services/logger/` that wraps `console.log`, `console.error`, `console.warn`, and `console.info`. Replace all direct `console.*` calls in Angular DI contexts (~20 files). Non-injectable files (`main.ts`, `createPlot.ts`) and Workers (`worker-python.ts`, `handle-task.ts`, `service-worker.ts`) keep their `console.*` calls unchanged. In parallel, raise the toast notification duration from 3s to 10s and update the related spec.

---

## Phase 1 — Create `LoggerService`

### New files

**`src/app/core/services/logger/logger.service.ts`**

- `@Injectable({ providedIn: 'root' })`, no dependencies, `inject()` pattern.
- Four public methods with signature `(message: string, ...data: unknown[]): void`:
  - `log()` → wraps `console.log`
  - `error()` → wraps `console.error`
  - `warn()` → wraps `console.warn`
  - `info()` → wraps `console.info`
- Import alias: `@core/services/logger/logger.service`

**`src/app/core/services/logger/logger.service.spec.ts`**

- `import { vi } from 'vitest';` — Vitest globals active.
- `TestBed.inject(LoggerService)` to get the instance.
- For each method: `vi.spyOn(console, '<level>')`, call the service method, assert called with correct args.
- Cover: single-message AND multi-arg spread `...data`.

---

## Phase 2 — Replace `console.*` in Angular DI files

Inject `private readonly logger = inject(LoggerService)` then replace `console.xxx(...)` → `this.logger.xxx(...)`.  
Import path: `import { LoggerService } from '@core/services/logger/logger.service';`

| File | Lines | Level(s) |
|------|-------|----------|
| `src/app/app.component.ts` | 159, 176, 191 | warn, error, error |
| `src/app/core/services/plot/plot.service.ts` | 223, 231 | error |
| `src/app/core/services/obstacles/obstacles.service.ts` | 131 | error |
| `src/app/core/services/studies/studies.service.ts` | 272, 281, 301, 306 | warn |
| `src/app/core/services/storage/storage.service.ts` | 52 | error |
| `src/app/shared/components/studio/support/support-plot.component.ts` | 134 | error |
| `src/app/shared/components/studio/section/section-plot.component.ts` | 188 | error |
| `src/app/shared/catalog/services/maintenance.service.ts` | 81 | error |
| `src/app/shared/catalog/services/cables.service.ts` | 92 | error |
| `src/app/shared/catalog/services/attachment.service.ts` | 84 | error |
| `src/app/shared/catalog/services/chains.service.ts` | 80 | error |
| `src/app/shared/catalog/services/lines.service.ts` | 95 | error |
| `src/app/shared/components/atoms/icon/icon.component.ts` | 48 | warn |
| `src/app/features/studies/presentation/components/import-study/import-study.component.ts` | 128, 137, 213, 220, 266, 307, 337, 370, 417, 441 | error |
| `src/app/features/studio/toolbar/presentation/components/l0-sum/l0-sum.component.ts` | 99 | log |
| `src/app/features/studio/toolbar/presentation/components/vtl-and-guying/vtl-and-guying.component.ts` | 251 | error |
| `src/app/features/studio/core/presentation/components/top-toolbar/top-toolbar.component.ts` | 64, 71, 78, 268 | log, log, log, error |
| `src/app/features/studio/field-measuring/presentation/components/parameter-calculation-15-without-wind/parameter-calculation-15-without-wind.component.ts` | 132 | error |
| `src/app/features/studio/field-measuring/presentation/components/field-measuring/field-measuring.component.ts` | 173, 215, 220, 250 | warn, log, log, log |
| `src/app/features/studio/core/presentation/components/free-positioning/free-positioning.component.ts` | 504, 519 | warn, error |

---

## Phase 3 — Files left unchanged (no DI possible)

These files keep their `console.*` calls as-is:

| File | Reason |
|------|--------|
| `src/main.ts` | Bootstrap callback — no Angular DI context |
| `src/app/shared/components/studio/section/helpers/createPlot.ts` | Pure exported function — not a class |
| `src/app/core/services/worker_python/worker-python.ts` | Web Worker — no Angular DI |
| `src/app/core/services/worker_python/tasks/handle-task.ts` | Web Worker module — no Angular DI |
| `src/app/core/services/worker_update/service-worker.ts` | Compiled separately by `tsconfig.worker.json` → `public/service-worker.js`, no Angular DI, separate output bundle |

---

## Phase 4 — Toast duration: 3000 → 10000 ms

### `src/app/core/services/notification/notification.service.ts`

- Change `const DEFAULT_LIFE = 3000;` → `const DEFAULT_LIFE = 10000;`
- Update the 4 JSDoc lines `@param life - Display duration in ms, defaults to 3000` → `defaults to 10000`

### `src/app/core/services/notification/notification.service.spec.ts`

The spec hardcodes `life: 3000` in every `toHaveBeenCalledWith` expectation. All occurrences must be updated to `life: 10000`. Affected `it` blocks (those that do NOT pass an explicit custom life):

- `success` — "should call MessageService.add with severity success and provided detail"
- `success` — "should use custom summary when provided"
- `error` — "should call MessageService.add with severity error and provided detail"
- `error` — "should use custom summary when provided"
- `info` — "should call MessageService.add with severity info and provided detail"
- `info` — "should use custom summary when provided"
- `warning` — "should call MessageService.add with severity warn and provided detail"
- `warning` — "should use custom summary when provided"

The `it` blocks using an explicit custom life (e.g. `life: 5000`, `life: 6000`) are unchanged.

---

## Verification

1. `npm run lint` — 0 errors
2. `npm run test` — all suites pass (including new `logger.service.spec.ts` and updated `notification.service.spec.ts`)
3. `grep -r "console\." src/app --include="*.ts" | grep -v "logger.service.ts" | grep -v "worker"` — should return only `main.ts` and `createPlot.ts`
4. Visual browser test: toast notifications remain visible for 10 seconds

---

## Scope — explicitly excluded

- `service-worker.ts` (14 console.* calls) — separate compilation target, kept as-is
- `main.ts` (2 console.* calls) — bootstrap callback, kept as-is
- `createPlot.ts` (1 console.warn) — pure function, kept as-is
- `worker-python.ts` + `handle-task.ts` (3 console.* calls) — Web Workers, kept as-is
- No environment-based log level filtering (out of scope)
- No log buffering or remote log shipping (out of scope)
