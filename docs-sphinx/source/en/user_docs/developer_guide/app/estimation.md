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

The `Task` enum and its `TaskInputs`/`TaskOutputs` mappings are defined in `src/app/core/services/worker_python/tasks/types.ts`. `src/app/core/services/worker_python/tasks/handle-task.ts` maps `estimateRope`, `estimateTemperature`, `estimateLoad`, `estimateLoadRelative`, `estimateWind`, and `estimateMinimumDistanceWind` to the corresponding snake_case functions in `src/app/core/services/worker_python/tasks/python-scripts/api.py`. Each API wrapper converts the JavaScript inputs to Python values and calls the matching function in `stellar-engine/src/stellar_engine/core/estimation.py` with the current study.

## Task inputs

All fields use camelCase at the worker boundary. Every task has `spanIndex`, `obstaclePoint`, and optional `bounds` and `iceThickness` in common. `spanIndex` is the index **before manipulation**. `obstaclePoint` is `[x, y, z]` in metres. If supplied, `bounds` is `[lower, upper]` in the estimated variable's units; both values must be finite and `lower < upper`. When omitted, the mechaphlowers estimator's defaults are used. `iceThickness` is in centimetres at the TypeScript/Python API boundary and is converted to metres before calling mechaphlowers.

| Task | Estimated variable | Task-specific inputs |
|---|---|---|
| `estimateTemperature` | Cable temperature (°C) | Required `targetDistance` (m); optional fixed `windPressure` (Pa). |
| `estimateWind` | Wind pressure (Pa) | Required `targetDistance` (m); optional fixed `temperature` (°C). |
| `estimateMinimumDistanceWind` | Wind pressure (Pa) minimizing the distance | Required fixed `temperature` (°C); no target distance. |
| `estimateLoad` | Load mass (kg) | Required `targetDistance` (m) and `loadPositionDistance` (m from the span's left support); optional fixed `temperature` (°C) and `windPressure` (Pa). |
| `estimateLoadRelative` | Load mass (kg) | No obstacle. Required signed `targetDistance` (m, cable altitude change at the load position, usually negative) and `loadPositionDistance` (m from the span's left support); optional fixed `temperature` (°C) and `windPressure` (Pa). `extra.x_shift` is the cable abscissa shift (m) at the load point. |
| `estimateRope` | Rope length (m) | Required `supportIndex` (before manipulation) and `targetVerticalDistance` (m); optional `ropeLineicMass` (kg/m), fixed `temperature` (°C), and `windPressure` (Pa). |

For rope estimation, `targetVerticalDistance` is cable altitude minus obstacle altitude and may be negative. Its value must be finite, but it is not required to be positive. The `supportIndex` identifies where the rope is set; `spanIndex` still identifies the span containing the obstacle. Optional fixed conditions may be `null` or omitted.

Instead of raw coordinates, a task may designate an obstacle registered in the study with `obstacleUuid` and `pointIndex` (0-based, required then). The point is then resolved by `find_obstacle_point` (shared with conformity) from the engine's absolute section-frame coordinates, and `obstaclePoint` is ignored. The frontend must use this form: the obstacle points rendered in `litData.obstacles` are re-projected for the 2D view and are not in the engine frame. An unknown `obstacleUuid` raises `ObstacleNotFoundError`; a missing, negative or fractional `pointIndex` raises `EstimationInputError`, an out-of-range one `ConformityInputError` (not reachable from the UI).

The common validation rejects missing/non-finite required values, negative or fractional indices, and obstacle points that do not contain three finite coordinates. `targetDistance` and `loadPositionDistance` must be positive or zero; a supplied `ropeLineicMass` must be strictly positive. A zero `targetDistance` is passed to the engine, which never reaches it: temperature and load estimations raise `EstimationNotConvergedError`, wind estimation a `SolverError` once the insulator chain reverses. Bounds must contain exactly two finite values in increasing order.

## Span indexing and virtual supports

All six tasks receive `spanIndex` in the pre-manipulation indexing convention. `estimateTemperature`, `estimateWind`, and `estimateMinimumDistanceWind` convert it internally with `study.manipulation.span_index_after_virtual_support`, because mechaphlowers expects the post-manipulation span index for those climatic estimators. `estimateLoad`, `estimateLoadRelative` and `estimateRope` pass the original index to their mechaphlowers estimator. If a virtual support splits the requested span, each task rejects the estimation with `EstimateOnSplitSupportError`; estimation on either part of a split span is not supported.

For rope estimation, `supportIndex` is also supplied in the pre-manipulation convention. An out-of-range span or support index raises mechaphlowers' `InvalidManipulationIndex`.

## Result and solver behavior

Each successful root-finding task returns the same shape:

```json
{
  "value": 60.0,
  "residual": 0.001,
  "iterations": 8,
  "converged": true,
  "extra": {}
}
```

`value` uses the estimated variable's units, `residual` is the final objective residual, `iterations` is the solver iteration count, and `extra` holds additional named values computed by the engine (empty when none). Although `EstimationResult.converged` is a boolean, a returned result always has `converged: true`: `_solve` raises `EstimationNotConvergedError` instead of returning a non-converged result. A plain `ValueError` from mechaphlowers when obstacle distance cannot be computed at a search bound is converted to the same exception; typed engine exceptions are allowed through.

### Minimum distance wind

`estimateMinimumDistanceWind` has no target: it minimizes the 3D distance between the cable and the obstacle point over the wind pressure `bounds` (default `[-1000, 1000]` Pa), at the fixed `temperature`, and returns:

```json
{
  "value": 831.2,
  "distance": 7.19,
  "iterations": 11
}
```

`value` is the wind pressure (Pa), `distance` the minimum oblique distance (m) and `iterations` the number of distance evaluations. `estimate_minimum_distance_wind` uses the closest-point mode of the mechaphlowers `estimate_wind` (`target_distance=None`): its Brent minimizer evaluates the distance at both `bounds` and assumes a single minimum inside them (default `[-1000, 1000]` Pa). The search is wrapped in a `RobustEstimation` (see *Robust estimation* below), which first shrinks the bounds to the wind pressures the balance solver can solve around no wind (a strong wind reverses the insulator chains, `SuspectedChainReversal`, which would abort the search through the bound evaluation), then retries the search on bounds shrunk toward no wind if the chains still reverse during it. A minimum on a bound (possibly that solvable limit), or a NaN distance, raises `EstimationNotConvergedError`; a balance solver failure without wind, or a chain reversal persisting after the retries, is raised unchanged.

### Robust estimation

mechaphlowers searches evaluate the objective at both bounds and abort on the first balance solver failure, so a single unsolvable trial value fails the whole estimation. `RobustEstimation` (`stellar-engine/src/stellar_engine/core/estimation/robust.py`) makes a 1D search robust to these values. It is mechaphlowers-agnostic: the estimation supplies an `is_solvable(value)` predicate and a `search(bounds)` callable, so other estimations can reuse it later. `estimate_minimum_distance_wind` is currently its only user.

| Field | Default | Role |
|---|---|---|
| `variable` | | Name of the estimated variable, for the logs |
| `is_solvable` | | Tells whether the balance solver succeeds for a value |
| `tolerance` | | Precision of the solvable limits (bisection) |
| `step` | | Step of the outward scan looking for the first unsolvable value |
| `neutral` | `0` | Value expected to be solvable (e.g. no wind) |
| `retries` | `3` | Retries of the search after a `retried_errors` failure |
| `shrink` | `0.75` | Fraction of each bound (from the reference) kept per retry |
| `retried_errors` | `(SuspectedChainReversal,)` | Solver failures triggering a retry |

For the wind, `estimate_minimum_distance_wind` sets `tolerance=WIND_SOLVABLE_TOLERANCE` (1 Pa), `step=WIND_SOLVABLE_STEP` (50 Pa), `retries=WIND_REVERSAL_RETRIES` (3) and `shrink=WIND_REVERSAL_SHRINK` (0.75), and builds `is_solvable` with `is_state_solvable` at the fixed temperature, ice thickness and wind direction.

**The wind can fail inside the bounds.** The solvable wind pressures are not a single interval: a strong wind reverses the insulator chains, then a much stronger wind can solve again on a reversed-chain state. With the default bounds `[-1000, 1000]` Pa, a synthetic section could behave like this:

```text
  -1000      -950        -300     0      400        ~950       1000
    |  solves  |   fails   |    solves    |   fails   |  solves  |
    |  again   | (reversal)|  (reference) | (reversal)|  again   |
               <-------------- kept bounds ------------>
                           [-300, 400]
```

Solvable on `[-300, 400]`, failing on `(400, ~950)` and `(-950, -300)`, and solvable again beyond. This has two consequences, each handled by `RobustEstimation`:

1. **Islands that solve again.** A plain bisection between a bound and the reference could converge to a limit next to the "solves again" island (e.g. near 950 Pa) and keep a failing gap inside the bounds. `solvable_bounds(bounds)` therefore starts from `reference(bounds)` (`neutral` clamped into the bounds), scans each side outward by `step` up to the first unsolvable value, then refines that limit by bisection down to `tolerance`. Only the interval containing the reference is kept (`[-300, 400]` above). If the reference itself is unsolvable, the bounds are returned unchanged so that the solver error reaches the user.
2. **Gaps narrower than `step`.** The scan only probes every `step`, so a failing gap narrower than `step` between two scanned values can be missed, and a `SuspectedChainReversal` can still occur during the search inside the kept bounds. `run(search, bounds)` catches the `retried_errors`, moves both bounds toward the reference with `shrunk_bounds(bounds, reference)` (each bound keeps the `shrink` fraction of its distance to the reference) and retries, up to `retries` times; the error is then re-raised.

`is_state_solvable(study, **state)` is the mechaphlowers probe behind `is_solvable`: it calls `solve_change_state(**state)` on a `deepcopy` of the study's balance engine (observers dropped, so the downstream engines are not copied) and returns `False` on a `SolverError`. A fresh copy is used per probe because a failed solve poisons the engine, and the engine is solved directly, like the mechaphlowers estimation searches, rather than through `SectionStudy.solve_change_state`, whose warm start solves more cases than the search would.

## Error and warning mapping

The Python exception class name (or warning text) is matched against `PythonErrorCode` in `handle-task.ts`. The first matching enum value wins. Severity is selected in `src/app/core/services/worker_python/tasks/python-error-severity.ts`, while the localized text is selected in `src/app/core/services/worker_python/tasks/python-error-messages.ts` from `shared.python-errors.*`. Python-side validation messages are built by `_Errors.estimation_*` in `stellar-engine/src/stellar_engine/entities/errors.py`.

| Python code | Situation | `TaskError` | Severity | i18n key |
|---|---|---|---|---|
| `EstimationInputError` | An estimation input is missing or invalid. | `CALCULATION_ERROR` | Error | `shared.python-errors.estimation-input-error` |
| `EstimationNotConvergedError` | The target is unreachable in the bounds, or distance cannot be computed at a bound. | `SOLVER_DID_NOT_CONVERGE` | Error | `shared.python-errors.estimation-not-converged-error` |
| `EstimationTargetAboveBoundsError` | `EstimationNotConvergedError` subclass raised by `estimate_temperature` when the search stopped on the upper bound: the target needs a higher temperature. | `SOLVER_DID_NOT_CONVERGE` | Error | `shared.python-errors.estimation-target-above-bounds-error` |
| `EstimationTargetBelowBoundsError` | Same, on the lower bound: the target needs a lower temperature. | `SOLVER_DID_NOT_CONVERGE` | Error | `shared.python-errors.estimation-target-below-bounds-error` |
| `EstimateOnSplitSupportError` | A virtual support divides the requested span. | `CALCULATION_ERROR` | Error | `shared.python-errors.estimate-on-split-support-error` |
| `InvalidManipulationIndex` | A span or support index is outside the valid range. | `CALCULATION_ERROR` | Error | `shared.python-errors.invalid-manipulation-index` |
| `ObstacleNotFoundError` | `obstacleUuid` is not registered in the study. | `CALCULATION_ERROR` | Error | `shared.python-errors.obstacle-not-found-error` |
| `EstimationWarning` | An existing load on the estimated span is ignored by load estimation. Loads on other spans are retained. | No task failure | Warning | `shared.python-errors.estimation-warning` |

`handle-task.ts` derives `SOLVER_DID_NOT_CONVERGE` by checking whether the exception message contains the literal text `did not converge`; other exceptions use the generic `CALCULATION_ERROR`. Python diagnostics are matched separately and carry the localized message and severity. The load warning is emitted with the successful result, so consumers can still use that result.

### Adding an estimation error code

For a new Python error or warning, add the exception class name as a value in `PythonErrorCode`, add its severity in `python-error-severity.ts`, add the corresponding `shared.python-errors.*` mapping in `python-error-messages.ts`, and add matching English and French strings in `public/i18n/en.json` and `public/i18n/fr.json`. Ensure the exception or warning text contains the exact enum value. Matching is substring-based and the first match in enum declaration order wins, so avoid codes that overlap and order more specific values before broader ones. See [How to Add Error/Warning Codes](how_to_add_error_codes.md) for the full diagnostic pipeline.

## Studio tool: Estimations

The **Estimations** dialog (`src/app/features/studio/estimations/`) opens from the Studio **Tools** menu and the quick-access shortcuts (`ToolbarDialogService` tool `estimations`). It holds three tabs; **Conformity temperature** (US.EST.TCO) and **Wind pressure for min. distance** (US.EST.PRE-DIS) are implemented, the vertical effort tab is shown disabled until its user story. Both tabs extend `EstimationFormBase` (`presentation/estimation-form.base.ts`), which holds the obstacle and point choice, the calculation, the result/section matching, the input locking and the clipboard copy; each tab only provides its numeric controls, its task and its inputs mapping. Their layout is shared through the `_estimation-form.scss` mixins.

The **Conformity temperature** tab (`TemperatureEstimationComponent`) shows a hint to choose an obstacle while none is selected, and lists the section obstacles holding at least one point (filterable by name). The obstacle selected in the Studio (`ObstaclesService.selectedMeasureUuid`) is preselected when the tab opens; otherwise, or when the selection is a floor, none is selected. The **Point** select is read-only and set to the first point of the selected obstacle. The **Target vertical distance** is required, in ]0; 150] m with at most 2 decimals (`0.01` minimum: the engine accepts a zero distance but never reaches it and answers `EstimationNotConvergedError`). **Calculate** runs `estimateTemperature` with `spanIndex = obstacle.supportIndex`, `obstacleUuid`, `pointIndex` and `bounds = [-50, 250]` °C; the obstacle and distance inputs are locked until it ends, so that the result always matches them. The result is shown with 2 decimals and can be copied to the clipboard; it is cleared as soon as an input or the section changes. Failures show the localized Python error, or `studio.estimations.calculation-failed`. When the target lies beyond the search bounds, the error quotes the bound with its unit (`EstimationFormBase.boundsUnitKey`, `toBoundsErrorParams`), e.g. "The target cannot be reached: it needs more than 250 °C.".

The **Wind pressure for min. distance** tab (`WindPressureEstimationComponent`) shares the obstacle and point behavior. The **Temperature** is required, in [-50; 250] °C with at most 2 decimals. **Calculate** runs `estimateMinimumDistanceWind` with `spanIndex = obstacle.supportIndex`, `obstacleUuid`, `pointIndex`, `temperature` and `bounds = [-1000, 1000]` Pa. The results show the **Wind pressure** without decimal (copyable, without group separator) and the **Minimum oblique distance** with 2 decimals. Failures show the localized Python error, or `studio.estimations.wind-pressure-calculation-failed`.

> The engine estimates the temperature for a vertical distance (`distance_type="vertical"`, the mechaphlowers default) between the cable and the obstacle point, as the UI labels the input *Target vertical distance*.

## Known limitation: wind direction

Stellar configures wind direction as `clockwise`, but the mechaphlowers estimator currently always applies wind `anticlockwise`. This can affect wind estimation results, including the sign of the minimum distance wind pressure. When the mechaphlowers engine implementation is updated to resolve the mismatch, rebuild the local engine wheel and its bundled assets with:

```bash
npm run set-up-mechaphlowers:engine-only
```

## Tests

Run the focused Python test from the repository root:

```bash
cd stellar-engine && uv run pytest test/core/test_estimation.py -q -p no:logging
```

Run the focused TypeScript tests from the repository root:

```bash
npx vitest run src/app/core/services/worker_python/tasks/ src/app/features/studio/estimations/
```

The Python tests cover result shape, estimates, input validation, unreachable targets, index mapping, split virtual supports, the existing-load warning, preservation of the study state, and the minimum distance wind search (minimum on either side, at a bound, chain reversal before the minimum, NaN distances, refinement failure).
