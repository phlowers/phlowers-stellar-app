# Obstacles and Obstacle Distances

This document describes the obstacle management system and the distance calculation pipeline for developers.

Obstacles represent physical objects near power lines (buildings, trees, etc.) whose clearance distances must be computed and visualized. The system covers the full pipeline: from user input, through Python computation, to interactive Plotly rendering.

---

## Architecture overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Presentation layer                                                     │
│                                                                         │
│  ObstaclesFormComponent           SectionPlotComponent                  │
│  (features/studio/obstacles/)     (shared/components/studio/section/)   │
│         │                                   │                           │
│         │ reads/writes                      │ reads                     │
└─────────┼───────────────────────────────────┼───────────────────────────┘
          │                                   │
┌─────────▼───────────────────────────────────▼──────────────────────────────┐
│  Service layer                                                             │
│                                                                            │
│  ObstaclesFormService   LoadFormsService   PlotService   ObstaclesService  │
│  (core/services/        (features/studio/  (core/services (core/services)  │
│   obstacles-form/)       loads/)            /plot/)                        │
│         │                    │                 │               │           │
│         └────────────────────┴──► reapplyObstacles()           │ signals   │
│                                          │                     │           │
│                                    runTask() ×N                │           │
└──────────────────────────────────────────┼─────────────────────┼───────────┘
                                           │                     │
┌──────────────────────────────────────────▼─────────────────────▼─────────┐
│  Worker layer                                                            │
│                                                                          │
│  WorkerPythonService  (core/services/worker_python/)                     │
│         │                                                                │
│         │ Pyodide (WebAssembly)                                          │
│         ▼                                                                │
│  functions.py  (worker_python/tasks/python-scripts/)                     │
│    change_state()                                                        │
│    add_obstacles()                                                       │
│    calculate_obstacles_distances()                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Key files at a glance

| File | Purpose |
|---|---|
| `shared/domain/obstacles/obstacle-form.interfaces.ts` | Reactive form and domain types |
| `shared/domain/helpers/span-loads.helpers.ts` | `recheckSpanLoads()` utility shared between loads and plot service |
| `core/services/obstacles-form/obstaclesForm.service.ts` | Form state, save & compute orchestration |
| `core/services/obstacles/obstacles.service.ts` | Obstacle type catalog, selection signals |
| `core/services/plot/plot.service.ts` | Geometry state, distance storage, `reapplyObstacles()` coordination |
| `core/services/worker_python/worker-python.service.ts` | Pyodide task runner |
| `core/services/worker_python/tasks/types.ts` | `Distance`, `DistancePoint`, task I/O types |
| `core/services/worker_python/tasks/python-scripts/functions.py` | `change_state()`, `add_obstacles()`, `calculate_obstacles_distances()` |
| `features/studio/loads/presentation/services/loadForms.service.ts` | Load form state; delegates to `reapplyObstacles()` after load changes |
| `features/studio/obstacles/presentation/components/obstaclesForm/` | Obstacle creation/edit UI |
| `shared/components/studio/section/section-plot.component.ts` | Plot orchestration |
| `shared/components/studio/section/helpers/createPlot.ts` | Plotly assembly entry point |
| `shared/components/studio/section/helpers/createDistanceTraces.ts` | Distance line/annotation traces |
| `shared/components/studio/section/helpers/obstacles.ts` | Obstacle marker annotations & click handling |

---

## Data model

### `Obstacle`

Defined in `shared/domain/obstacles/obstacle-form.interfaces.ts`.

```typescript
interface Obstacle {
  uuid: string;                                          // UUID v4
  supportUuid: string;                                   // Parent support reference
  name: string;
  type: string;                                          // e.g. 'house', 'tree'
  altitudeType: 'absolute' | 'relative' | 'relative_cable';
  referenceSupport: 'LEFT' | 'RIGHT';                    // Which support is the X origin
  lateralDistanceType: 'SPAN_AXIS' | 'LINE_AXIS';
  positions: Position3D[];                               // One or more 3-D points
}

interface Position3D {
  x: number | null;   // Horizontal, meters
  y: number | null;   // Lateral, meters
  z: number | null;   // Altitude, meters (interpreted per altitudeType by Python)
}
```

`altitudeType` controls how Python interprets the `z` field:

| Value | Meaning |
|---|---|
| `'absolute'` | `z` is an NGF absolute altitude |
| `'relative'` | `z` is relative to the reference support foot altitude |
| `'relative_cable'` | `z` is relative to the cable attachment altitude of the reference support |

Python converts all altitude types to absolute NGF coordinates before returning geometry in `litData.obstacles`.

### `Distance` (result from Python)

Defined in `core/services/worker_python/tasks/types.ts`.

```typescript
interface Distance {
  obstacleUuid?: string;
  points: DistancePoint[];
}

interface DistancePoint {
  pointIndex: number;
  linePoint: [number, number, number];              // Closest wire point (absolute)
  virtualPointHorizontal: [number, number, number]; // Virtual point for horizontal leg
  virtualPointVertical: [number, number, number];   // Virtual point for vertical leg
  distanceDiagonal: number;   // Direct (oblique) clearance, meters
  distanceHorizontal: number; // Horizontal component, meters
  distanceVertical: number;   // Vertical component, meters
}
```

---

## End-to-end data flow

### 1. User input — `ObstaclesFormComponent`

The component renders a reactive form (positions, obstacle type, support, altitude/lateral type).
Position field changes are debounced (300 ms) before being written back to `ObstaclesFormService`.

### 2. Form state — `ObstaclesFormService`

Maintains the reactive form group, validates it, and exposes:

- `canCalculateAndSave` — computed signal; `true` when the form is valid and every position is complete.
- `results` — computed signal; distance results for the currently selected obstacle point, derived from `PlotService.distances`.

When the user triggers **Calculate & Save**:

1. The obstacle is built from the form (`buildObstacleFromForm()`).
2. The obstacle is upserted into the section in memory (`upsertObstacleInSection()`).
3. The section is persisted to the backend (`saveSection()`).
4. **`PlotService.reapplyObstacles()` is called** — the service no longer runs Python tasks directly. All plot update coordination is deferred to `PlotService` (see below).

### 3. Python computation — coordinated by `PlotService.reapplyObstacles()`

`reapplyObstacles()` is the single entry point for any operation that must keep loads and obstacles in sync on the Plotly plot. It is called by both `ObstaclesFormService.calculateAndSave()` and `LoadFormsService.calculateLoad()`.

It runs the following sequence:

| Step | Task constant | Python function | Condition |
|---|---|---|---|
| 1 | `Task.changeState` | `change_state()` | Only if `temporaryLoadData` is set (a load case is active) |
| 2 | `Task.addObstacle` × N | `add_obstacles()` | Once per saved obstacle in the section |
| 3 | `Task.calculateObstaclesDistances` | `calculate_obstacles_distances()` | Only if the section has at least one obstacle |

**Why this order matters:** The Python worker is stateful. `Task.changeState` resets the internal geometry to the base + load state, which clears any previously added obstacles. Running loads first and then re-adding all obstacles ensures that both loads and obstacles are always layered correctly, regardless of which form triggered the update.

After the sequence:
- `PlotService.litData` is updated with the final geometry (including obstacle 3-D points and load coordinates).
- `PlotService.distances` is updated with the new clearance results.

The worker uses Pyodide (Python in WebAssembly) — see [Engine Worker](engine_worker.md) for the worker infrastructure.

### 4. Load / obstacle interplay — `LoadFormsService`

`LoadFormsService.calculateLoad()` follows the same delegation pattern:

1. Validates and rechecks span loads against current supports (`recheckSpanLoads()` from `shared/domain/helpers/span-loads.helpers.ts`).
2. Stores the updated load data in `PlotService.temporaryLoadData`.
3. Calls **`PlotService.reapplyObstacles()`** — which applies the new load state first, then re-adds all obstacles on top.

This means calculating a load will never erase obstacle geometry, and calculating an obstacle will never erase load geometry.

### 5. State storage — `PlotService`

`PlotService` acts as the central state hub for all visualization data:

- `litData` — geometry signal updated by `reapplyObstacles()` and `refreshSection()`.
- `distances` — clearance distance results signal.
- `distanceType` — which distance variant is rendered (`'oblique'`, `'vertical'`, `'horizontal'`, or `null`).
- `temporaryLoadData` — the active load case data (`ChargeData | null`); read by `reapplyObstacles()` to decide whether to run `Task.changeState` first.

### 6. Plot rendering — `SectionPlotComponent` + helpers

`SectionPlotComponent` computes a `plotState` signal that merges all relevant signals. Any change triggers a debounced (100 ms) call to `refreshPlot()`, which calls `createPlot()`.

`createPlot()` assembles:

- Base geometry traces (spans, supports, insulators…).
- **Obstacle annotations** — `createObstaclesAnnotations()` in `obstacles.ts` — reads absolute 3-D coordinates from `litData.obstacles` (Python-computed) to place one dot marker (`●`) and one label per obstacle point; red when selected, black otherwise.
- **Distance traces** — `createDistanceTraces()` — lines and annotations rendered differently per distance type (see below).

`Plotly.react()` is used for all updates to preserve camera/zoom state.

---

## Distance visualization

Three visual patterns are used depending on `distanceType`:

### Oblique

A single solid line from the wire point to the obstacle point.

```
  wirePoint
      \
       \  distanceDiagonal
        \
    obstaclePoint
```

### Vertical

A dotted horizontal segment (wire → virtual point) followed by a solid vertical segment (virtual point → obstacle).

```
  wirePoint ·····> virtualPointVertical
                         |
                         |  distanceVertical
                         |
                   obstaclePoint
```

### Horizontal

A dotted vertical segment (wire → virtual point) followed by a solid horizontal segment (virtual point → obstacle).

```
  wirePoint
      |  (dotted)
      |
  virtualPointHorizontal ——————> obstaclePoint
                  distanceHorizontal
```

Coordinates are projected to the active view:

| View | X axis | Y axis |
|---|---|---|
| 3-D | x | y, z |
| 2-D profile | x (along span) | z (altitude) |
| 2-D face | y (lateral) | z (altitude) |

---

## Obstacle selection and interactivity

`ObstaclesService` holds two selection signals:

- `selectedObstacleUuid` — which obstacle is active.
- `activePointIndex` — which point within that obstacle is focused.

Clicking an obstacle annotation in the plot fires a `plotly_clickannotation` event. The handler in `SectionPlotComponent`:

1. Extracts the `ObstacleAnnotationData` payload (`obstacleUuid`, `obstaclePositionIndex`).
2. Resolves the support index from the section data.
3. Calls `ObstaclesFormService.setExistingObstacle()` to load the obstacle into the form.
4. Updates the selection signals so the clicked point turns red.

---

## Section refresh cycle

When the active section changes (e.g. span selection, view toggle), `PlotService.refreshSection()` replays the full computation:

1. Fetch base geometry (`Task.getLit`).
2. For each saved obstacle, call `Task.addObstacle` to add it back.
3. Call `Task.calculateObstaclesDistances` once to get all distances.
4. Update `litData` and `distances` signals.

Note: `refreshSection()` does **not** re-apply loads (it does not call `Task.changeState`). Load application is done on demand via `reapplyObstacles()` when the user triggers a calculation.

---

## Known limitations and TODOs

- Distance results are keyed by **obstacle name** in the Python output. The TypeScript code works around this (see `obstaclesForm.service.ts` `results` computed). The key should be changed to UUID once the Python side is updated.
