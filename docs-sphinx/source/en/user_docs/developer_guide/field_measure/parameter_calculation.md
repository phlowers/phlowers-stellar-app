# Parameter Calculation Tab

## Purpose

The **Parameter Calculation** tab provides field measurement methods to compute the electrical sag parameter from on-site angle and distance observations. Currently, only the **PAPOTO** method is implemented; the Tangent Aiming and PEP methods are placeholder components (disabled radio buttons).

The computed parameter feeds the **Parameter at 15°C without wind** tab in "auto" mode, which uses `outputs.papoto.parameter` and `outputs.papoto.uncertainty` to perform subsequent thermal calculations.

## Component Tree and Files

The parameter calculation tab is implemented by the following components (relative paths from `src/app/features/studio/field-measuring/`):

- **Method selector & container**: `presentation/components/calculus-setting/calculus-setting.component.ts` and `.html`
  - Radio buttons for PAPOTO, Tangent Aiming (disabled), PEP (disabled)
  - Conditional rendering of child component based on selection
- **PAPOTO measurement form**: `presentation/components/calculus-setting/papoto/papoto.component.ts` and `.html`
  - Input fields for span length, elevation difference, and 12 angles (HL, H1–H3, HR, VL, V1–V3, VR)
  - Help dialog with visual guidance (`papoto-help.webp` image)
  - Results section (parameter, uncertainty, parameters 1–2, 2–3, 1–3, 0.5% validity criterion)
  - **Placeholder components** (no logic):
    - `presentation/components/calculus-setting/tangent-aiming/tangent-aiming.component.ts` (disabled)
    - `presentation/components/calculus-setting/pep/pep.component.ts` (disabled)
- **Domain model**: `domain/types.ts` (exports `FieldMeasure` interface with PAPOTO fields and `PapotoResult`)
- **Helpers**: `presentation/helpers.ts` and `presentation/constants.ts`
- **Main field measuring**: `presentation/components/field-measuring/field-measuring.component.ts` (lifecycle, validation, tab synchronization)

## Data Flow

```{mermaid}
sequenceDiagram
    User->>PapotoComponent: Fill HL, H1..H3, HR, VL, V1..V3, VR, etc.
    User->>PapotoComponent: Click "Calculate"
    PapotoComponent->>WorkerPythonService: runTask(Task.calculatePapoto, {inputs})
    WorkerPythonService->>Pyodide Worker: Pass task + input dict to web worker
    Pyodide Worker->>handle-task: Dispatch Task.calculatePapoto → calculate_papoto
    handle-task->>api.py: Call calculate_papoto(js_inputs.to_py())
    api.py->>papoto.py: Call calculate_papoto(inputs) from stellar_engine.tools
    papoto.py->>PapotoParameterMeasure: Create & run PapotoParameterMeasure()
    PapotoParameterMeasure->>mechaphlowers: Compute 3 PAPOTO parameters (1-2, 2-3, 1-3)
    mechaphlowers-->>PapotoParameterMeasure: Return parameter, validity, parameter_1_2, parameter_2_3, parameter_1_3
    PapotoParameterMeasure->>uncertainty: Monte Carlo (draw_number=1000, angle_error=0.01 grad)
    uncertainty-->>PapotoParameterMeasure: Return std_parameter_valid_values
    PapotoParameterMeasure-->>papoto.py: Return {parameter, parameter_1_2, parameter_2_3, parameter_1_3, checkValidity, uncertainty}
    papoto.py-->>api.py: Return result dict
    api.py-->>handle-task: Return result to Pyodide worker
    Pyodide Worker-->>WorkerPythonService: postMessage(result)
    WorkerPythonService-->>PapotoComponent: Resolve with {result, error}
    PapotoComponent->>PapotoComponent: Update measureData().outputs.papoto
    PapotoComponent->>User: Display results (parameter, uncertainty, parameters, criterion)
```

## Inputs and Outputs

### Inputs to `calculate_papoto`

All angle inputs are in **gradians (Gr)** (100 grad = 90°). Distance inputs are in **metres (m)**.

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `spanLength` | number | m | Measured span length (distance between the two supports) |
| `measuredElevationDifference` | number | m | Vertical distance between left and right cable attachment points |
| `HL` | number | Gr | Horizontal angle from left support to left measurement point |
| `H1` | number | Gr | Horizontal angle to first intermediate measurement point |
| `H2` | number | Gr | Horizontal angle to second intermediate measurement point |
| `H3` | number | Gr | Horizontal angle to third intermediate measurement point |
| `HR` | number | Gr | Horizontal angle from right support to right measurement point |
| `VL` | number | Gr | Vertical angle from left support to left measurement point |
| `V1` | number | Gr | Vertical angle to first intermediate measurement point |
| `V2` | number | Gr | Vertical angle to second intermediate measurement point |
| `V3` | number | Gr | Vertical angle to third intermediate measurement point |
| `VR` | number | Gr | Vertical angle from right support to right measurement point |

**Left support**: User selects from a dropdown. The two options are the left and right supports of the span.

### Outputs from `calculate_papoto`

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `parameter` | number | m | Mean of the three PAPOTO parameters computed from point pairs 1–2, 2–3, and 1–3 |
| `parameter_1_2` | number | m | PAPOTO parameter computed from measurement points 1 and 2 |
| `parameter_2_3` | number | m | PAPOTO parameter computed from measurement points 2 and 3 |
| `parameter_1_3` | number | m | PAPOTO parameter computed from measurement points 1 and 3 |
| `checkValidity` | boolean | — | Whether the validity criterion (0.5%) is satisfied (true if validity < 0.005) |
| `uncertainty` | number | m | $2 \times \text{std}(\text{parameter from valid samples})$, computed via Monte Carlo (1000 draws, angle error ±0.01 grad) |

## FieldMeasure Fields

The `FieldMeasure` model stores both inputs and outputs:

### Inputs (from PAPOTO form)

- `leftSupport: string | null` – Selected support label (e.g., "1", "2")
- `spanLength: number | null` – Measured span length (m)
- `measuredElevationDifference: number | null` – Measured elevation difference (m)
- `HL, H1, H2, H3, HR: number | null` – Horizontal angles (Gr)
- `VL, V1, V2, V3, VR: number | null` – Vertical angles (Gr)

### Outputs

- `outputs.papoto: PapotoResult | null` – Result object containing the six fields above (parameter, parameter_1_2, parameter_2_3, parameter_1_3, checkValidity, uncertainty)

## Validation & Error Handling

### Form Validation

All 13 fields are mandatory (enforced by `isFormValid()` computed in `PapotoComponent`):
- Left support must be selected
- All span length, elevation, and angle fields must have non-null values

The **Calculate** button is disabled until all fields are filled.

### Calculation Errors

If an error occurs during the Python calculation (e.g., invalid angle ranges, convergence failure), the following occurs:

1. The error flag `papotoError` is set to true.
2. The error message **"An error occurred"** (`field-measuring.papoto.error-message`) is displayed to the user.
3. The `outputs.papoto` is cleared (set to `null`).
4. The result section is hidden.

Error details are logged in the browser console but are not exposed to the end user in the UI.

## Integration with Parameter at 15°C Tab

When the user opens the **Parameter at 15°C without wind** tab in **"auto"** update mode:

1. `parameterPapoto` is populated from `outputs.papoto.parameter`
2. `parameterUncertaintyPapoto` is populated from `outputs.papoto.uncertainty`

If the user switches to **"manual"** mode, the auto-populated values are preserved and become editable. Any change to PAPOTO inputs (HL, H1, etc., or span length) clears the stale result (`outputs.papoto = null`), forcing recalculation if needed.

## Tests

**Angular component tests:**
- `src/app/features/studio/field-measuring/presentation/components/calculus-setting/papoto/papoto.component.spec.ts`

**Python backend tests:**
- `stellar-engine/test/tools/test_papoto.py` (tests the `papoto.calculate_papoto()` function and `PapotoParameterMeasure` class from mechaphlowers)

## Design Notes

- The **help button** opens a dialog displaying a visual diagram (`papoto-help.webp`) explaining the measurement geometry and point labelling.
- The "Import station's datas" button is currently disabled (placeholder for future import functionality).
- A secondary info message ("All fields are mandatory for calculus setting") is displayed to guide users.
- Two additional read-only fields show **calculated values** (from terrain analysis):
  - Calculated span length (from plot service)
  - Calculated elevation difference (from plot service)
  These assist users in validating their manual measurements.
- Angles are displayed and input in **gradians (Gr)** in the UI; the Python backend expects the same unit.
- Parameter values are **rounded to one decimal place at the Python calculation level**.
