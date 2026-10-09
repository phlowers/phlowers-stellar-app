# Conformity — engine module and application layer

The **conformity** check tells whether an obstacle (tree, building, road, ground…) stays far
enough from the cable of a span, under the climatic conditions fixed by regulatory rules. The
application collects the inputs and the catalog data, the Python engine simulates the cable in
each climatic condition and measures its distance to the obstacle, and the application displays
what the engine returns, as a table and a cross-section figure.

This page covers both sides:

- [The Python module](#conformity-python-module): inputs, overwrite rules, scenarios, computation, output.
- [The TypeScript layer](#conformity-typescript-layer): how the output drives
  the table, the figure and the form.

The catalog file that configures the check is described in {doc}`configure_conformity`; the user
point of view is in the {doc}`user guide <../user_guide/conformity>`.

---

## Key files at a glance

Paths are relative to `src/app/`, except `stellar-engine/`, relative to the repository root.

| File | Purpose |
|---|---|
| `stellar-engine/src/stellar_engine/core/conformity/simulation.py` | `get_conformity()`: the entry point, orchestrates the whole computation |
| `stellar-engine/src/stellar_engine/core/conformity/request.py` | `ConformityRequest`: parsing and validation of every input |
| `stellar-engine/src/stellar_engine/core/conformity/scenarios.py` | Climatic points, **overwrite rules**, and the scenario builder |
| `stellar-engine/src/stellar_engine/core/conformity/strategies.py` | Per graph type: radius, compliance values, verdict, zone geometry |
| `stellar-engine/src/stellar_engine/core/conformity/runner.py` | `ScenarioRunner`: solves the scenarios on a study copy and projects the cable |
| `stellar-engine/src/stellar_engine/core/conformity/compute.py` | `ConformityTableResult`, built from the scenario outcomes |
| `stellar-engine/src/stellar_engine/core/conformity/writer.py` | Serialization of the result |
| `stellar-engine/src/stellar_engine/entities/conformity.py` | Input classes with validation, graph type and scenario point enums, tension mapper |
| `stellar-engine/src/stellar_engine/entities/errors.py` | `ConformityInputError`, `ObstacleNotFoundError`, `SupportOutOfRangeError` |
| `stellar-engine/test/core/conformity/` | Tests of the module (`conftest.py` holds the input factories) |
| `core/services/worker_python/tasks/python-scripts/api.py` | `get_conformity()` task entry, converts the JS inputs |
| `core/services/worker_python/tasks/types.ts` | `ConformityTaskInput` and `ConformityTaskOutput` |
| `features/studio/obstacles/presentation/components/conformity/conformity.component.ts` | The modal: form, input building, results |
| `features/studio/obstacles/presentation/components/conformity/conformity.component.html` | Form, results table, figure container |
| `features/studio/obstacles/presentation/components/conformity/conformity.constantes.ts` | Table rows, form bounds |
| `features/studio/obstacles/presentation/components/conformity/conformity.model.ts` | `ConformityRuleResult`, `ResultRow`, `ConformityOption` |
| `features/studio/obstacles/presentation/components/conformity/conformity-plot.model.ts` | `ConformityPlotResponse`: the figure data contract |
| `features/studio/obstacles/presentation/components/conformity/helpers/createConformityPlot.ts` | Plotly rendering of the figure |
| `features/studio/obstacles/presentation/components/obstaclesForm/obstaclesForm.component.ts` | Eligibility checks and modal hosting |
| `shared/domain/models/obstacle.model.ts` | `ConformityFormData`, the inputs saved with the obstacle |

---

## Overview

```mermaid
sequenceDiagram
    participant U as User
    participant C as ConformityComponent
    participant DB as Dexie (catalog)
    participant W as WorkerPythonService
    participant E as get_conformity (Python)

    U->>C: Calculate
    C->>DB: distances + rule definitions of the selected rules
    C->>C: effectiveWindPressure (wind zone, red zone)
    C->>W: runTask(getConformity, inputs)
    W->>E: python_inputs (js_to_python)
    loop each rule, each scenario
        E->>E: solve_change_state, cable/plane distance, projection
    end
    E-->>W: obstacle, conformity, results
    W-->>C: result or error
    C->>C: results table + figure
```

The engine knows nothing about the catalog: it receives, already filtered and resolved, the
rules, the distances and the form values. The application selects and resolves; the engine
simulates and measures.

---

(conformity-python-module)=
## The Python module

### Layout

| Module | Contents |
|---|---|
| `entities/conformity.py` | Inputs: `RuleDistanceInput`, `ConformityParametersInput`, `ElectricTensionMapper`, `TensionRules`. Enums: `ConformityPlot` (graph types), `ScenarioPoint`, and `LATERAL_SIDE_POINTS`. |
| `core/conformity/request.py` | `ConformityRequest.from_dict()`: parses and validates every input. |
| `core/conformity/scenarios.py` | `TargetState`, `Scenario`, `ClimaticPoint`, `RuleClimaticCondition` (all frozen) and `ScenarioBuilder`, which never mutates its inputs. |
| `core/conformity/strategies.py` | `PlotStrategy` and its three implementations (`CableTrackStrategy`, `VegetationStrategy`, `OverhangStrategy`), `get_strategy()`. |
| `core/conformity/runner.py` | `find_obstacle_point()`, `ScenarioOutcome`, `ScenarioRunner`. |
| `core/conformity/plot_data.py` | `Point2D`, `ZoneCorner`, `ZonePlot`, `ZoneConformity`, `ObstacleOutput`. |
| `core/conformity/compute.py` | `ConformityTableResult` (built by `from_outcomes()`), `ConformityResult`. |
| `core/conformity/writer.py` | `ConformityWriter`, `TableResultWriter`. |
| `core/conformity/simulation.py` | `get_conformity()`: orchestration only. |

The `get_conformity` task of `api.py` converts the JS object with `js_to_python()`, calls
`conformity_simulation.get_conformity(python_inputs, study)` on the global engine study, and
returns its dictionary.

(conformity-input-contract)=
### Input contract

`get_conformity(python_inputs, study)` reads six keys:

```python
{
    "obstacle": {                       # the Obstacle domain object
        "uuid": "…", "supportIndex": 0, "name": "…", "type": "vegetation",
        "altitudeType": "absolute", "lateralDistanceType": "SPAN_AXIS",
        "referenceSupport": "LEFT", "positions": [{"x": 10, "y": 5, "z": 65}],
    },
    "pointIndex": 0,                    # 0-based index in obstacle.positions
    "electricTension": "400 KV",
    "form": {
        "windZone": "200", "windPressure": 200, "windMinus": False,
        "redZonePresence": False, "repartitionTemperature": 70,
        "lateralDistanceTemperature": 68, "selectedConformityRules": ["RULE_1"],
        "conformityPlot": "vegetation", "intermediatePoints": [],
    },
    "rulesClimaticConditions": [
        {
            "ruleType": "RULE_1", "ruleName": "RULE_1",
            "lateralPoint":  {"temperature": 17,   "pressure": "WindZoneInput", "red_zone": False},
            "overhangPoint": {"temperature": None, "pressure": 0,               "red_zone": False},
        }
    ],
    "rulesDistances": [
        {
            "ruleType": "RULE_1",
            "lateral":  {"63": 0.6, "90": 0.7, "150": 0.8, "225": 0.9, "400": 1.0},
            "overhang": {"63": 1.1, "90": 1.2, "150": 1.3, "225": 1.4, "400": 1.5},
        }
    ],
}
```

| Key | Used for | Validation |
|---|---|---|
| `obstacle.uuid` | Finds the obstacle in the study. | `ConformityInputError` when missing or not a string; `ObstacleNotFoundError` when the study does not hold it. |
| `obstacle.name` | Names the obstacle in the output (`"<name> point <pointIndex + 1>"`). Falls back to the `uuid` when missing. | — |
| `pointIndex` | 0-based index, in the positions of the obstacle, of the point the conformity is computed for. Optional, `0` by default. | `ConformityInputError` when it is not a non-negative integer or is outside the positions (`out of range`). |
| `obstacle.supportIndex` | Selects the span: the plane frame uses supports `supportIndex` and `supportIndex + 1`, and so does the cable curve. | `ConformityInputError` when it is not a non-negative integer; `SupportOutOfRangeError` when there is no span at this index. |
| `electricTension` | Label such as `"400 KV"`, mapped by `ElectricTensionMapper` to the code `"400"` (`63`, `90`, `150`, `225`, `400`). | `ConformityInputError` when missing, not a string, or unknown. |
| `form` | `ConformityParametersInput.from_dict()`. See below. | `ConformityInputError` on a missing or wrongly typed field. |
| `rulesClimaticConditions` | One `RuleClimaticCondition` per rule: `ruleType`, `ruleName`, `lateralPoint`, `overhangPoint` (each with `temperature`, `pressure`, `red_zone`). | `ConformityInputError` when empty, on a duplicate `ruleType`, a missing field, or a wrongly typed `temperature` (number or `null`), `pressure` (number or `"WindZoneInput"`) or `red_zone` (boolean). |
| `rulesDistances` | `RuleDistanceInput`: `ruleType`, `lateral`, `overhang` (voltage code → distance). A `null` distance becomes `{}` with a warning. | `ConformityInputError` when empty, on a duplicate `ruleType`, a missing field, a non-numeric distance, or a distance map without the voltage of `electricTension`. |

Form fields:

| Field | Type | Role |
|---|---|---|
| `windPressure` | number | Pressure (Pa) given to every `"WindZoneInput"` point. Resolved by the application. |
| `windMinus` | boolean | Negates the lateral pressure. |
| `repartitionTemperature` | number | Temperature of the overhang points with no temperature. |
| `lateralDistanceTemperature` | number | Temperature of the lateral points with no temperature. |
| `conformityPlot` | `"vegetation"`, `"cable_track"`, `"overhang"` | Sets the intermediate scenarios, the radius and the zone geometry. |
| `intermediatePoints` | number[] | Fractions locating the intermediate states, `cable_track` only. Each is a number between 0 and 1. Optional, `[]` by default. |
| `windZone`, `redZonePresence` | string, boolean | Required and type-checked, **not used by the computation**. See [Red zone](#conformity-red-zone). |
| `selectedConformityRules` | string[] | Required and type-checked, **not used to filter**: the engine computes the rules it receives. |

An empty `rulesDistances`, or empty `rulesClimaticConditions`, raises a `ConformityInputError`.
The application cannot reach this case: the modal does not open for an obstacle type without
distances.

(conformity-overwrite-rules)=
### Overwrite rules

The catalog fixes part of the climatic condition of each rule, and the user supplies the rest.
These rules decide which value wins. They are applied by `ClimaticPoint`,
`RuleClimaticCondition.build_rules_climatic_conditions()` and `ScenarioBuilder`, and each one is
covered by a test of `test_conformity_scenarios.py`. The builder never mutates the rules, so
building the scenarios twice gives the same list.

| # | Input | Rule |
|---|---|---|
| 1 | `pressure` is `"WindZoneInput"` | Replaced by `form.windPressure`. |
| 2 | `pressure` is a number | Kept as is: **never overwritten**. |
| 3 | `overhangPoint.temperature` is `null` | Replaced by `form.repartitionTemperature`. |
| 4 | `overhangPoint.temperature` is a number | Kept. |
| 5 | `lateralPoint.temperature` is `null` | Replaced by `form.lateralDistanceTemperature`, for the `lateral` and the `lateral_inverse` scenarios. |
| 6 | `lateralPoint.temperature` is a number | Kept, for both lateral scenarios. |
| 7 | `form.windMinus` is `true` | The lateral pressure is **negated**, after rule 1. The overhang pressure is never negated. |
| 8 | Lateral scenario built | A `lateral_inverse` scenario is added with the **opposite** lateral pressure, same temperature, same distance. |
| 9 | `lateral` distance is `null` | No lateral and no `lateral_inverse` scenario. |
| 10 | `overhang` distance is `null` | No `overhang` scenario. |
| 11 | `form.conformityPlot` is `cable_track` and the `lateral` distance is set | Intermediate scenarios are added (see below). Otherwise `intermediatePoints` is ignored. |
| 12 | Security distance | `rule.lateral[code]` or `rule.overhang[code]`, with `code` from `electricTension`. |
| 13 | Rule with no distance row | Skipped with a warning: no scenario. |

`windPressure` is resolved **per call**: a `"WindZoneInput"` rule is built from the pressure given
at that moment, nothing is kept between two calls (`test_get_conformity_does_not_leak_wind_pressure`).

Worked example, `cable_track`, lateral pressure 30 Pa, overhang pressure 0, fractions
`[0.33, 0.66]`. For a fraction $f$, the two intermediate pressures are interpolated from the
overhang pressure towards the lateral pressure and its opposite:

$$p = p_{overhang}\,(1-f) \pm p_{lateral}\,f$$

| Scenario | Wind pressure (Pa) |
|---|---|
| `lateral_inverse` | -30 |
| `intermediate` (f = 0.66, towards the opposite) | -19.8 |
| `intermediate` (f = 0.33, towards the opposite) | -9.9 |
| `overhang` | 0 |
| `intermediate` (f = 0.33) | 9.9 |
| `intermediate` (f = 0.66) | 19.8 |
| `lateral` | 30 |

With `windMinus`, the same seven pressures are produced and the `lateral` and `lateral_inverse`
signs are swapped (`test_cable_track_intermediate_wind_pressures`). The temperature of an
intermediate scenario is the one of the lateral point, and its security distance is the lateral
one.

#### Overwrites made by the application

Before the engine is called, the application also decides some values:

| Value | Rule |
|---|---|
| `form.windPressure` | The `redZone` pressure of the selected wind zone when **Red zone presence** is ticked, the `normal` one otherwise. `null` when no wind zone is selected, which the engine rejects. |
| `form.intermediatePoints` | `intermediatePointPositions` of the catalog, whatever the graph type. |
| `form.conformityPlot` | The `conformity` of the obstacle type in the catalog. |
| `rulesDistances`, `rulesClimaticConditions` | Only the **selected** rules, taken from the catalog as is. |
| Initial form values | Saved data first, then the catalog defaults, see [Form population](#conformity-form-population). |

(conformity-red-zone)=
### Red zone

The red zone is **implemented in the TypeScript layer**, not in the engine, and it reaches the
engine as a wind pressure:

- the catalog gives each wind zone a `normal` and a `redZone` pressure;
- `ConformityComponent.effectiveWindPressure` picks one according to the
  **Red zone presence** checkbox, which is only shown when the obstacle type has `redZone: true`;
- the picked pressure is sent as `form.windPressure` and resolves the `"WindZoneInput"` pressure
  of every rule.

The engine therefore needs no red zone logic. It validates `form.redZonePresence` (boolean) and
carries `red_zone` through `ClimaticPoint`, but neither changes a scenario. The `redZone` flags
of the climatic points of a rule are not read by any code: the red zone pressure applies to all
the selected rules.

### Scenarios

`ScenarioBuilder.build_all()` builds, for each rule, the list of `Scenario` objects the simulation
runs. A scenario holds the rule, the `conformity_point`, the security distance and the
`TargetState` (temperature in °C, wind pressure in Pa).

| `conformity_point` | Built when | Distance used |
|---|---|---|
| `lateral` | lateral distance is set | lateral |
| `lateral_inverse` | lateral distance is set | lateral |
| `overhang` | overhang distance is set | overhang |
| `intermediate` | `cable_track` and lateral distance set, two per fraction of `intermediatePoints` | lateral |

Scenarios per rule: `2 + 1` for a rule with both distances, `2` lateral only, `1` overhang only,
plus `2 × len(intermediatePoints)` for `cable_track`. With `[0.33, 0.66]` a `cable_track` rule
has 7 scenarios and a `vegetation` rule 3 (`test_both_lateral_and_overhang_produces_three_scenarios`,
`test_cable_track_with_intermediate_points_produces_intermediate_scenarios`).

### Computation

`get_conformity()` runs these steps:

1. **Parse and validate** every input up front: `ConformityRequest.from_dict()` raises a
   `ConformityInputError` before any computation. The rule distances give the `TensionRules` per
   rule (distances at the voltage of the study).
2. **Pick the strategy** of the graph type (`get_strategy()`): radius, compliance and zone logic
   are not branched on the graph type anywhere else.
3. **Find the obstacle point** selected by `pointIndex`, then create the `ScenarioRunner`. It
   works on a **deep copy of the study**, so the study of the caller is left unchanged. It
   defines the plane: the span frame uses the ground supports `supportIndex` and
   `supportIndex + 1`, and the plane is **vertical and perpendicular to the span axis, through
   the obstacle point** (`u_plane` is horizontal in it, `v_plane` is vertical). The origin of the
   plane is the start of the span axis, at altitude 0.
4. **Build the scenarios** with `ScenarioBuilder`.
5. **Run every scenario** with `ScenarioRunner.run()`:
   - `solve_change_state(wind_pressure, new_temperature)` moves the cable to the scenario state,
     with **clockwise wind** (the convention of the rest of the application) and **no ice**;
   - the cable curve of the span is given to the distance engine, which intersects it with the
     plane and finds the cable point closest to the obstacle point;
   - the cable point is projected in the plane. A climatic state (wind pressure, temperature)
     is solved **once**, even when several rules or scenarios share it.
6. **Build the results of each rule**, in the order of `rulesDistances`: the points (with their
   radius), the zone (`strategy.zone()`), and the table (`ConformityTableResult.from_outcomes()`,
   which takes the closest point of each side and applies the compliance rules of the strategy).
   A rule without climatic condition gets no point and a table of `null` values.
7. **Serialize** with `ConformityWriter`.

The study given to `get_conformity()` is never modified.

### Output

```python
{
    "obstacle": {"name": "<obstacle name> point 1", "points": [{"x": 20.0, "y": 30.0}]},
    "conformity": {                       # one entry per rule, in the order of rulesDistances
        "RULE_1": {
            "zonePlot": {
                "zonePoints": [{"LowerLeft": {"x": 9.0, "y": 47.2}}, {"LowerRight": {"x": 12.2, "y": 47.2}},
                               {"UpperRight": {"x": 12.2, "y": 51.1}}, {"UpperLeft": {"x": 9.0, "y": 51.1}}],
                "zoneBorder": [{"x": 9.0, "y": 51.1}, {"x": 9.0, "y": 47.2},
                               {"x": 12.2, "y": 47.2}, {"x": 12.2, "y": 51.1}],
            },
            "points": [{"x": 11.2, "y": 49.6, "radius": 1.0}, {"x": 10.0, "y": 48.7, "radius": 1.0}],
        }
    },
    "results": {"RULE_1": {"overhangCableAltitude": 49.6, "...": "..."}},
}
```

The coordinates are those of the plane: `x` is the horizontal coordinate in the plane (the
distance to the line axis of the figure) and `y` is the altitude.

#### `conformity[rule]`

- `points`: the cable point of **each scenario**, in the order the scenarios ran. `radius` is the
  security distance of the scenario for `cable_track`, and `1.0` for the other graph types.
- `zonePlot`: the zone of the rule, see below. The corners of a `vegetation` or `overhang` zone
  are given in the order `LowerLeft`, `LowerRight`, `UpperRight`, `UpperLeft`.

#### Zone geometry (`PlotStrategy.zone()`)

With $d_{lat}$ and $d_{over}$ the lateral and overhang distances of the rule (0 when `null`):

| Graph type | Zone | `zoneBorder` |
|---|---|---|
| `vegetation` | Box around the points, extended by $d_{lat}$ left and right and $d_{over}$ above and below. | Left side, bottom, right side: `UpperLeft`, `LowerLeft`, `LowerRight`, `UpperRight` (a trench). |
| `overhang` | A flat line: $y$ is the lowest point minus $d_{over}$. Width: the points extended by $d_{lat}$. | The four corners, all at the same `y`. |
| `cable_track` | None: `zonePoints` is empty (the figure never draws it). | `[]` |

When the zone has no width (all points have the same `x` and no lateral distance), it is given a
width of 10 m centered on the points (`test_zero_width_zone_gets_minimum_width_centered_on_point`).
A rule with no point gets no zone: its `zonePlot` stays empty.

#### `results[rule]`

Built by `ConformityTableResult` and `TableResultWriter`. Every key is always present; a value
the scenarios did not produce is `null`.

| Key | Value |
|---|---|
| `overhangCableAltitude` | Altitude (`y` in the plane) of the cable point in the `overhang` scenario. |
| `lateralCableAltitude` | Altitude (`y` in the plane) of the cable point in the `lateral` scenario. |
| `overhangCableLineAxisDistance` | Distance to the line axis (`x` in the plane, measured from the axis of the span) of the cable point in the `overhang` scenario. |
| `lateralCableLineAxisDistance` | Distance to the line axis (`x` in the plane, measured from the axis of the span) of the cable point in the `lateral` scenario. |
| `overhangDistanceToComply`, `lateralDistanceToComply` | Security distance of the rule at the voltage. |
| `overhangComplianceAltitude` | Gap between the obstacle and the `overhang` point minus `overhangDistanceToComply`, negative when too close. For `vegetation` and `overhang` the gap is **signed**, so it is also negative when the obstacle is **above the cable**. Filled for `cable_track`, `vegetation` and `overhang`. See [Compliance values](#conformity-compliance-values). |
| `lateralComplianceLineAxisDistance` | Distance from the obstacle to the closest lateral side point minus `lateralDistanceToComply`, negative when too close. Filled for `cable_track` and `vegetation`. See [Compliance values](#conformity-compliance-values). |
| `overhangTemperature`, `lateralTemperature` | Temperature (°C) of the scenario producing the closest overhang / lateral side point. |
| `overhangWindPressure`, `lateralWindPressure` | Wind pressure (Pa) of the scenario producing the closest overhang / lateral side point. |
| `overhangMinimalDistance`, `lateralMinimalDistance` | Euclidean distance, in the distance plane, from the obstacle to the closest overhang / lateral side point. |
| `conformityCompliance` | `true` / `false`, or `null` when neither compliance value above is filled. |

:::{note}
The **lateral side** groups the `lateral`, `lateral_inverse` and `intermediate` scenarios
(`LATERAL_SIDE_POINTS`). The temperature, wind pressure and minimal distance of each side come
from the point of that side closest to the obstacle (`ConformityTableResult.from_outcomes`),
so `lateralWindPressure` is negative when the `lateral_inverse` point is the closest.
:::

(conformity-compliance-values)=
#### Compliance values

The compliance values are computed per graph type from the obstacle point and the projected cable
points, all in the plane (the `PlotStrategy` of the graph type, applied by
`ConformityTableResult.from_outcomes()`). The *lateral side points* are the points of
the `lateral`, `lateral_inverse` and `intermediate` scenarios.

| Graph type | `overhangComplianceAltitude` | `lateralComplianceLineAxisDistance` |
|---|---|---|
| `cable_track` | Euclidean distance obstacle to overhang point, minus distance to comply. | Euclidean distance obstacle to the closest lateral side point, minus distance to comply. |
| `vegetation` | $y_{overhang} - y_{obstacle}$ minus distance to comply (signed: negative when the obstacle is above the cable). | $\min \lvert x_{obstacle} - x_{side} \rvert$ over the lateral side points, minus distance to comply. |
| `overhang` | Same as `vegetation`. | `null`. |

A value is `null` when the point or the distance it needs is missing (for example a `null`
lateral distance).

#### Compliance

`conformityCompliance` is derived from these two values, not from per-scenario verdicts
(`PlotStrategy.is_compliant()`):

| Graph type | `conformityCompliance` is `false` when |
|---|---|
| `cable_track`, `overhang` | A filled value is negative. A value of exactly 0 complies. |
| `vegetation` | The obstacle is **inside the U** (see below). |

The verdict is `null` when no value is filled.

For `vegetation`, the obstacle is inside the U when it is too close vertically
(`overhangComplianceAltitude < 0`) **and** either too close laterally
(`lateralComplianceLineAxisDistance < 0`, or no lateral value) or horizontally between the
lateral side points. Without overhang value, only the lateral value is judged. The obstacle can
therefore be too close on one axis and still comply, as long as it is not inside the U
(`test_vegetation_u_shape_compliance_is_judged_per_rule`). The figure zone is a visual aid; the
verdict is this test.

### Errors

| Case | Result |
|---|---|
| Missing, non-string or unknown `electricTension` | `ConformityInputError` |
| Missing or invalid `form`, `rulesDistances` or `rulesClimaticConditions` field, empty or duplicated rules, non-numeric distance, distance map without the voltage | `ConformityInputError` |
| Missing `obstacle.uuid`, invalid `supportIndex` or `pointIndex` | `ConformityInputError` |
| `pointIndex` outside the positions of the obstacle | `ConformityInputError` (`out of range`) |
| `conformityPlot` not in the three graph types | `ConformityInputError` |
| `supportIndex` with no span in the study | `SupportOutOfRangeError` |
| Obstacle `uuid` not in the study | `ObstacleNotFoundError` |

All these errors are `ValueError`s, raised before any scenario is solved, except the obstacle and
support lookups that need the study.

`WorkerPythonService.runTask()` never rejects: it resolves with `{ result, error }`, and the
component turns `error` into a notification.

### Known limitations

These are the behaviors of the current implementation, worth knowing before extending it.

- **One obstacle point per call.** The distance plane and the measures use the single position
  selected by `pointIndex`: an obstacle with several points needs one calculation per point.
- `…CableLineAxisDistance` is the position of the cable point in the plane, not a distance
  to the obstacle: the distance is in the compliance values and `…MinimalDistance`.

### Tests

Run them from `stellar-engine/`:

```bash
uv run pytest test/core/conformity
```

| File | Covers |
|---|---|
| `test_conformity_scenarios.py` | The [overwrite rules](#conformity-overwrite-rules), scenario counts per rule, intermediate pressures, voltage mapping, `get_conformity()` end to end (study left unchanged, clockwise wind, one solve per climatic state, line axis distances on angled sections), `ConformityRequest` validation and errors. |
| `test_conformity_points.py` | Output structure: one `conformity` and `results` entry per rule in the order of `rulesDistances`, `radius` per graph type, point counts, zone structure, compliance is a boolean. |
| `test_conformity_compute.py` | Zone geometry of the three graph types, minimum zone width, compliance logic (including the vegetation U and the signed gap), closest-point values, `get_strategy()`. |
| `test_conformity_table_rules.py` | Table values and compliance per graph type, end to end, for several obstacle positions, and the output keys of the frontend contract. |
| `conftest.py` | Factories building fresh inputs: `make_form`, `make_rule`, `make_distances`, `make_obstacle`, `make_python_inputs`, plus `build_scenarios`, `run_conformity` (on a copy of a study solved once per module) and `study_angled`. |

`make_form()` defaults to wind zone `"200"`, pressure 200, `windMinus` off, repartition
temperature 70, lateral temperature 68 and the `vegetation` graph. A new test builds its inputs
with the factories and overrides only what it checks:

```python
python_inputs = make_python_inputs(
    "accessible_building",
    make_form(conformityPlot="cable_track", intermediatePoints=[0.33, 0.66]),
    [make_rule("RULE_1")],
    [make_distances("RULE_1")],
)
result = run_conformity(python_inputs)
```

The application loads the stellar-engine **wheel**, not its sources: after changing the module,
rebuild it with `npm run set-up-mechaphlowers:engine-only`.

---

(conformity-typescript-layer)=
## The TypeScript layer driven by the Python output

`ConformityComponent` is the whole layer. It lives in the **Conformity** dialog of the obstacle
form, and the shape of the Python output decides what it keeps, shows and re-renders.

### Opening the dialog

`ObstaclesFormComponent.openConformityModal()` lists every unmet condition and shows them in one
warning list instead of opening the dialog:

- the obstacle is saved (it has a `uuid`);
- its type has at least one `catObstacleDistances` row;
- the section has an electric tension level (`voltage_idr`).

(conformity-form-population)=
### Form population

The form is `selectedPoint`, `windZone`, `windMinus`, `redZonePresence`,
`repartitionTemperature`, `lateralDistanceTemperature` and `conformity` (the selected rules). The
`populateForm` effect fills it with these priorities:

1. the **saved data** of the obstacle (`Obstacle.conformityData`, `ConformityFormData`);
2. otherwise the **catalog defaults**: `windZone.default`, `repartitionTemperatureFields.defaultValue`,
   `lateralTemperatureFields.defaultValue` (falling back to the lateral temperature of the rule
   named by `lateralTemperatureFields.ruleType` when the default is missing), and the rules
   whose `active` is true;
3. when the obstacle changes, **every** field is reset and the results are cleared. For the same
   obstacle, only the fields **still empty** are filled, so defaults that arrive late from Dexie
   never overwrite what the user typed.

The wind zone, the two checkboxes, the temperature fields and the multiselect are editable; the
obstacle fields are read-only recaps. The **Calculate** button needs a valid form, and a selected point when the
obstacle has several. The temperatures are required, between 0 and 250 °C, with 2 decimals.

### Building the engine input

`calculate()` reads the form and the catalog and builds a `ConformityTaskInput`
(`types.ts`), exactly the contract of [Input contract](#conformity-input-contract):

```ts
{
  obstacle,                                  // the whole obstacle
  pointIndex,                                // selected point (0 when the obstacle has one point)
  electricTension: section.voltage_idr,
  form: { /* form values, */ windPressure: effectiveWindPressure(),
          conformityPlot: conformityType, intermediatePoints },
  rulesClimaticConditions: rules.map(r => ({ ruleType, ruleName, lateralPoint, overhangPoint })),
  rulesDistances: distances.map(d => ({ ruleType, lateral, overhang }))
}
```

Both lists are limited to the **selected** rules. The `color` of the rules is not sent: it stays
in the component (`_ruleColorsByType`) and styles the figure.

### What is kept from the output

The output is split in three and stored in three signals, set together:

| Output | Signal | Used by |
|---|---|---|
| `results` | `_conformityResults` (read through `conformityResults`) | The table. |
| `obstacle`, `conformity` | `_conformityPlotData` (`ConformityPlotResponse`) | The figure. |
| (catalog `color`) | `_ruleColorsByType` | The figure. |

The results section is rendered only while `conformityResults()` is not `null`. Results are
cleared when the dialog closes and when another obstacle is opened, and **never persisted**: only
the form values are saved (**Save**, `ObstacleFormService.saveConformityData()`). On reopening, an
obstacle with saved data and a valid form is **recalculated automatically** (`autoCalculate`).

### The results table

The table is driven by `ConformityRuleResult` (`conformity.model.ts`, same shape as the Python
`results`) and by the declarative rows of `conformity.constantes.ts`.

- **Columns**: for each rule **selected in the multiselect**, an *overhang* column and, unless the
  obstacle type is `overhang` (`showLateralColumn`), a *lateral* column.
- **Rows** (`getConformityCommonRows()`): each row maps a label and unit to an `overhangKey` and
  a `lateralKey` of `results`.

| Row | Overhang key | Lateral key |
|---|---|---|
| Cable altitude | `overhangCableAltitude` | `lateralCableAltitude` |
| Cable line axis distance | `overhangCableLineAxisDistance` | `lateralCableLineAxisDistance` |
| Distance to comply | `overhangDistanceToComply` | `lateralDistanceToComply` |
| Compliance altitude | `overhangComplianceAltitude` | — |
| Compliance line axis distance | — | `lateralComplianceLineAxisDistance` |

- **Conformity compliance** row: a single cell per rule (it spans both columns), read with
  `getConformityCompliance()`: `true` shows *Yes*, `false` *No*, `null` *Unknown*.
- **Minimum distance case** block, for `cable_track` only (`getConformityCableTrackRows()`):
  temperature, wind pressure and minimal distance, from `overhangTemperature`/`lateralTemperature`,
  `overhangWindPressure`/`lateralWindPressure` and `overhangMinimalDistance`/`lateralMinimalDistance`.
- A value is read with `getValue(rule, key)`: a `null`, missing or non-numeric value gives an
  **empty cell**. Numbers are shown with `number: '1.0-2'`.

Because the columns follow the multiselect and the values follow the last calculation, a rule
selected **after** the calculation has an empty column and the compliance *Unknown*, until the
user calculates again.

### The figure

`createConformityPlot()` draws the cross-section of `conformity` and `obstacle` with Plotly, into
`#conformity-plot`. The `renderPlot` effect re-runs it when the plot data, the rule selection,
the colors or the graph type change, so **ticking or unticking a rule adds or removes its zone
immediately, without a new calculation**.

- Only the rules selected in the multiselect are drawn. The key order of `conformity` is the
  stacking priority: the first rule is drawn on top.
- **`overhang` and `vegetation`**: a filled zone (`zonePlot.zonePoints`, rule color, 20 % opacity),
  its bright border (`zonePlot.zoneBorder`), and the cable `points` as markers.
- **`cable_track`**: no zone. Each `points` entry is a fully opaque **disk** of the rule color, with the
  `radius` in data units, and a marker at its center. Zones are ignored.
- The **obstacle** point is always drawn on top, as a diamond.
- Both axes keep the same scale (`scaleanchor`), so a radius in meters is a true circle.
- Hovering a point shows `x` and `y` in meters.

The figure can be enlarged to fill the dialog; the form and the table are then collapsed and
the plot follows its container with a `ResizeObserver`.

### Errors

`calculate()` stops and notifies with `NotificationService` when the obstacle type has no
`conformity`. For the other failures it also sets `calculationError`:

| Case | Message |
|---|---|
| The obstacle type has no `conformity` | `studio.conformity.no-conformity-config-error` (notification only) |
| `voltage_idr` missing | *Missing electric tension*, via `calculation-failed-error` |
| `runTask()` resolves with `error`, or with no result | the engine message, via `calculation-failed-error` |

The loading state is exposed with `isCalculating`, and the results are announced to assistive
technologies through a polite `<output>` live region.

### Tests

| Spec | Covers |
|---|---|
| `conformity.component.spec.ts` | Form population, wind pressure and red zone, input building, results, saved data, errors. |
| `helpers/createConformityPlot.spec.ts` | Traces and shapes per graph type, rule selection, stacking order. |
| `obstacles.config.spec.ts` | Validation and mapping of `obstacle_configuration.json`. |
| `obstaclesForm.component.spec.ts` | Eligibility conditions and dialog opening. |

Run one with `npm run test -- conformity.component`.

### Extending the check

**Add a result row.** Add the key to the Python `ConformityTableResult` and `TableResultWriter`,
to `ConformityRuleResult` (`conformity.model.ts`) and `ConformityTaskOutput` (`types.ts`), then add
a `ResultRow` in `conformity.constantes.ts` with its label in `public/i18n/*.json`.

**Add a graph type.** Add the value to the Python `ConformityPlot` enum and a `PlotStrategy`
implementation in `strategies.py` (radius, gaps, verdict, zone), registered in `STRATEGIES`, to
`ObstacleConformityType` and `ALLOWED_CONFORMITY` (`obstacles.config.helpers.ts`), and handle it
in `createConformityPlot()`.

---

## Related documentation

- {doc}`configure_conformity` — the `obstacle_configuration.json` catalog.
- {doc}`app/engine_worker` — how tasks reach the Python engine.
- {doc}`../user_guide/conformity` — the conformity check as the user sees it.
