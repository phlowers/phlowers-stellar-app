# Obstacles and Obstacle Distances

This document describes the obstacle management system and the distance calculation pipeline for developers.

Obstacles represent physical objects near power lines (buildings, trees, etc.) whose clearance distances must be computed and visualized. The system covers the full pipeline: from user input, through Python computation, to interactive Plotly rendering.

---

## Architecture overview

```
┌──────────────────────────────────────────────────────────────────────┐
│  Presentation layer                                                  │
│                                                                      │
│  ObstaclesFormComponent           SectionPlotComponent              │
│  (features/studio/obstacles/)     (shared/components/studio/section/)│
│         │                                   │                        │
│         │ reads/writes                      │ reads                  │
└─────────┼───────────────────────────────────┼────────────────────────┘
          │                                   │
┌─────────▼───────────────────────────────────▼────────────────────────┐
│  Service layer                                                        │
│                                                                       │
│  ObstaclesFormService          PlotService       ObstaclesService     │
│  (core/services/obstacles-form) (core/services/plot) (core/services) │
│         │                          │                    │             │
│         │ runTask()                │ runTask()          │ signals     │
└─────────┼──────────────────────────┼────────────────────┼────────────┘
          │                          │                    │
┌─────────▼──────────────────────────▼────────────────────▼────────────┐
│  Worker layer                                                         │
│                                                                       │
│  WorkerPythonService  (core/services/worker_python/)                 │
│         │                                                             │
│         │ Pyodide (WebAssembly)                                       │
│         ▼                                                             │
│  functions.py  (worker_python/tasks/python-scripts/)                 │
│    add_obstacles()                                                    │
│    calculate_obstacles_distances()                                    │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Key files at a glance

| File | Purpose |
|---|---|
| `shared/domain/obstacles/obstacle-form.interfaces.ts` | Reactive form and domain types |
| `core/services/obstacles-form/obstaclesForm.service.ts` | Form state, save & compute orchestration |
| `core/services/obstacles/obstacles.service.ts` | Obstacle type catalog, selection signals |
| `core/services/plot/plot.service.ts` | Geometry state, distance storage |
| `core/services/worker_python/worker-python.service.ts` | Pyodide task runner |
| `core/services/worker_python/tasks/types.ts` | `Distance`, `DistancePoint`, task I/O types |
| `core/services/worker_python/tasks/python-scripts/functions.py` | `add_obstacles()`, `calculate_obstacles_distances()` |
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
  uuid: string;                        // UUID v4
  supportUuid: string;                 // Parent support reference
  name: string;
  type: string;                        // e.g. 'house', 'tree'
  altitudeType: 'absolute' | 'relative';
  referenceSupport: 'LEFT' | 'RIGHT';  // Which support is the X origin
  lateralDistanceType: 'SPAN_AXIS' | 'LINE_AXIS';
  positions: Position3D[];             // One or more 3-D points
}

interface Position3D {
  x: number | null;   // Horizontal, meters
  y: number | null;   // Lateral, meters
  z: number | null;   // Altitude, meters
}
```

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
2. The obstacle is saved to the section in memory.
3. `PlotService.calculateAndSave()` is called, which runs the two Python tasks (see below).

### 3. Python computation — `WorkerPythonService`

Two tasks are run sequentially:

| Task constant | Python function | What it does |
|---|---|---|
| `Task.addObstacle` | `add_obstacles()` | Adds the obstacle geometry to the calculation engine; returns updated section geometry (`GetSectionWithBaseOutput`) |
| `Task.calculateObstaclesDistances` | `calculate_obstacles_distances()` | Computes clearance distances for all saved obstacles; returns `Distance[]` |

The worker uses Pyodide (Python in WebAssembly) — see [Engine Worker](engine_worker.md) for the worker infrastructure.

### 4. State storage — `PlotService`

After computation:

- `litData` signal is updated with the new geometry (including obstacle 3-D points).
- `distances` signal is updated with the distance results.
- `distanceType` signal controls which distance variant is rendered (`'oblique'`, `'vertical'`, `'horizontal'`, or `null`).

### 5. Plot rendering — `SectionPlotComponent` + helpers

`SectionPlotComponent` computes a `plotState` signal that merges all relevant signals. Any change triggers a debounced (100 ms) call to `refreshPlot()`, which calls `createPlot()`.

`createPlot()` assembles:

- Base geometry traces (spans, supports, insulators…).
- **Obstacle annotations** — `createObstaclesAnnotations()` in `obstacles.ts` — one dot marker (`●`) and one label per obstacle point; red when selected, black otherwise.
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

This ensures obstacle geometry and distances stay consistent with the current section state.

---

## Known limitations and TODOs

- The Python functions currently use **mock data** for distance computation. The real implementation via mechaphlowers is pending.
- Distance results are keyed by **obstacle name** in the Python output. The TypeScript code works around this (see `obstaclesForm.service.ts` line 107). The key should be changed to UUID once the Python side is updated.
