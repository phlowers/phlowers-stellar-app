# RRTS cut strands

## Purpose

When some strands of a cable are cut, the cable loses part of its strength. The **RRTS cut
strands** tool lets you enter the number of cut strands in each layer of the cable, and calculates:

- the cable's **RRTS** (Residual Rated Tensile Strength), in daN: the strength the cable has left;
- the **new max working load** of the section with this reduced strength, in %.

You can then save the cut strands with the section.

---

## Access

1. Open a study, then a section in the **Studio**.
2. In the top toolbar, open the **Tools** menu.
3. Click **Strand RRTS**.

You can also add the tool to the toolbar shortcuts with the edit button at the end of the toolbar.

:::{note}
The toolbar is unavailable while {doc}`free positioning <plot/free-positioning>` is on.
:::

---

## Information shown

| Information | Description |
|---|---|
| **Cable name** | The cable of the section. |
| **Current max working load** | The highest working load of the section, as currently calculated in the studio: the **Working load** shown under the studio plot in **Max section** mode. |
| **Staff presence** | Whether staff is present on the selected load case. See [Staff presence](#staff-presence). |

---

## Field descriptions

### Span

Select the span where the strands are cut. The field is optional: leave it empty to link the cut
strands to the whole section.

The **Reference support**, **Distance to reference support** and **Add a marking** fields are
only available once a span is selected. Removing the span clears them.

### Reference support

Choose the support the distance is measured from: the left or the right support of the span. The
left support is selected by default.

### Distance to reference support (m)

Enter the distance in metres from the reference support to the cut. The field is optional. The
value must be between **0** and **5,000 m**, with up to 2 decimals.

### Cut strands layer 1, 2, …

One field for each layer of the cable that has strands in the cable catalog. The number next to
the field (for example **/ 12**) is the number of strands in the layer.

Enter the number of cut strands in the layer: a whole number between **0** and the number of
strands in the layer. The fields are mandatory and set to **0** by default.

If the cable catalog has no strand data for the cable, the message **No strand layer data
available for this cable** replaces these fields, and the calculation is unavailable.

### Add a marking

Tick this box to record that the cut should be marked on the studio plot.

:::{note}
The span, reference support and distance locate the cut, and the marking is a display option: none
of them changes the results. The reduced strength applies to the whole section, whichever span the
strands are cut on.
:::

---

## Results

Click **Calculate** to display the results:

| Result | Description |
|---|---|
| **Cable's RRTS** | The cable's strength once the cut strands are taken out, in daN. |
| **New max working load** | The highest working load of the section with this RRTS, in %, followed by a status icon. |

The RRTS is the rated tensile strength of the cable, minus the strength of each cut strand:

$$\text{RRTS} = \text{RTS}_{\text{cable}} - \sum_{\text{layers}} \text{cut strands} \times \text{RTS of one strand of the layer}$$

The working load of a span compares its maximum tension, multiplied by the safety coefficient, with
the RRTS:

$$\text{working load (\%)} = \frac{\text{maximum tension} \times \text{safety coefficient}}{\text{RRTS}} \times 100$$

The strengths and the safety coefficient come from the cable catalog. Without a safety coefficient
in the catalog, **1.5** is used.

The status icon rates the new max working load:

| Icon | New max working load | Meaning |
|---|---|---|
| Green check | From 0 to 75 % | Satisfactory |
| Orange exclamation mark | Above 75 %, up to 100 % | Concerning |
| Red cross | Above 100 %, or negative | Dangerous |
| Grey icon, value **-** | No value | No new max working load |

If the calculation fails, for example when the cable catalog does not give the strength of a
layer with cut strands, the message **Failed to calculate the RRTS** is shown and the results are
cleared.

---

(staff-presence)=
## Staff presence

When staff is present, the safety coefficient is multiplied by **1.5**, so the working load is
1.5 times higher.

- Staff presence is the **Personnel presence** option of the load case selected in the studio.
  You set it when creating the load case, and can change it in the loads table.
- Without a selected load case, staff is considered present, which is the safest case. The menu
  bar then shows **Staff is present**.
- Staff presence applies to the whole studio: the **Working load** under the studio plot also
  follows the selected load case, and is updated when the load case or its staff presence changes.

---

## Buttons

| Button | Role |
|---|---|
| **Calculate** | Calculates the RRTS and the new max working load. Only available when every cut strands field is valid. |
| **Save** | Saves the entry with the section. Only available after a calculation, as long as no field has changed since. |
| **Delete** | Deletes the saved entry. Only available when the section has one. |

While a calculation, a save or a deletion is running, the three buttons are unavailable.

---

## Typical workflow

1. Open the tool from **Tools** → **Strand RRTS**.
2. Optionally, select the **span** of the cut, its **reference support** and the **distance** to
   it, and tick **Add a marking**.
3. Enter the number of **cut strands** of each layer.
4. Click **Calculate**, and check the **new max working load** and its status.
5. Click **Save** to keep the entry with the section.

:::{note}
A section holds a single RRTS cut strands entry. Saving a new one replaces the previous one.
:::

:::{note}
Any change after a calculation, including the span, the distance or the marking, makes **Save**
unavailable. Click **Calculate** again before saving: the saved entry always matches the results
shown.
:::

---

## Good to know

- When you open the tool on a section with a saved entry, the form is filled with it and the
  calculation runs automatically: the results are not saved.
- Closing the tool discards unsaved changes.
- If the span of a saved entry disappears from the section, for example when one of its supports
  is deleted, the entry is deleted too, and a notification tells you so. An entry linked to the
  whole section is kept.
- The **Layers detail** button is not available yet, and no marking is drawn on the studio plot
  yet.

## Messages

| Message | Meaning |
|---|---|
| **RRTS cut strands saved** | The entry is saved with the section. |
| **RRTS cut strands deleted** | The saved entry is deleted. |
| **Failed to calculate the RRTS** | The calculation could not be completed. The results are cleared. |
| **Failed to save RRTS cut strands** | The entry could not be saved. The previous one is kept. |
| **Failed to delete RRTS cut strands** | The entry could not be deleted. |
| **Failed to update the studio with the RRTS cut strands** | The entry is saved or deleted, but the studio calculations could not take it into account. |
