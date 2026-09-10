# Obstacles, Floors and Distances

This document describes the obstacle and floor management system, and the distance calculation pipeline, for developers.

Obstacles represent physical objects near power lines (buildings, trees, etc.) whose clearance distances must be computed and visualized. **Floors** — ground profiles measured under a span — go through the same pipeline: they are registered in the engine as obstacles of a dedicated type, so they reuse its distance-to-cable calculation instead of duplicating it. The system covers the full pipeline: from user input, through Python computation, to interactive Plotly rendering.

---

## Architecture overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Presentation layer                                                          │
│                                                                              │
│  ObstaclesFormComponent   FloorComponent   QuickMeasuresComponent            │
│  (studio/obstacles/)      (studio/floor/)  (studio/core/…/quick-measures/)    │
│          │                      │                  │                         │
│          │                      │                  │     SectionPlotComponent│
│          │                      │                  │     (shared/…/section/) │
└──────────┼──────────────────────┼──────────────────┼──────────┼──────────────┘
           │                      │                  │          │
┌──────────▼──────────────────────▼──────────────────▼──────────▼──────────────┐
│  Service layer                                                               │
│                                                                              │
│  ObstacleFormService    FloorFormService     ObstaclesService                 │
│  (obstacles-form/)      (floor-form/)        (obstacles/) selection signals   │
│          │                     │                                             │
│          └──────────┬──────────┘                                             │
│                     ▼                                                        │
│          ObstacleStateService  ──────────►  PlotService                       │
│          (obstacle-state/)                  (plot/)                           │
│          worker registry calls,             litData, refreshProjection(),      │
│          distances, distanceType            diagnostics                        │
└─────────────────────────────┬───────────────────────┬────────────────────────┘
                              │                       │
┌─────────────────────────────▼───────────────────────▼────────────────────────┐
│  Worker layer                                                                │
│                                                                              │
│  WorkerPythonService  (core/services/worker_python/)                         │
│          │ Pyodide (WebAssembly)                                             │
│          ▼                                                                   │
│  api.py  (worker_python/tasks/python-scripts/) → stellar_engine → mechaphlowers│
│    initialize_study() · change_state() · add_bulk_obstacles()                 │
│    add_single_obstacle() · delete_obstacle() · refresh_projection()           │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Key files at a glance

| File | Purpose |
|---|---|
| `shared/domain/models/obstacle.model.ts` | `Obstacle`, `Position3D`, reference/lateral enums |
| `shared/domain/models/floor.model.ts` | `Floor`, `FloorPoint` |
| `shared/domain/floor/floor-form.helpers.ts` | `mapFloorToObstacle()`, `computeFloorClearance()`, `projectOnSpanAxis()` |
| `core/services/obstacles-form/obstaclesForm.service.ts` | Obstacle form state, save & compute orchestration |
| `core/services/floor-form/floor-form.service.ts` | Floor form state, clearance results, floor point selection |
| `core/services/obstacles/obstacles.service.ts` | Obstacle type catalog + the shared measure selection signals |
| `core/services/obstacle-state/obstacle-state.service.ts` | Worker obstacle registry calls, `distances`, `distanceType` |
| `core/services/plot/plot.service.ts` | Section init, `refreshProjection()`, `litData`, diagnostics |
| `core/services/worker_python/tasks/types.ts` | `Task`, `Distance`, `DistancePoint`, `PythonErrorCode` |
| `core/services/worker_python/tasks/python-scripts/api.py` | Task entry points delegating to `stellar_engine` |
| `features/studio/obstacles/presentation/components/obstaclesForm/` | Obstacle creation/edit UI |
| `features/studio/floor/presentation/` | Floor form UI and its free-positioning plot |
| `features/studio/core/presentation/components/quick-measures/` | Obstacle/floor measure picker and distance readout |
| `shared/components/studio/section/section-plot.component.ts` | Plot orchestration and click handling |
| `shared/components/studio/section/helpers/createPlot.ts` | Plotly assembly entry point |
| `shared/components/studio/section/helpers/createDistanceTraces.ts` | Distance line/annotation traces |
| `shared/components/studio/section/helpers/obstacles.ts` | Obstacle marker annotations |
| `shared/components/studio/section/helpers/createFloorTraces.ts` | Floor line, 3-D ribbon and active-point traces |

---

## Data model

### `Obstacle`

Defined in `shared/domain/models/obstacle.model.ts`.

```typescript
interface Obstacle {
  uuid: string;                                          // UUID v4
  supportUuid: string;                                   // Span = its left support
  supportIndex: number;                                  // Absolute index of that support
  name: string;
  type: string;                                          // e.g. 'accessible_building'
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

### `Floor`

Defined in `shared/domain/models/floor.model.ts`. A span holds at most one floor, whichever reference support it was saved with.

```typescript
interface Floor {
  uuid: string;
  supportUuid: string;                 // Span = its left support
  referenceSupport: 'LEFT' | 'RIGHT';  // The end point distances are measured from
  points: FloorPoint[];                // [reference support point, …free points…, closing point]
}

interface FloorPoint {
  altitude: number | null;
  distanceToRefSupport: number | null;
}
```

`mapFloorToObstacle()` turns a floor into an `Obstacle` of type `FLOOR_OBSTACLE_TYPE`, keeping the floor's own uuid and placing each point on the span axis (`x: distanceToRefSupport`, `y: 0`, `z: altitude`). Everything downstream — worker registration, rendered coordinates in `litData.obstacles`, `Distance.obstacleUuid` — therefore keys floors exactly like obstacles.

### `Distance` (result from Python)

Defined in `core/services/worker_python/tasks/types.ts`.

```typescript
interface Distance {
  obstacleUuid?: string;   // Obstacle or floor uuid
  points: DistancePoint[];
}

interface DistancePoint {
  pointIndex: number;
  linePoint: [number, number, number];              // Closest wire point (absolute)
  virtualPointHorizontal: [number, number, number]; // Virtual point for horizontal leg
  virtualPointVertical: [number, number, number];   // Virtual point for vertical leg
  distanceDiagonal: number;         // Direct (oblique) clearance, meters
  distanceHorizontal: number;       // Horizontal component, meters
  distanceVertical: number;         // Vertical component, non-negative
  signedDistanceVertical: number;   // Same distance signed, read by floors only:
                                    // negative when the cable passes below the point
}
```

Obstacles display the non-negative `distanceVertical` they have always exposed; floors are the only consumer of `signedDistanceVertical`, so a cable dipping under the profile reads as a negative clearance.

---

## End-to-end data flow

The Python worker is **stateful**: it holds a study plus a registry of obstacles. Tasks either mutate that state or read from it, and `Task.refreshProjection` is the single read that produces everything the plot needs.

### 1. Section load — `PlotService.initSectionStudio()`

1. `Task.initLit` — builds the study from the section and its cable.
2. `Task.changeState` — applies the base climate (or the selected charge).
3. Obstacles **and floors** (`mapFloorToObstacle`) are registered in one call, through `ObstacleStateService.syncObstacles()` → `Task.addBulkObstacles`.
4. `PlotService.refreshProjection()`.

### 2. Projection — `PlotService.refreshProjection()`

One task (`Task.refreshProjection`) returns the whole render payload for the current support window and view:

| Result field | Stored in |
|---|---|
| `sectionOutput.current` / `.base` | `PlotService.litData` / `baseLitData` |
| `obstacles` (rendered 3-D points per uuid) | merged into `litData.obstacles` |
| `distances` | `ObstacleStateService.distances` |
| `distanceMeasuringPoints` | `PlotService.distanceMeasuringPoints` |
| captured Python warnings | `PlotService.diagnostics` — see [Diagnostics](#diagnostics-and-the-floor-intersection-warning) |

### 3. Saving an obstacle — `ObstacleFormService.calculateAndSave()`

1. Build the obstacle from the form and upsert it into the in-memory section.
2. `ObstacleStateService.addSingleObstacle()` → `Task.addSingleObstacle` (worker registry).
3. Persist the section (IndexedDB).
4. `PlotService.refreshProjection()` — new coordinates and distances.
5. Select the saved obstacle's last point (`ObstaclesService.setSelectedMeasure()`).

### 4. Saving a floor — `FloorFormService.calculateAndSave()`

Same shape, through `mapFloorToObstacle()`: register in the worker, persist the section, publish the section only once both succeeded, then `refreshProjection()`. `eraseFloor()` mirrors it with `Task.deleteObstacle`, and both roll the worker back to its previous state if a step fails.

### 5. Plot rendering — `SectionPlotComponent` + helpers

`SectionPlotComponent` merges every relevant signal into a `plotState` computed; changes are debounced (`STUDIO_PLOT_DEBOUNCE_DELAY`, 300 ms) before `refreshPlot()` calls `createPlot()`, which assembles:

- Base geometry traces (spans, supports, insulators, loads…).
- **Obstacle annotations** — `createObstaclesAnnotations()` in `obstacles.ts`: one marker and label per obstacle point, red for the selected obstacle, black otherwise, with its active point as a red diamond (`◆`). Floors are excluded here; they have their own traces.
- **Floor traces** — `createFloorTraces()`, see [Floors on the plot](#floors-on-the-plot).
- **Distance traces and annotations** — `createDistanceTraces()` / `createDistanceAnnotations()`.

`Plotly.react()` is used for all updates to preserve camera/zoom state.

---

## Distance visualization

Three visual patterns are used depending on `ObstacleStateService.distanceType`:

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

**Visible-window rule.** The measure selection survives a change of span window, and the engine expresses every registered obstacle in the *visible* window's frame — so drawing an off-window measure lands its lines on whichever span is on screen. `createDistanceVisuals()` resolves the selected uuid to its `supportUuid` (through `floors`, then `obstacles`) and draws nothing when that support falls outside `[startSupport, endSupport)`. Obstacle annotations, floor traces and measuring points apply the same rule. A span starts at its left support, so `endSupport` belongs to the *next* span and is excluded.

---

## Measure selection

`ObstaclesService` holds the selection shared by the quick-measures card, the forms and the plot:

- `selectedMeasureUuid` — the obstacle **or floor** being measured.
- `activePointIndex` — the point within it, in the *stored* point order.

`setSelectedMeasure(uuid, index)` sets both. Moving only the index is what causes cross-entity bugs: the plot's distance layer reads the uuid too, so a lone index change keeps drawing the previously selected entity at the new index.

Who drives it:

| Source | Effect |
|---|---|
| Quick-measures entity select | Selects the obstacle and loads it into the obstacle form; a floor goes through `FloorFormService.selectFloorPoint()` |
| Quick-measures point select | Sets `activePointIndex`; for a floor, `selectFloorPoint()` again |
| Obstacle form — point click/focus, add, delete, load | `ObstacleFormService.setActivePoint()`: claims the form obstacle's uuid **and** the index |
| Floor form — point click/focus, free positioning | `FloorFormService.setActivePoint()`: drives the form's own highlight, and only **follows** the quick-measures point when that floor is already the selected measure — it never claims the selection |
| Plot click on an obstacle annotation | Opens the Obstacles tab, loads the obstacle, selects the clicked point |
| Plot click on a floor point or its ribbon | Opens the Floor tab and calls `selectFloorPoint()` |

`FloorFormService.selectFloorPoint(uuid, index)` is the single entry point for "a floor point was picked outside the floor form": it selects the measure, sets `distanceType` to `'vertical'` (floors have no distance-type radios), switches the form to that floor's span and reference support when needed, and activates the point once the form has loaded it.

Because the floor form can read a profile from either end, `activeSavedPointIndex` mirrors the form index into the stored order — that is the index the plot, the worker distances and quick-measures all use.

---

(floors-on-the-plot)=
## Floors on the plot

`createFloorTraces()` renders, for each floor whose span is inside the visible window:

- A `lines+markers` trace of the floor polyline (orange), carrying `[floorUuid, pointIndex]` customdata per point so a click resolves to a point.
- In 3-D, a **ribbon** (`mesh3d`, 60 % opacity) giving the profile some depth. It is what the mouse actually hits in gl3d, covering far more screen area than the markers. Plotly indexes a `mesh3d` hit by *face*, so the strip is cut at the segment midpoints: each point owns the two triangles of the cell around it, and the nearest point wins wherever the mouse lands.
- The active point as its own one-point trace — a red `diamond`, like an obstacle's active point. It needs a separate trace because `marker.symbol` applies to a whole trace; its marker is hidden in the line trace so the two never stack, and in 3-D it is lifted slightly above the profile. A semi-transparent `mesh3d` still writes depth, so a marker lying on the line is hidden or tinted by the ribbon surrounding it — which is also why the ribbon itself is recessed just below the line, to keep markers hoverable.

### Floor results

`FloorFormService.results` does **not** use the worker's per-point distances: they only cover the floor's own points, while the narrowest clearance usually falls between them, where the cable sags — a floor holding just its two support points would report the clearance at the supports. `computeFloorClearance()` compares the two rendered polylines instead — the floor from `litData.obstacles`, the cable from `litData.coords.spans` — over the whole span, and returns the minimum vertical distance, both altitudes, and the position of that minimum. The engine's sign convention is kept: negative means the cable passes below the floor.

---

(diagnostics-and-the-floor-intersection-warning)=
## Diagnostics and the floor intersection warning

Python warnings captured during a task become `PythonDiagnostic` entries, and `StudioComponent` turns each one into a toast.

The engine measures a point by intersecting a plane through it with the cable curve. A floor's **end points sit on the supports**, where that plane finds no cable — the cable hangs from an attachment offset from the support axis — so the engine skips those points and raises `NoIntersectionPlaneWarning` for *every* saved floor, whatever its clearance. `PlotService.withoutFloorIntersectionWarnings()` therefore drops that warning when its text names a floor uuid. Obstacles keep it, where it does mean one of their points could not be measured.

What replaces it carries real information: `FloorFormService` watches each projection and warns, per floor, when `computeFloorClearance()` reports a negative minimum vertical distance — the cable actually passes below the floor. It fires on every projection refresh, so a charge change that sinks the cable into a floor saved long before is caught too.

Consequences to keep in mind:

- A floor's end points have **no** `Distance` entry, so quick-measures shows `-` for them. Selecting a floor there pre-selects the first point the engine could actually measure.
- Any code reading `distances` for a floor must tolerate missing point indexes.

---

## Known limitations and TODOs

- Floors are modelled as obstacles in the worker registry. That buys the distance calculation for free, but a floor uuid can turn up anywhere an obstacle uuid is expected: every consumer that must tell them apart does so by looking the uuid up in `section.floors` (`isFloorSelected`, `createDistanceVisuals`, `ObstacleFormService.results`, …).
- The engine cannot measure a point sitting exactly on a support (see above). Nudging the registered end points inwards would restore those distances, but the offset needed depends on the span's attachment geometry, so it is not a fixed epsilon.
