# Cable Length Modification — "Cable manip. at span" Tab

## Purpose

This tab allows you to simulate the effect of **lengthening or shortening a cable** on a given span. The modification is applied locally to the selected span and results in a visible change to the cable sag on the chart.

---

## Access

1. Open a study in the application.
2. Navigate to the **Studio** tab.
3. Select the **Loads** view.
4. Click on the **Cable manip. at span** tab.

---

## Field descriptions

### Span

Select the span on which you want to apply the modification. The dropdown displays spans in the format **Left support number → Right support number**. A search field is available to filter the list.

### Reference support

Choose the support used as the reference point for the distance measurement:

- **Left**: the support on the left side of the span.
- **Right**: the support on the right side of the span.

### Modification type

Specify whether you want to:

- **Lengthen** the cable (add length).
- **Shorten** the cable (remove length).

### Length (m)

Enter the modification value in metres. The value must be between **0** and **1,000 m**.

### Distance to reference support (m)

Enter the distance in metres from the reference support where the modification is applied. The value must be between **0** and **5,000 m**.

---

## Buttons

| Button | Role |
|---|---|
| **Reset** | Resets the form to default values or to the last saved modification for this span. |
| **Delete** | Removes the saved modification for the selected span. This button is only available when a modification has already been saved. |
| **Save** | Saves the entered modification for the selected span. This button is only available when changes have been made since the last save. |
| **Calculate** | Runs the calculation and updates the chart to reflect the modification applied to the span. |

---

## Typical workflow

1. Select the **span** to modify from the dropdown.
2. Choose the **reference support** (Left or Right).
3. Select the **modification type** (Lengthen or Shorten).
4. Enter the **length** of the modification (in metres).
5. Enter the **distance to the reference support** (in metres).
6. Click **Save** to store the modification.
7. Click **Calculate** to visualise the effect on the chart.

:::{note}
When you switch to a different span, the form automatically reloads with any modification previously saved for that span.
:::

:::{note}
Only one modification can be saved per span. Saving a new modification on a span replaces the previous one.
:::
