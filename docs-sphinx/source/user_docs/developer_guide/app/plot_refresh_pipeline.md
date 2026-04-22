# Plot Refresh Pipeline

This document describes the four refresh functions that keep the Plotly section
chart in sync with data changes, when they are triggered, and what Python work
each one performs.

---

## Overview

The rendering pipeline has two distinct layers:

- **Data layer** — `PlotService` and `ObstacleFormService` fetch or update geometry
  from the Python worker and store results in Angular signals (`litData`,
  `obstacleStateService.distances`, …).
- **Render layer** — `SectionPlotComponent` reacts to those signals and performs a
  client-side Plotly redraw. No Python calls happen here.

```
╔══════════════════════════════════════════════════════════════╗
║  Data layer  (PlotService / ObstacleFormService)             ║
║                                                              ║
║   refreshSection()   refreshProjection()   calculateAndSave()║
║        │                    │                    │           ║
║        └────────────────────┴────────────────────┘          ║
║                             │                               ║
║               sets litData / distances signals               ║
╚═════════════════════════════╪════════════════════════════════╝
                              │ signal change
╔═════════════════════════════╪════════════════════════════════╗
║  Render layer  (SectionPlotComponent)                        ║
║                             │                               ║
║             refreshPlot()  ◄┘  (debounced, no Python)        ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 1. `refreshSection(section)` — `PlotService`

### When it is called

Triggered once by `StudioComponent` whenever the active section changes (new
section loaded or section data replaced).

### What it does

Full cold start. Builds the entire Python engine from scratch
(`BalanceEngine` + `PlotEngine`), projects the geometry, registers all saved
obstacles, and calculates their distances.

### Python calls

| Order | Task | Description |
|-------|------|-------------|
| 1 | `getLit` | Build engine; return full section geometry (`GetSectionWithBaseOutput`) |
| 2 | `addObstacle` | Register all obstacles for the current span in `plt_line` |
| 3 | `calculateObstaclesDistances` | Compute clearance distances |

### Call graph

```
StudioComponent (effect on section input)
  └─► PlotService.refreshSection(section)
        ├─► Python: getLit
        │     └─► sets litData + baseLitData
        ├─► obstacleStateService.syncObstacles(obstacles, plotOptions)
        │     ├─► Python: addObstacle  (filtered to current span)
        │     └─► Python: calculateObstaclesDistances
        │           └─► sets obstacleStateService.distances
        └─► sets litData.obstacles
              └─► SectionPlotComponent reacts → refreshPlot()
```

---

## 2. `refreshProjection()` — `PlotService`

### When it is called

Called automatically by `plotOptionsChange()` whenever `startSupport`,
`endSupport`, or `view` changes — i.e. every time the span slider moves or the
2D/3D toggle is used.

### What it does

Re-projects the **existing** Python engine with new view parameters. Because
`plt_line` already holds the registered obstacles from the last `addObstacle`
call, `refresh_projection` on the Python side calls `get_coordinates()` **and**
`plt_line.obstacles_dict()`, returning obstacle coordinates embedded in
`current.obstacles`. No extra Python calls are needed.

### Python calls

| Order | Task | Description |
|-------|------|-------------|
| 1 | `refreshProjection` | Re-project geometry; obstacle coords included in return value |

### Call graph

```
StudioPage span slider / view toggle
  └─► PlotService.plotOptionsChange(values)
        └─► [if startSupport or endSupport changed]
              └─► PlotService.refreshProjection()
                    └─► Python: refreshProjection
                          ├─► get_coordinates()   — section geometry
                          └─► plt_line.obstacles_dict()  — obstacle coords (free, no extra call)
                    ├─► sets litData  (obstacles embedded in current)
                    └─► sets obstacleStateService.distances
                          └─► SectionPlotComponent reacts → refreshPlot()
```

### Key design note

The filtering of obstacles by span range happens **before** this call, at the
`addObstacle` step (in `refreshSection` or `calculateAndSave`). By the time
`refreshProjection` runs, `plt_line` only contains the obstacles that belong to
the currently selected span window.

---

## 3. `calculateAndSave()` — `ObstacleFormService`

### When it is called

Triggered by the user clicking **Calculate and save** in the obstacle form panel.

### What it does

Registers the obstacle(s) for the current span into `plt_line`, obtains their
rendered 3D positions, persists the domain object to IndexedDB, then recalculates
clearance distances.

### Python calls

| Order | Task | Description |
|-------|------|-------------|
| 1 | `addObstacle` | Register filtered obstacle list; return rendered positions |
| 2 | `calculateObstaclesDistances` | Recompute clearance distances |

### Call graph

```
Obstacle form — "Calculate and save" click
  └─► ObstacleFormService.calculateAndSave()
        ├─► upsertObstacleInSection()      — merge into in-memory section.obstacles
        ├─► obstacleStateService.addObstacle(allObstacles, plotOptions)
        │     └─► Python: addObstacle  (filtered to startSupport..endSupport)
        │           └─► returns ObstacleOutput  {obstacles: [{uuid, points}]}
        ├─► applyObstacleOutputToLitData() — sets litData.obstacles
        │     └─► SectionPlotComponent reacts → refreshPlot()
        ├─► saveSection()                  — IndexedDB persist
        ├─► obstacleStateService.calculateDistances(plotOptions)
        │     └─► Python: calculateObstaclesDistances
        │           └─► sets obstacleStateService.distances
        └─► obstaclesService.setSelectedObstacle()
              └─► SectionPlotComponent reacts → refreshPlot()
```

---

## 4. `refreshPlot()` — `SectionPlotComponent`

### When it is called

Reactive — fires automatically whenever the `plotState` computed signal changes.
A 50 ms debounce prevents redundant redraws when multiple signals change in the
same tick.

`plotState` aggregates: `litData`, `baseLitData`, `plotOptions`,
`selectedDisplayOptions`, `axesNorms`, form positions, obstacle selection,
distances, and distance type.

### What it does

Pure client-side Plotly redraw. Reads all data from signals and calls
`Plotly.react()` (diff update). **No Python calls.**

### Call graph

```
Any signal change (litData, plotOptions, distances, form values, …)
  └─► SectionPlotComponent.debouncedPlotState  (50 ms debounce)
        └─► refreshPlot()
              ├─► createPlotData()              — cable/support/insulator traces
              ├─► createShadowPlotData()         — base-state overlay (optional)
              ├─► createObstaclesAnnotations()   — obstacle dots from litData.obstacles
              ├─► createDistanceTraces()         — distance lines from distances signal
              └─► Plotly.react()                — efficient DOM diff-update
```

---

## Summary

| Function | Layer | Trigger | Python tasks | Rebuilds engine |
|----------|-------|---------|-------------|-----------------|
| `refreshSection` | `PlotService` | Section change | `getLit` + `addObstacle` + `calcDistances` | Yes |
| `refreshProjection` | `PlotService` | Span / view change | `refreshProjection` (×1) | No |
| `calculateAndSave` | `ObstacleFormService` | Save button | `addObstacle` + `calcDistances` | No |
| `refreshPlot` | `SectionPlotComponent` | Any signal change | None | No |
