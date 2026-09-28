# Parameter Calculation Tab

## What Is It For?

The **Parameter calculation** tab allows line engineers to measure the electrical sag parameter of a cable span by taking field measurements. You record angles and distances from two or three observation points, and {{app_name}} computes the cable parameter using the PAPOTO method.

The computed parameter is then used by the **Parameter at 15°C without wind** tab to generate an initial condition (base state) for the line simulation.

## Choosing a Calculation Method

Three methods are available in a radio button selector:

- **PAPOTO** (enabled)
  - Measures angles and distances from multiple observation points
  - Most accurate with 3 measurement points; provides validity check
  - This is the method you will use
  
- **Tangent aiming** (disabled)
  - Not yet available in {{app_name}}
  
- **PEP** (disabled)
  - Not yet available in {{app_name}}

## PAPOTO Measurement Setup

All fields in the PAPOTO form are **mandatory**. You must fill them all before clicking **Calculate**.

### Global Span Information

| Label | Unit | Meaning |
|---|---|---|
| **Left support** | — | Select which end of the span is the "left" support (the two options are the supports of your selected span). This determines how horizontal angles are measured. |
| **Measured span length** | m | The distance between the two support attachment points on the cable. |
| **Elevation diff. of measured attach.** | m | The vertical height difference between the left and right attachment points. If right is higher, the value is positive. |

In {{app_name}}, two **Calculated value** fields (read-only) show the span length and elevation difference computed from terrain analysis. Compare them with your measured values to validate your measurements.

### Measurement Angles

Record angles from two to three observation points along the cable. All angles are in **gradians (Gr)** (where 100 Gr = 90°, or 400 Gr = 360°).

| Label | Unit | Meaning |
|---|---|---|
| **HL** | Gr | Horizontal angle from the left support to the left observation point |
| **VL** | Gr | Vertical angle from the left support to the left observation point |
| **H1** | Gr | Horizontal angle to the first intermediate observation point |
| **V1** | Gr | Vertical angle to the first intermediate observation point |
| **H2** | Gr | Horizontal angle to the second intermediate observation point |
| **V2** | Gr | Vertical angle to the second intermediate observation point |
| **H3** | Gr | Horizontal angle to the third intermediate observation point |
| **V3** | Gr | Vertical angle to the third intermediate observation point |
| **HR** | Gr | Horizontal angle from the right support to the right observation point |
| **VR** | Gr | Vertical angle from the right support to the right observation point |

**How angles are measured:**
- **Horizontal angles (H)** are measured perpendicular to the span axis
- **Vertical angles (V)** are measured in the vertical plane containing the span
- Angles are signed (positive/negative) depending on the observation point's direction

The **Help** button (with a ? icon) opens a visual diagram showing how these angles are measured and labeled.

## Running the Calculation

1. **Fill all mandatory fields** above.
2. Click the **Calculate** button (with a rocket icon).
3. {{app_name}} sends your measurements to the Python calculation engine.
4. Results appear in the **Results** section below.

The **Calculate** button is disabled (grayed out) until all fields contain a value. A note above the form reminds you: "All fields are mandatory for calculus setting".

## Reading the Results

After calculation, the following results are displayed:

### Main Output

| Label | Unit | Meaning |
|---|---|---|
| **Parameter** | m | The cable sag parameter (mean of three pairwise calculations). This is the value used for the next step. |
| **uncertainty parameter** | m | The measurement uncertainty (±), computed by varying each angle by ±0.01 grad and re-calculating 1000 times. The shown value is $2 \times \text{std}$ of valid results. |

### Diagnostic Parameters

| Label | Unit | Meaning |
|---|---|---|
| **Parameter 1-2** | m | Sag parameter computed from measurement points 1 and 2 only. Helps diagnose measurement consistency. |
| **Parameter 2-3** | m | Sag parameter computed from measurement points 2 and 3 only. |
| **Parameter 1-3** | m | Sag parameter computed from measurement points 1 and 3 only (skipping point 2). |

All parameter values are displayed to one decimal place (e.g., 12.5 m).

### Validity Criterion

| Label | Meaning |
|---|---|
| **0.5% criterion** | Shows **Yes** (✓ icon) or **No** (✗ icon). The measurement is valid if the three pairwise parameters agree within 0.5% of their mean. A "No" indicates your measurement points may have been misrecorded or that the span geometry makes measurement difficult. |

## Error Messages

If the calculation fails, an error message appears:

**"An error occurred"**

This can happen if:
- Angle values are outside the expected range
- The numerical solver cannot converge
- Input data is inconsistent

Check your entered values and try again. If the error persists, review your field measurements.

## Next Step

Once you have a valid PAPOTO result, proceed to the **Temperature calculation** tab to measure the cable's surface temperature and solar radiation. Then move to the **Parameter at 15°C without wind** tab (where the PAPOTO parameter is automatically pre-filled in "auto" mode) to generate the initial condition for simulation.
