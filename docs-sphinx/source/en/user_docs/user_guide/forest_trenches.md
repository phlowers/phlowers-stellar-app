# Forest trenches

## Purpose

Under a cable, vegetation must stay at a safe distance from the cable, whatever the weather. The
**forest trenches** tool checks this distance along one or several consecutive spans: it slices each
span into several points, and computes at each of them the position of the cable in the climatic
conditions of the conformity rules.

For each point, the tool gives:

- the **cable altitude** and its **cable height above ground**;
- the **overhang compliance limit height**: the height above ground up to which vegetation can grow
  under the cable without reaching the overhang distance of the rule;
- the **lateral distance** of the cable from the span axis, and the **lateral limit** of the rule.

The result is a **graph** in plan view, and a **table** of values per span.

---

## Access

1. Open a study, then a section in the **Studio**.
2. In the top toolbar, open the **Tools** menu.
3. Click **Forest trenches**.

Like the other tools, it can also be added to the toolbar shortcuts.

:::{note}
The toolbar is unavailable while {doc}`free positioning <plot/free-positioning>` is active.
:::

---

## Field descriptions

### First support

The first support of the studied range. By default, it is the first support of the section.

### Last support

The last support of the studied range. It must be **after** the first support, otherwise the
**Calculate** button stays unavailable. All the spans between the two supports are calculated.

### Number of ground slicing points

The number of points spread evenly along each span, end supports included. The proposed values come
from the catalog. The more points, the more detailed the profile, and the longer the calculation.

### Electric tension

The electric tension of the section. It is read only, and the section must have one to calculate.

### Wind zone

The wind zone that gives the wind pressure used by the rules that depend on the wind. A default zone
is selected.

### Wind -

Reverses the wind direction of the **lateral** case. The lateral cable and the inverse lateral cable
are swapped in the graph.

### Red zone presence

Uses the red zone wind pressure of the selected wind zone instead of the normal one. The default value
comes from the catalog.

### Repartition temperature (°C)

The temperature of the cable for the **overhang** case of the rules that do not fix their own. A
default value is proposed.

### Lateral distance temperature (°C)

The temperature of the cable for the **lateral** case of the rules that do not fix their own. The
label is prefixed by the name of the catalog rule whose lateral temperature is used as the reference,
and the hint below the field also comes from the catalog.

Both temperatures are mandatory, between **0** and **250 °C**, with up to 2 decimals.

### Conformity

The rules to check. The offered rules are the forest trenches rules of the catalog, for the overhang
and for the lateral case. The rules active for the ground are selected by default. At least one rule
must be selected. See {doc}`Conformity check <conformity>` for how rules work.

### Calculate

Runs the calculation. The button is available when the form is valid, the electric tension of the
section is set, the last support is after the first one, and at least one rule is selected.

If the forest trenches configuration is missing from the catalog, the button stays unavailable and a
message says so. Close the other Stellar tabs, then reload the application.

---

## Results

### Graph

The graph shows the span seen from above (**plan view**):

- the horizontal axis is the **distance from left support**, in meters. The ticks carry the name of
  the left support, span fractions (1/4, 1/2, 3/4…) and the name of the right support;
- the vertical axis is the **signed lateral distance from span axis**, in meters. Both axes share the
  same scale, and positive values are drawn downwards.

The dashed black line is the **span axis**, with a small cross at each slicing point. Each selected
rule draws:

- the **overhang cable**, in the overhang color set in the catalog;
- for the lateral case, the **lateral cable** and the **lateral limit**, then the **inverse lateral
  cable** and the **inverse lateral limit**, in the color of the rule.

Hover a curve to read its coordinates in meters, and zoom with the mouse wheel. The legend only shows
when the graphic view is enlarged.

### Span

The **Span** list chooses the span displayed among the calculated ones. Each option shows the left
support and the right support. The first span is selected by default.

### Median F1 at repartition (m)

The sag of the span in the overhang state, at the repartition temperature and without wind. It
only appears when at least one overhang rule is selected.

### Table

The table has one column per slicing point, and the following rows, in meters, with two decimals. The
temperature **T** in brackets is the rule's own one if it fixes one, otherwise the form temperature:
the repartition temperature for the overhang case, and the lateral distance temperature for the
lateral case.

| Row | Meaning |
|---|---|
| **Distance to left support** | Position of the point along the span. |
| **Ground elevation** | Ground altitude at the point. |
| **Cable altitude: <rule> overhang (T °C)** | Altitude of the cable in the overhang state. |
| **Cable altitude: <rule> lateral (T °C)** | Altitude of the cable in the lateral state. |
| **Cable height: <rule> overhang (T °C, relative to ground)** | Cable altitude minus ground elevation. |
| **Overhang compliance limit height: <rule>** | Cable height minus the overhang distance of the rule: the height above ground up to which vegetation stays at the overhang distance. A negative value means the ground itself is closer to the cable than the overhang distance. |
| **Span axis to cable: <rule> lateral (T °C)** | Signed lateral distance of the cable from the span axis, in the lateral state. |
| **Span axis to lateral limit: <rule>** | Signed lateral distance of the lateral limit from the span axis. |

Distances are measured in a vertical plane perpendicular to the span axis, through each slicing point.
At the end supports, the cable attachment point is used.

### Enlarge the graph

**Enlarge graphic view** hides the form and the table, and shows the legend. **Reduce graphic view**
brings them back.

---

## Save

There is no **Save** button. After a successful calculation, the form values are saved automatically
with the section. The results are not saved.

When you reopen the tool on the section, the form is filled with the saved values, but the calculation
does not run by itself: click **Calculate** to show the results.

---

## Trench points export

The **Export** button, at the bottom right of the window, saves the displayed results in a trench points
CSV file. The window stays open.

- The browser asks where to save the file. When it cannot, the file is downloaded to the usual download
  folder. Closing the save window cancels the export.
- The file is named `Export PointsTranchee_<section name>_<YYYY-MM-DD>.csv`, with the export date.
- It holds one block per calculated span, in span order. Each block starts with a header line:
  `[<left support>]`, then the span fraction of each intermediate point, prefixed with an apostrophe (for
  example `'1/8`), then `[<right support>]`.
- 9 lines follow, without label or unit. Each one matches a row of the table:
  1. **Distance to left support**;
  2. **Ground elevation**;
  3. **Span axis to cable** for AT;
  4. **Span axis to lateral limit** for AT;
  5. **Span axis to cable** for CCG-LA;
  6. **Span axis to lateral limit** for CCG-LA;
  7. overhang **Cable height** for AT;
  8. **Overhang compliance limit height** for AT;
  9. **Overhang compliance limit height** for CCG-LA.
- Values are in metres, with a comma and 2 decimals (`2,00`), separated by semicolons, whatever the
  application language.
- AT and CCG-LA are the first two lateral rules of the catalog. The export is only possible when both
  rules were calculated, lateral and overhang: select both of them in **Conformity** before clicking
  **Calculate**.
- The results are not saved: after reopening the tool, click **Calculate** again before exporting.

---

## Typical workflow

1. Open the tool from **Tools** → **Forest trenches**.
2. Choose the **First support** and the **Last support**, then the **Number of ground slicing points**.
3. Check the electric tension, the **Wind zone**, the temperatures and the rules.
4. Click **Calculate**.
5. Browse the spans with the **Span** list, and read the graph and the table.
6. Click **Export** to save the trench points file.

---

## Good to know

- The results are not saved: closing the tool makes them disappear.
- A section keeps one set of saved values, replaced at each successful calculation.
- The ground used is the one saved for each span, in the **Sol** tab (floor). After a change of the
  section floors, click **Calculate** again to update the results.
- A span without saved ground is calculated with a straight ground, between the ground altitudes at the
  feet of its two supports.
- Points beyond the first or the last point of the ground keep the altitude of that end point.
- The ground belongs to each span. If, for a ground point, the vertical plane perpendicular to the span does not cut the
  cable (for example very close to a support), the calculation continues: it uses the cable end (left or right
  attachment) closest to the ground point in altitude and lateral distance, without considering the position along the
  span.
- When the saved values are no longer valid, for example a range of supports that no longer exists, or a
  number of points that is no longer in the catalog, the form goes back to the default values. Rules that
  are no longer offered are dropped.

---

## Messages

| Message | Meaning |
|---|---|
| **Forest trenches inputs saved.** | The calculation succeeded and the form values are saved with the section. |
| **Forest trenches calculation failed: …** | The calculation could not complete. The message gives the cause. Nothing is saved. |
| **Export failed: the forest trenches results are missing or incomplete** | No calculation was run since the tool was opened, or AT or CCG-LA was not calculated (rule not selected, or catalog without the CCG-LA overhang). No file is created. |
| *Forest trenches configuration is missing from the obstacle catalog…* | The catalog has no configuration for this tool. Close the other Stellar tabs, then reload the application. |

---

## Related documentation

- {doc}`Conformity check <conformity>` — the rules, the distances and how to read the conformity table.
- {doc}`Obstacles <obstacles>` — the obstacles of the section.
- {doc}`Free positioning <plot/free-positioning>` — place obstacles and ground on the chart.
