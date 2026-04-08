# PlotService Refactoring Plan

## Context

`PlotService` is a god service (~300 lines, 27 consumers) mixing 5 distinct responsibilities.
The goal is to extract 3 specialized services and reduce `PlotService` to a pure data layer orchestrator.
Migration strategy is **progressive via facade**: `PlotService` re-delegates extracted signals to avoid breaking 27 consumers immediately.

---

## Identified responsibilities

| Group | Signals / methods | Problem |
|---|---|---|
| **Resolution** | `resolution`, `appliedResolution`, `defaultResolution`, `setResolution`, `applyResolution`, `normalizeResolution`, `localStorage`, `getConfig` task | Fully independent from section data |
| **Options / Camera** | `plotOptions`, `selectedDisplayOptions`, `axesNorms`, `camera`, `isFreePositioningMode`, `plotOptionsChange`, `getCamera`, `refreshCamera`, `setAxesNorms` | No Python calls — pure display state |
| **Span navigation** | `getSpanOptions`, `getSpanOptionsWithIndex`, `getSupportIndex`, `getSupportOptions`, `spanAmountChoice`, `getSpanCount` | Pure computed on `section.supports`, no side effects |
| **Data layer** | `litData`, `baseLitData`, `loading`, `error`, `refreshSection`, `refreshProjection`, `purgePlot` | Core — Python calls |
| **Global state** | `section`, `study`, `isStudioActive`, `workerReady`, `subscription`, constructor effects, `resetAll`, `modifySection`, `temporaryLoadData` | Orchestration |

---

## Files to create

```
src/app/core/services/plot/
├── plot-options.utils.ts           ✅ DONE — checkIfProjectionNeedRefresh (pure function, exported)
├── plot-resolution.service.ts      ✅ DONE — Phase 1
├── plot-resolution.service.spec.ts ✅ DONE — 21 tests
├── plot-options.service.ts         ✅ DONE — Phase 2
├── plot-options.service.spec.ts    ✅ DONE — 28 tests
├── plot-span.service.ts            ← Phase 3 (renamed from PlotNavigationService)
└── plot-span.service.spec.ts
```

---

## ✅ Phase 1 — `PlotResolutionService` (low risk, fully isolated) — DONE

**Create** `src/app/core/services/plot/plot-resolution.service.ts`

**Extract:**
- Signals: `resolution`, `appliedResolution`, `defaultResolution`
- Constants (private): `MIN_RESOLUTION`, `RESOLUTION_STORAGE_KEY`
- Methods: `normalizeResolution()` (private), `setResolution()`, `applyResolution()`
- Constructor effect: `workerReady` → `getConfig` task → update `defaultResolution`, re-clamp `resolution`
- `localStorage` access → use `globalThis.localStorage`
- Implements `OnDestroy` → `subscription.unsubscribe()`
- Injects `WorkerPythonService` directly (avoids circular dependency with `PlotService`)

**`PlotService` after Phase 1:**
- Injects `PlotResolutionService`
- Re-delegates public signals as facade: `resolution = this.resolutionService.resolution`, etc.
- Removes its own `localStorage`, `MIN_RESOLUTION`, `RESOLUTION_STORAGE_KEY`, `normalizeResolution`

**Primary consumer to eventually migrate (Phase 5):** `scale-view.component.ts`

---

## ✅ Phase 2 — `PlotOptionsService` (medium risk, many readers) — DONE

**Create** `src/app/core/services/plot/plot-options.service.ts`

**Extract:**
- Signals: `plotOptions`, `selectedDisplayOptions`, `axesNorms`, `camera`, `isFreePositioningMode`
- Constants (private): `defaultPlotOptions`, `defaultSelectedDisplayOptions`
- Methods: `plotOptionsChange()`, `getCamera()`, `refreshCamera()`, `setAxesNorms()`
- `getCamera()` uses `DOCUMENT` token (inject `DOCUMENT` from `@angular/common`) — same pattern as `IconComponent`

**Circular dependency solution:**
`plotOptionsChange()` must trigger `refreshProjection()` in `PlotService`.
→ **Option chosen:** `plotOptionsChange()` accepts an optional callback `onProjectionNeeded?: () => void`
  called internally when `checkIfProjectionNeedRefresh` returns true.
  `PlotService` passes `() => this.refreshProjection()` when calling `plotOptionsChange`.

**`PlotService` after Phase 2:**
- Injects `PlotOptionsService`
- Re-delegates public signals as facade
- `resetAll()` calls `plotOptionsService.reset()` internally

---

## Phase 3 — `PlotSpanService` (low risk, pure computed) ← NEXT

**Create** `src/app/core/services/plot/plot-span.service.ts`

**Extract:**
- Signal: `spanAmountChoice`
- Computed: `getSpanOptions`, `getSpanOptionsWithIndex`
- Methods: `getSupportIndex()`, `getSupportOptions()`, `getSpanCount()` (private)
- Injects `PlotService` to read `section()` — no circular dependency (one direction only)

**`PlotService` after Phase 3:**
- Injects `PlotSpanService`
- Re-delegates computed and methods as facade

**Primary consumers to eventually migrate (Phase 5):**
- `obstaclesForm.service.ts`
- `obstaclesForm.component.ts`

---

## Phase 4 — `PlotService` slim (data layer orchestrator)

After phases 1–3, `PlotService` contains only:

**Signals:** `litData`, `baseLitData`, `loading`, `error`, `section`, `study`, `isStudioActive`, `workerReady`, `temporaryLoadData`

**Methods:** `refreshSection()`, `refreshProjection()`, `purgePlot()`, `resetAll()`, `modifySection()`

**Constructor effects:**
- `workerReady` effect → delegated to `PlotResolutionService`
- `isStudioActive + workerReady + section` → `refreshSection`

**Fixes applied in this phase:**
- `console.error` → `LoggerService` (2 occurrences in `refreshSection`)
- `document.getElementById` → `DOCUMENT` token (in `getCamera`, `purgePlot`)
- `subscription` unsubscribe → moved to `PlotResolutionService.ngOnDestroy()`

**`temporaryLoadData` stays in `PlotService`** (read/written by `obstaclesForm.service`, `loadForms.service`, `section-plot.component`)

---

## Phase 5 — Consumer migration (optional cleanup)

Remove facade re-delegations from `PlotService`.
Migrate the 27 consumers to inject the right service directly:
- `PlotResolutionService` → `scale-view.component.ts`
- `PlotOptionsService` → components reading `plotOptions`, `camera`, `axesNorms`
- `PlotSpanService` → `obstaclesForm.service.ts`, `obstaclesForm.component.ts`

---

## `plot-options.utils.ts`

```typescript
// checkIfProjectionNeedRefresh — pure function, exported
// Moved here from plot.service.ts to keep it testable without a service instance
export const checkIfProjectionNeedRefresh = (
  oldOptions: PlotOptions,
  newOptions: PlotOptions,
  loading: boolean
): boolean => { ... }
```

**`plot.service.spec.ts` change:** update import from `'./plot.service'` to `'./plot-options.utils'` — only change, no assertion modifications.

---

## Checklist before starting each phase

**Phase 1** ✅
- [x] Run `npm run test` baseline — all tests green
- [x] Implement phase
- [x] Create `.spec.ts` for each new service (21 tests)
- [x] Run `npm run test` — no regression

**Phase 2** ✅
- [x] Run `npm run test` baseline — 124 tests green
- [x] Implement phase
- [x] Create `.spec.ts` for each new service (28 tests)
- [x] Run `npm run test` — 152 tests, no regression

**Phase 3** ⏳
- [ ] Run `npm run test` baseline — all tests green
- [ ] Implement phase
- [ ] Create `.spec.ts` for each new service
- [ ] Run `npm run test` — no regression
- [ ] Run `npm run lint` — no errors

**Phase 4** ⏳
- [ ] Run `npm run test` baseline — all tests green
- [ ] Implement phase
- [ ] Run `npm run test` — no regression
- [ ] Run `npm run lint` — no errors

---

## Full verification points

| # | Point | Where |
|---|---|---|
| Extracted services | `PlotResolutionService`, `PlotOptionsService`, `PlotSpanService` | Phases 1–3 |
| Pure utility | `checkIfProjectionNeedRefresh` in `plot-options.utils.ts` | ✅ Phase 1 |
| No circular dependency | `plotOptionsChange` callback pattern | ✅ Phase 2 |
| Unit tests | Spec file per new service | ✅ Phase 1 (21) ✅ Phase 2 (28) ⏳ Phase 3 |
| `resetAll` coordination | `plotOptionsService.reset()` called from `PlotService` | ✅ Phase 2 |
| `DOCUMENT` token | `getCamera()` in `PlotOptionsService` ✅ · `purgePlot()` in Phase 4 |
| `temporaryLoadData` | Stays in `PlotService` | Phase 4 |
| `subscription` memory leak | `OnDestroy` in `PlotResolutionService` | ✅ Phase 1 |
| `console.error` → logger | `LoggerService` in `PlotService` | Phase 4 |
| `localStorage` → `globalThis` | `PlotResolutionService` | ✅ Phase 1 |

---

## Future evolutions unlocked by this refactoring

- **New view type** (bird's eye) → `PlotOptionsService`
- **Plot export / screenshot** → new isolated `PlotExportService`
- **Additional annotation layers** → new `PlotAnnotationService`
- **Resolution presets** → `PlotResolutionService`
- **Incremental obstacle rendering** via `Plotly.relayout()` / `Plotly.addTraces()` → future `PlotLayerService`
