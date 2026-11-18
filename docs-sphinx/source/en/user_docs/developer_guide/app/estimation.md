# Estimation Feature

The estimation feature solves an inverse problem against a section study: it finds a rope length, cable temperature, span load, or wind pressure that produces a requested distance to an obstacle, or the wind pressure bringing the cable closest to an obstacle. The Python functions validate the frontend payload, delegate the solve to `SectionStudy.estimation_engine`, and return a JSON-serializable result without changing the study state.

## Architecture and call flow

```text
Task.estimate* (TypeScript)
  → handle-task.ts task map and Pyodide call
  → tasks/python-scripts/api.py wrapper
  → stellar_engine.core.estimation
  → SectionStudy.estimation_engine (mechaphlowers)
```

The `Task` enum and its `TaskInputs`/`TaskOutputs` mappings are defined in `src/app/core/services/worker_python/tasks/types.ts`. `src/app/core/services/worker_python/tasks/handle-task.ts` maps `estimateRope`, `estimateTemperature`, `estimateLoad`, `estimateWind`, `estimateMinimumDistanceWind`, and `estimateEffort` to the corresponding snake_case functions in `src/app/core/services/worker_python/tasks/python-scripts/api.py`. Each API wrapper converts the JavaScript inputs to Python values and calls the matching function in `stellar-engine/src/stellar_engine/core/estimation.py` (`stellar-engine/src/stellar_engine/tools/effort_estimation.py` for `estimateEffort`) with the current study.

## Task inputs

All fields use camelCase at the worker boundary. Every task except `estimateEffort` has `spanIndex`, `obstaclePoint`, and optional `bounds` and `iceThickness` in common. `spanIndex` is the index **before manipulation**. `obstaclePoint` is `[x, y, z]` in metres. If supplied, `bounds` is `[lower, upper]` in the estimated variable's units; both values must be finite and `lower < upper`. When omitted, the mechaphlowers estimator's defaults are used. `iceThickness` is in centimetres at the TypeScript/Python API boundary and is converted to metres before calling mechaphlowers.

| Task | Estimated variable | Task-specific inputs |
|---|---|---|
| `estimateTemperature` | Cable temperature (°C) | Required `targetDistance` (m); optional fixed `windPressure` (Pa). |
| `estimateWind` | Wind pressure (Pa) | Required `targetDistance` (m); optional fixed `temperature` (°C). |
| `estimateMinimumDistanceWind` | Wind pressure (Pa) minimizing the distance | Required fixed `temperature` (°C); no target distance. |
| `estimateLoad` | Load mass (kg) | Required `targetDistance` (m) and `loadPositionDistance` (m from the span's left support); optional fixed `temperature` (°C) and `windPressure` (Pa). |
| `estimateEffort` | Load mass (kg), also returned in daN | Required `loadPositionDistance` (m from the span's left support), fixed `temperature` (°C) and `targetVerticalDisplacement` (m, positive upward); no obstacle. |
| `estimateRope` | Rope length (m) | Required `supportIndex` (before manipulation) and `targetVerticalDistance` (m); optional `ropeLineicMass` (kg/m), fixed `temperature` (°C), and `windPressure` (Pa). |

For rope estimation, `targetVerticalDistance` is cable altitude minus obstacle altitude and may be negative. Its value must be finite, but it is not required to be positive. The `supportIndex` identifies where the rope is set; `spanIndex` still identifies the span containing the obstacle. Optional fixed conditions may be `null` or omitted.

Instead of raw coordinates, a task may designate an obstacle registered in the study with `obstacleUuid` and `pointIndex` (0-based, required then). The point is then resolved by `find_obstacle_point` (shared with conformity) from the engine's absolute section-frame coordinates, and `obstaclePoint` is ignored. The frontend must use this form: the obstacle points rendered in `litData.obstacles` are re-projected for the 2D view and are not in the engine frame. An unknown `obstacleUuid` raises `ObstacleNotFoundError`; a missing, negative or fractional `pointIndex` raises `EstimationInputError`, an out-of-range one `ConformityInputError` (not reachable from the UI).

The common validation rejects missing/non-finite required values, negative or fractional indices, and obstacle points that do not contain three finite coordinates. `targetDistance` and `loadPositionDistance` must be positive or zero; a supplied `ropeLineicMass` must be strictly positive. A zero `targetDistance` is passed to the engine, which never reaches it: temperature and load estimations raise `EstimationNotConvergedError`, wind estimation a `SolverError` once the insulator chain reverses. Bounds must contain exactly two finite values in increasing order.

## Span indexing and virtual supports

All six tasks receive `spanIndex` in the pre-manipulation indexing convention. `estimateTemperature`, `estimateWind`, `estimateMinimumDistanceWind`, and `estimateEffort` convert it internally with `study.manipulation.span_index_after_virtual_support`, because mechaphlowers expects the post-manipulation span index for those climatic estimators. `estimateLoad` and `estimateRope` pass the original index to their mechaphlowers estimator. If a virtual support splits the requested span, each task rejects the estimation with `EstimateOnSplitSupportError`; estimation on either part of a split span is not supported.

For rope estimation, `supportIndex` is also supplied in the pre-manipulation convention. An out-of-range span or support index raises mechaphlowers' `InvalidManipulationIndex`.

## Result and solver behavior

Each successful root-finding task returns the same shape:

```json
{
  "value": 60.0,
  "residual": 0.001,
  "iterations": 8,
  "converged": true
}
```

`value` uses the estimated variable's units, `residual` is the final objective residual, and `iterations` is the solver iteration count. Although `EstimationResult.converged` is a boolean, a returned result always has `converged: true`: `_solve` raises `EstimationNotConvergedError` instead of returning a non-converged result. A plain `ValueError` from mechaphlowers when obstacle distance cannot be computed at a search bound is converted to the same exception; typed engine exceptions are allowed through.

### Minimum distance wind

`estimateMinimumDistanceWind` has no target: it minimizes the 3D distance between the cable and the obstacle point over the wind pressure `bounds` (default `[-1000, 1000]` Pa), at the fixed `temperature`, and returns:

```json
{
  "value": 831.2,
  "distance": 7.19,
  "iterations": 11
}
```

`value` is the wind pressure (Pa), `distance` the minimum oblique distance (m) and `iterations` the number of distance evaluations. mechaphlowers only provides root-finding, so `estimate_minimum_distance_wind` minimizes the objective of its climatic estimators (`_build_distance_objective__climatic_case` with a zero target, i.e. the distance itself). The distance is assumed unimodal in the wind pressure: it is scanned every `MINIMUM_DISTANCE_WIND_STEP` (250 Pa) from 0 Pa (or the bound closest to it) in the decreasing direction until it increases, then the bracketed minimum is refined with a golden-section search (`MINIMUM_DISTANCE_WIND_TOLERANCE`, 0.5 Pa). Small steps keep each balance solve close to the previous one: a large jump of wind pressure may wrongly reverse the chains. A failed balance solve breaks every next solve of the engine copy, so each scan runs on its own copy. A minimum at a search bound is returned as is. When the balance solver fails at 0 Pa, or while the distance still decreases (typically `SuspectedChainReversal` before the cable gets closest), that error is raised unchanged; a NaN distance raises `EstimationNotConvergedError` instead. A solver failure during the refinement keeps the scanned minimum.

### Effort (traction or weight)

`estimateEffort` (`stellar-engine/src/stellar_engine/tools/effort_estimation.py`) estimates the load mass moving the cable of a span vertically by a target displacement. It reuses the validation, span index mapping, `_solve` wrapper and errors of the module above, and leaves the study untouched (the load is applied on a copy of the balance engine; an existing load on the span is replaced, as in `estimateLoad`). It returns:

```json
{
  "value": -123.4,
  "residual": 0.0,
  "iterations": 5,
  "converged": true,
  "effort": -121.05,
  "axisDisplacement": 0.126
}
```

`value` is the load mass (kg), negative for a traction (upward displacement) and positive for a weight (downward displacement); `effort` is the same load in daN (mechaphlowers `units`, i.e. 1 kg = 0.981 daN). `axisDisplacement` is the absolute displacement (m) of the load application point along the span axis, between the unloaded cable and the cable under the estimated load; the point is read in the frame of the span's left support (`get_loads_coords(project=True, frame_index=span_index)`).

`estimateLoad` is not used here: it targets a distance to an obstacle, and the mechaphlowers distance computation fails when the obstacle is close to the load node, systematically for a traction (negative mass). `estimateEffort` targets the altitude of the load application point instead. Large masses make the balance solver diverge, so the search interval grows progressively from 50 kg, doubling up to 20,000 kg; a target not reached within this range, or a solver failure while growing it, raises `EstimationNotConvergedError`. A zero target returns a zero effort. A load applied on a support (`loadPositionDistance` of 0 or of the span length) is ignored by the engine and cannot move the cable: a non-zero target then raises `EstimationNotConvergedError` too.

## Error and warning mapping

The Python exception class name (or warning text) is matched against `PythonErrorCode` in `handle-task.ts`. The first matching enum value wins. Severity is selected in `src/app/core/services/worker_python/tasks/python-error-severity.ts`, while the localized text is selected in `src/app/core/services/worker_python/tasks/python-error-messages.ts` from `shared.python-errors.*`. Python-side validation messages are built by `_Errors.estimation_*` in `stellar-engine/src/stellar_engine/entities/errors.py`.

| Python code | Situation | `TaskError` | Severity | i18n key |
|---|---|---|---|---|
| `EstimationInputError` | An estimation input is missing or invalid. | `CALCULATION_ERROR` | Error | `shared.python-errors.estimation-input-error` |
| `EstimationNotConvergedError` | The target is unreachable in the bounds, or distance cannot be computed at a bound. | `SOLVER_DID_NOT_CONVERGE` | Error | `shared.python-errors.estimation-not-converged-error` |
| `EstimateOnSplitSupportError` | A virtual support divides the requested span. | `CALCULATION_ERROR` | Error | `shared.python-errors.estimate-on-split-support-error` |
| `InvalidManipulationIndex` | A span or support index is outside the valid range. | `CALCULATION_ERROR` | Error | `shared.python-errors.invalid-manipulation-index` |
| `ObstacleNotFoundError` | `obstacleUuid` is not registered in the study. | `CALCULATION_ERROR` | Error | `shared.python-errors.obstacle-not-found-error` |
| `EstimationWarning` | An existing load on the estimated span is ignored by load estimation. Loads on other spans are retained. | No task failure | Warning | `shared.python-errors.estimation-warning` |

`handle-task.ts` derives `SOLVER_DID_NOT_CONVERGE` by checking whether the exception message contains the literal text `did not converge`; other exceptions use the generic `CALCULATION_ERROR`. Python diagnostics are matched separately and carry the localized message and severity. The load warning is emitted with the successful result, so consumers can still use that result.

### Adding an estimation error code

For a new Python error or warning, add the exception class name as a value in `PythonErrorCode`, add its severity in `python-error-severity.ts`, add the corresponding `shared.python-errors.*` mapping in `python-error-messages.ts`, and add matching English and French strings in `public/i18n/en.json` and `public/i18n/fr.json`. Ensure the exception or warning text contains the exact enum value. Matching is substring-based and the first match in enum declaration order wins, so avoid codes that overlap and order more specific values before broader ones. See [How to Add Error/Warning Codes](how_to_add_error_codes.md) for the full diagnostic pipeline.

## Studio tool: Estimations

The **Estimations** dialog (`src/app/features/studio/estimations/`) opens from the Studio **Tools** menu and the quick-access shortcuts (`ToolbarDialogService` tool `estimations`). It holds three tabs: **Conformity temperature** (US.EST.TCO), **Wind pressure for min. distance** (US.EST.PRE-DIS) and **Vertical cable displacement effort** (US.EST.PDS-TRA). Every tab extends `EstimationCalculationBase` (`presentation/estimation-calculation.base.ts`), which holds the calculation, the result/section matching, the input locking and the clipboard copy; each tab provides its form, its task and its inputs mapping. The two obstacle tabs extend `EstimationFormBase` (`presentation/estimation-form.base.ts`), which adds the obstacle and point choice and only requires the numeric controls. Their layout is shared through the `_estimation-form.scss` mixins.

The **Conformity temperature** tab (`TemperatureEstimationComponent`) shows a hint to choose an obstacle while none is selected, and lists the section obstacles holding at least one point (filterable by name). The obstacle selected in the Studio (`ObstaclesService.selectedMeasureUuid`) is preselected when the tab opens; otherwise, or when the selection is a floor, none is selected. The **Point** select is read-only and set to the first point of the selected obstacle. The **Target vertical distance** is required, in ]0; 150] m with at most 2 decimals (`0.01` minimum: the engine accepts a zero distance but never reaches it and answers `EstimationNotConvergedError`). **Calculate** runs `estimateTemperature` with `spanIndex = obstacle.supportIndex`, `obstacleUuid`, `pointIndex` and `bounds = [-50, 250]` °C; the obstacle and distance inputs are locked until it ends, so that the result always matches them. The result is shown with 2 decimals and can be copied to the clipboard; it is cleared as soon as an input or the section changes. Failures show the localized Python error, or `studio.estimations.calculation-failed`.

The **Wind pressure for min. distance** tab (`WindPressureEstimationComponent`) shares the obstacle and point behavior. The **Temperature** is required, in [-50; 250] °C with at most 2 decimals. **Calculate** runs `estimateMinimumDistanceWind` with `spanIndex = obstacle.supportIndex`, `obstacleUuid`, `pointIndex`, `temperature` and `bounds = [-3000, 3000]` Pa. The results show the **Wind pressure** without decimal (copyable, without group separator) and the **Minimum oblique distance** with 2 decimals. Failures show the localized Python error, or `studio.estimations.wind-pressure-calculation-failed`.

The **Vertical cable displacement effort** tab (`EffortEstimationComponent`) estimates the effort to apply at a point of a span, with no obstacle. The **Span** list (filterable) holds every span of the section, the current span being selected by default; the **Reference support** list is reduced to the two supports of the span (departure support by default). The **Distance to reference support** is required, in [0; span length] m with at most 2 decimals (0 by default), the **Temperature** is required, in [-50; 250] °C with at most 2 decimals (empty by default), and the **Target displ.** is an **Up** (default) / **Down** switch with a required whole number in [0; 150] m (0 by default). **Calculate** runs `estimateEffort` with `spanIndex`, `loadPositionDistance` (the distance, or the span length minus the distance from the right support), `temperature` and `targetVerticalDisplacement` (negative for **Down**). The results show the **Traction (-) / Weight (+)** effort in daN (copyable, without unit nor group separator) and the **Displ. along span axis (x)** in m, both with 2 decimals, and are cleared as soon as an input or the section changes. Failures show the localized Python error, or `studio.estimations.effort-calculation-failed`.

> The engine estimates the temperature for a 3D distance (`distance_3d`) between the cable and the obstacle point, while the UI labels the input *Target vertical distance* as specified by the user story.

## Known limitation: wind direction

Stellar configures wind direction as `clockwise`, but the mechaphlowers estimator currently always applies wind `anticlockwise`. This can affect wind estimation results, including the sign of the minimum distance wind pressure. When the mechaphlowers engine implementation is updated to resolve the mismatch, rebuild the local engine wheel and its bundled assets with:

```bash
npm run set-up-mechaphlowers:engine-only
```

## Tests

Run the focused Python test from the repository root:

```bash
cd stellar-engine && uv run pytest test/core/test_estimation.py test/tools/test_effort_estimation.py -q -p no:logging
```

Run the focused TypeScript tests from the repository root:

```bash
npx vitest run src/app/core/services/worker_python/tasks/ src/app/features/studio/estimations/
```

The Python tests cover result shape, estimates, input validation, unreachable targets, index mapping, split virtual supports, the existing-load warning, preservation of the study state, and the minimum distance wind search (minimum on either side, at a bound, chain reversal before the minimum, NaN distances, refinement failure). `test/tools/test_effort_estimation.py` covers the effort estimation (sign, daN conversion, displacement along the span axis, zero target, load on a support, unreachable target, invalid inputs, split span, study left untouched).
