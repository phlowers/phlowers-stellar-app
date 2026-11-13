# Tangent Aiming

## Purpose

Tangent aiming computes the sag parameter of a span from the angle of the cable tangent seen from a sighting device. Three variants exist, selected by `FieldMeasure.calculationMethod`; they differ only by the **device position** relative to the left support and by how their inputs are mapped to the engine.

| Variant | `calculationMethod` | Device position | Form component |
|---|---|---|---|
| Support | `tangente-aiming` | Right below/above the left support cable attachment | `TangentAimingSupportComponent` |
| Interior | `tangente-aiming-interior` | Inside the span, right of the left support | `TangentAimingInteriorComponent` |
| Exterior | `tangente-aiming-exterior` | Outside the span, left of the left support | `TangentAimingExteriorComponent` |

The PAPOTO and PEP methods are not tangent aiming and are absent from `TANGENT_AIMING_MODES`.

## Files

Relative to `src/app/features/studio/field-measuring/presentation/`:

- `components/calculus-setting/calculus-setting.component.*`: radio selector and container rendering the form of the selected method.
- `components/calculus-setting/tangent-aiming-support/`, `tangent-aiming-interior/`, `tangent-aiming-exterior/`: one component per variant, each with its `.constantes.ts` (field views and rules), `.helpers.ts` (form factory, defaults, validity, task inputs) and `.interfaces.ts`.
- `components/calculus-setting/tangent-aiming-common/`: logic shared by the three variants.
  - `tangent-aiming-form.base.ts`: `TangentAimingFormBase`, abstract directive holding the form state, the left support tracking and the `calculate()` flow. Each component only provides a `TangentAimingFormConfig`.
  - `tangent-aiming-common.constantes.ts`: `TANGENT_AIMING_FIELD_RULES` (bounds / decimals / default of every kind of input) and `TANGENT_AIMING_CALCULATION_TYPE`.
  - `tangent-aiming-header/`, `tangent-aiming-number-field/`, `tangent-aiming-results/`: shared presentational components (the results component displays parameter, uncertainty and the 1% criterion).
- `tangent-aiming-modes.constantes.ts`: `TANGENT_AIMING_MODES`, behaviour of each variant (output key, validity, defaults, result invalidation, reset of hidden fields) looked up by `calculationMethod`.

## Persisted model

Each variant has its own fields in `FieldMeasure` (`@shared/domain/models/field-measure.model`) and its own result under `outputs`:

| Variant | Left support | Calculation type | Result |
|---|---|---|---|
| Support | `tangentLeftSupport` | `calculationType` | `outputs.tangentAimingSupport` |
| Interior | `interiorLeftSupport` | `interiorCalculationType` | `outputs.tangentAimingInterior` |
| Exterior | `exteriorLeftSupport` | `exteriorCalculationType` | `outputs.tangentAimingExterior` |

Only the active calculation method is persisted when a measure is saved; the inputs of the other methods are erased.

## Calculation

`TangentAimingFormBase.calculate()` always runs `Task.calculateTangentAiming` with the inputs returned by the variant's `config.toTaskInputs`. The worker dispatches it to `calculate_tangent_aiming` (`stellar-engine/src/stellar_engine/tools/tangent_aiming.py`), which relies on `mechaphlowers.TangentialSightingParameterMeasure` and returns `parameter`, `uncertainty`, `criterion` (percent) and `checkValidity`.

All three variants share the same engine call (angles in grads, lengths in meters). The device position is encoded in the mapping from form fields to task inputs:

| Task input | Support | Interior | Exterior |
|---|---|---|---|
| `angleToCableTangent` | `tangentAngle` | `tangentAngle` | `tangentAngle` |
| `angleToLeftSupport` | `0` | `verticalAccAngleLeft` | `verticalAccAngleLeft` |
| `angleToRightSupport` | `verticalAccAngle` | `verticalAccAngleRight` | `verticalAccAngleRight` |
| `spanLength` | `spanLength` | `spanLength` | `spanLength` |
| `inputHeight` | `hAccDistance` (vertical distance) | `0` | `0` |
| `distance` | `0` | `hAccDistance` | `-hAccDistance` |

A negative `distance` places the device on the outer side of the left support (Exterior).

```{note}
Only the `tangente` calculation type is computed. The `parametre` type can be selected and saved, but the engine only deduces the parameter from the cable tangent angle.
```

The **Calculate** button (`canCalculate()`) is enabled when the form is valid (`isFormValid`), no calculation is running and the calculation type is `tangente` (`TANGENT_AIMING_CALCULATION_TYPE`). A failure sets `hasError()` and shows the variant `calculationFailedKey` message.

## Report and export

The three variants are reported through the shared `TANGENT_AIMING_REPORT_CONFIGS` (`services/field-measure-report/field-measure-report.constantes.ts`), which maps each `calculationMethod` to the `FieldMeasure` fields it reads (left support, span length, distance, left and right vertical angles, calculation type, parameter, tangent angle) and to its `outputs` key. Both the PDF report (`buildTangentAimingRows`) and the JSON export (`buildTangentialSightsMethodExport`) read these fields through it, so a variant's inputs are declared once.

JSON export (`presentation/field-measure-export.helpers.ts`):

| Export field | Support | Interior / Exterior |
|---|---|---|
| `subMethodName` | `SUPPORT` | `INTERIEUR` / `EXTERIEUR` (`TANGENTIAL_SIGHTS_SUB_METHOD_NAME_EXPORT_VALUES`) |
| `measuredLength` | `tangentSpanLength` | `interiorSpanLength` / `exteriorSpanLength` |
| `calculatedLength` | engine span length of the selected span (`getCalculatedSpanLength`) | same |
| `leftSupportMeasures.verticalDistance` | `cableHAccDistance` (vertical distance) | `null` |
| `leftSupportMeasures.horizontalDistance` | `null` | `…HAccDistance` |
| `leftSupportMeasures.verticalAngle` | `null` (no left angle in the form) | `…VerticalAccAngleLeft` |
| `rightSupportMeasures.verticalAngle` | `cableVerticalAccAngle` | `…VerticalAccAngleRight` |
| `calculationType` | `type` (`PARAMETRE` / `ANGLE_TANGENT`) and `value` (the entered parameter or tangent angle) | same |
| `calculatedParameter` | from `outputs.tangentAimingSupport` | from `outputs.tangentAimingInterior` / `…Exterior` |

`calculatedParameter` is `{ parameter: { value, unit: "m", uncertainty }, criterion: { threshold: 1, unit: "%", status } }` (`TANGENT_AIMING_VALIDITY_CRITERION_PERCENT`, `status` = `checkValidity`), and `undefined` until the variant is calculated. `parameterCalculation.leftSupport` is the label of the variant's left support (`formatLeftSupportLabel`).

## Validation and invalidation

- Numeric inputs are validated by Angular form validators built from `TANGENT_AIMING_FIELD_RULES` (e.g. span length 0–5000 m, angles −200–200 gr); `is…DataValid` rebuilds the form to reuse these validators on a persisted measure.
- Changing a displayed input clears the variant result and the automatic 15°C parameter derived from it (`clearAutoParameter15C`).
- The left support defaults to the left support of the selected span and is remembered per span (`LeftSupportState`).
