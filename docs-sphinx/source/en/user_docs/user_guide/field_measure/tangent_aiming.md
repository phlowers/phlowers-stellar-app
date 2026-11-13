# Tangent aiming

## What is it for?

The **Tangent aiming** method computes the cable parameter of a span from a single sighting: the angle of the **cable tangent** seen from the measuring device, completed by the vertical angles to the cable attachment points of both supports.

Depending on where the operator places the device, three variants are available in the **Parameter calculation** tab:

| Variant | Selector option | Device position |
|---|---|---|
| **Support** | Tangent aiming (Support) | Vertically in line with the cable attachment point of the left support |
| **Interior** | Tangent aiming (Interior) | Inside the span, to the right of the left support |
| **Exterior** | Tangent aiming (Exterior) | Outside the span, to the left of the left support |

In all three cases the result is the same kind of quantity: the cable parameter, its uncertainty and a validity check. It feeds the **Parameter at 15 °C without wind** tab, like the PAPOTO result.

```{note}
Angles are expressed in **grads (gr)** and lengths in **meters**. Every displayed field is **mandatory** to run the calculation.
```

## Fields common to the three variants

| Label | Unit | Meaning |
|---|---|---|
| **Left support** | — | End of the span considered as the "left" support. Defaults to the left support of the selected span. |
| **Measured span length** | m | Distance measured between the two cable attachment points. A read-only **calculated value** from the terrain analysis lets you compare it with your measurement. |
| **Cable tangent angle** | gr | Sighting angle of the cable tangent, between −200 and 200 gr. |
| **Calculation type** | — | **Tangent**: the parameter is deduced from the tangent angle. The **Parameter** type can be selected and saved, but the calculation is not yet available for it. |

## Support variant

The device is placed **directly below (or above) the cable attachment point of the left support**: there is therefore no horizontal offset.

| Label | Unit | Meaning |
|---|---|---|
| **Vertical dist. from device to cable attach. of left support** | m | Height between the device and the left cable attachment point. |
| **Vertical angle from device to cable attach. of right support** | gr | Sighting angle to the cable attachment point of the right support. |

The angle to the left support is not entered: it is zero by construction.

## Interior variant

The device is placed **inside the span**, at a horizontal distance from the left support measured towards the right support.

| Label | Unit | Meaning |
|---|---|---|
| **Horizontal dist. from device to cable attach. of left support** | m | Horizontal distance between the device and the left support. |
| **Vertical angle from device to cable attach. of left support** | gr | Sighting angle to the cable attachment point of the left support. |
| **Vertical angle from device to cable attach. of right support** | gr | Sighting angle to the cable attachment point of the right support. |

## Exterior variant

The device is placed **outside the span, on the left support side** (to the left of it). The fields are identical to the Interior variant; only the device position changes: the horizontal distance entered is measured **outwards** from the span, starting at the left support.

## Running the calculation

The **Calculate** button is enabled when:

- all displayed fields are filled and within their bounds;
- the selected calculation type is **Tangent** (with the **Parameter** type, the button stays disabled);
- no calculation is running (a loading indicator is displayed during processing).

If the calculation fails, an error message is displayed under the button ("Failed to calculate parameter by tangent aiming", with the variant in parentheses for Exterior and Interior).

## Reading the result

After clicking **Calculate**, the **Results** section displays:

- the **parameter** (in m);
- the **uncertainty parameter** (in m);
- the **1% criterion**: "Yes" (criterion met) or "No" (criterion not met).

Editing a displayed field invalidates the previous result (and the automatic 15 °C parameter derived from it): run the calculation again.

```{note}
Only one calculation method is kept when the measure is saved. Inputs of the other methods (PAPOTO, other tangent aiming variants, PEP) are erased.
```

## Report and export

Once the measure is saved, the **Report** and **Export** buttons of the dialog are available for the three variants (see {doc}`terrain_data`). Only the retained variant is reported:

- the **PDF report** presents the method and the left support, the measured and calculated span lengths, the entered distance and angles, the calculation type with the entered value (tangent angle or parameter), then the parameter, the uncertainty and the 1% criterion;
- the **JSON export** describes the variant in `parameterCalculation`: `methodName` is `VISEES_TANGENTES`, `subMethodName` is `SUPPORT`, `EXTERIEUR` or `INTERIEUR`, and the `tangentialSights` block contains the entered measures and, if the calculation was run, the calculated parameter with its criterion (`threshold` of 1%).

In the export, the distance of the **Support** variant is reported as the left-side vertical distance (`leftSupportMeasures.verticalDistance`) and its vertical angle as the right-side angle (`rightSupportMeasures.verticalAngle`). The **Interior** and **Exterior** variants report the horizontal distance and the left-side vertical angle (`leftSupportMeasures.horizontalDistance`, `leftSupportMeasures.verticalAngle`) as well as the right-side vertical angle.
