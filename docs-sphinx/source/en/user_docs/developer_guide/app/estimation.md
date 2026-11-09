# Estimation Feature

The estimation feature solves an inverse problem against a section study: it finds a rope length, cable temperature, span load, or wind pressure that produces a requested distance to an obstacle. The Python functions validate the frontend payload, delegate the solve to `SectionStudy.estimation_engine`, and return a JSON-serializable result without changing the study state.

## Architecture and call flow

```text
Task.estimate* (TypeScript)
  → handle-task.ts task map and Pyodide call
  → tasks/python-scripts/api.py wrapper
  → stellar_engine.core.estimation
  → SectionStudy.estimation_engine (mechaphlowers)
```

The `Task` enum and its `TaskInputs`/`TaskOutputs` mappings are defined in `src/app/core/services/worker_python/tasks/types.ts`. `src/app/core/services/worker_python/tasks/handle-task.ts` maps `estimateRope`, `estimateTemperature`, `estimateLoad`, and `estimateWind` to the corresponding snake_case functions in `src/app/core/services/worker_python/tasks/python-scripts/api.py`. Each API wrapper converts the JavaScript inputs to Python values and calls the matching function in `stellar-engine/src/stellar_engine/core/estimation.py` with the current study.

## Task inputs

All fields use camelCase at the worker boundary. Every task has `spanIndex`, `obstaclePoint`, and optional `bounds` and `iceThickness` in common. `spanIndex` is the index **before manipulation**. `obstaclePoint` is `[x, y, z]` in metres. If supplied, `bounds` is `[lower, upper]` in the estimated variable's units; both values must be finite and `lower < upper`. When omitted, the mechaphlowers estimator's defaults are used. `iceThickness` is in centimetres at the TypeScript/Python API boundary and is converted to metres before calling mechaphlowers.

| Task | Estimated variable | Task-specific inputs |
|---|---|---|
| `estimateTemperature` | Cable temperature (°C) | Required `targetDistance` (m); optional fixed `windPressure` (Pa). |
| `estimateWind` | Wind pressure (Pa) | Required `targetDistance` (m); optional fixed `temperature` (°C). |
| `estimateLoad` | Load mass (kg) | Required `targetDistance` (m) and `loadPositionDistance` (m from the span's left support); optional fixed `temperature` (°C) and `windPressure` (Pa). |
| `estimateRope` | Rope length (m) | Required `supportIndex` (before manipulation) and `targetVerticalDistance` (m); optional `ropeLineicMass` (kg/m), fixed `temperature` (°C), and `windPressure` (Pa). |

For rope estimation, `targetVerticalDistance` is cable altitude minus obstacle altitude and may be negative. Its value must be finite, but it is not required to be positive. The `supportIndex` identifies where the rope is set; `spanIndex` still identifies the span containing the obstacle. Optional fixed conditions may be `null` or omitted.

The common validation rejects missing/non-finite required values, negative or fractional indices, and obstacle points that do not contain three finite coordinates. `targetDistance` and `loadPositionDistance` must be strictly positive; a supplied `ropeLineicMass` must also be strictly positive. Bounds must contain exactly two finite values in increasing order.

## Span indexing and virtual supports

All four tasks receive `spanIndex` in the pre-manipulation indexing convention. `estimateTemperature` and `estimateWind` convert it internally with `study.manipulation.span_index_after_virtual_support`, because mechaphlowers expects the post-manipulation span index for those two estimators. `estimateLoad` and `estimateRope` pass the original index to their mechaphlowers estimator. If a virtual support splits the requested span, each task rejects the estimation with `EstimateOnSplitSupportError`; estimation on either part of a split span is not supported.

For rope estimation, `supportIndex` is also supplied in the pre-manipulation convention. An out-of-range span or support index raises mechaphlowers' `InvalidManipulationIndex`.

## Result and solver behavior

Each successful task returns the same shape:

```json
{
  "value": 60.0,
  "residual": 0.001,
  "iterations": 8,
  "converged": true
}
```

`value` uses the estimated variable's units, `residual` is the final objective residual, and `iterations` is the solver iteration count. Although `EstimationResult.converged` is a boolean, a returned result always has `converged: true`: `_solve` raises `EstimationNotConvergedError` instead of returning a non-converged result. A plain `ValueError` from mechaphlowers when obstacle distance cannot be computed at a search bound is converted to the same exception; typed engine exceptions are allowed through.

## Error and warning mapping

The Python exception class name (or warning text) is matched against `PythonErrorCode` in `handle-task.ts`. The first matching enum value wins. Severity is selected in `src/app/core/services/worker_python/tasks/python-error-severity.ts`, while the localized text is selected in `src/app/core/services/worker_python/tasks/python-error-messages.ts` from `shared.python-errors.*`. Python-side validation messages are built by `_Errors.estimation_*` in `stellar-engine/src/stellar_engine/entities/errors.py`.

| Python code | Situation | `TaskError` | Severity | i18n key |
|---|---|---|---|---|
| `EstimationInputError` | An estimation input is missing or invalid. | `CALCULATION_ERROR` | Error | `shared.python-errors.estimation-input-error` |
| `EstimationNotConvergedError` | The target is unreachable in the bounds, or distance cannot be computed at a bound. | `SOLVER_DID_NOT_CONVERGE` | Error | `shared.python-errors.estimation-not-converged-error` |
| `EstimateOnSplitSupportError` | A virtual support divides the requested span. | `CALCULATION_ERROR` | Error | `shared.python-errors.estimate-on-split-support-error` |
| `InvalidManipulationIndex` | A span or support index is outside the valid range. | `CALCULATION_ERROR` | Error | `shared.python-errors.invalid-manipulation-index` |
| `EstimationWarning` | An existing load on the estimated span is ignored by load estimation. Loads on other spans are retained. | No task failure | Warning | `shared.python-errors.estimation-warning` |

`handle-task.ts` derives `SOLVER_DID_NOT_CONVERGE` by checking whether the exception message contains the literal text `did not converge`; other exceptions use the generic `CALCULATION_ERROR`. Python diagnostics are matched separately and carry the localized message and severity. The load warning is emitted with the successful result, so consumers can still use that result.

### Adding an estimation error code

For a new Python error or warning, add the exception class name as a value in `PythonErrorCode`, add its severity in `python-error-severity.ts`, add the corresponding `shared.python-errors.*` mapping in `python-error-messages.ts`, and add matching English and French strings in `public/i18n/en.json` and `public/i18n/fr.json`. Ensure the exception or warning text contains the exact enum value. Matching is substring-based and the first match in enum declaration order wins, so avoid codes that overlap and order more specific values before broader ones. See [How to Add Error/Warning Codes](how_to_add_error_codes.md) for the full diagnostic pipeline.

## Effort estimation (traction or weight)

The **Estimations** dialog of the Studio toolbar (`src/app/features/studio/estimations`) estimates the effort that moves the cable of a span vertically by a target distance. It relies on two tasks built on top of the estimation module above, in `stellar-engine/src/stellar_engine/tools/effort_estimation.py`. They reuse its input validation, span index mapping, `_solve` wrapper, `EstimationResult` output and error codes, and leave the study untouched (the loads are applied on a copy of the balance engine).

| Task | Python function | Inputs | Output |
|---|---|---|---|
| `estimateEffort` | `estimate_effort` | `spanIndex`, `loadPositionDistance` (m from the left support of the span, strictly positive), `temperature` (°C), `targetVerticalDisplacement` (m, positive upward) | `EstimationResult`; `value` is the load mass in kg: negative for a traction, positive for a weight. |
| `getLoadPoints` | `get_load_points` | `spanIndex`, `loadPositionDistance`, `temperature`, `loadMasses` (kg, a null mass gives the unloaded point) | `{ points: [x, y, z][] }` in meters, one load application point per mass. |

`estimateLoad` is not used here: it targets a distance to an obstacle, and the mechaphlowers distance computation fails when the obstacle plane is close to the load node, systematically for a traction (negative mass). `estimateEffort` targets the altitude of the load application point instead. Large masses make the balance solver diverge, so the search interval grows progressively from 50 kg, doubling up to 20,000 kg; a target not reached within this range, or a solver failure while growing it, raises `EstimationNotConvergedError`. An existing load on the span is replaced, as in `estimateLoad`.

The frontend converts the form before calling the tasks: a distance measured from the right support becomes `span length - distance`, and a downward displacement becomes a negative `targetVerticalDisplacement`. The displayed effort (daN) is the estimated mass (1 daN = 1 kg under the 10 m/s² convention). The displacement along the span axis is `|x(mass) - x(0)|`, computed from `getLoadPoints` with `loadMasses: [0, mass]`.

Targeted Python test:

```bash
cd stellar-engine && uv run pytest test/tools/test_effort_estimation.py -q -p no:logging
```

## Known limitation: wind direction

Stellar configures wind direction as `clockwise`, but the mechaphlowers estimator currently always applies wind `anticlockwise`. This can affect wind estimation results. When the mechaphlowers engine implementation is updated to resolve the mismatch, rebuild the local engine wheel and its bundled assets with:

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
npx vitest run src/app/core/services/worker_python/tasks/
```

The Python tests cover result shape, estimates, input validation, unreachable targets, index mapping, split virtual supports, the existing-load warning, and preservation of the study state.
