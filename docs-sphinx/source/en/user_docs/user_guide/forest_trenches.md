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

## Typical workflow

1. Open the tool from **Tools** → **Forest trenches**.
2. Choose the **First support** and the **Last support**, then the **Number of ground slicing points**.
3. Check the electric tension, the **Wind zone**, the temperatures and the rules.
4. Click **Calculate**.
5. Browse the spans with the **Span** list, and read the graph and the table.

---

## Good to know

- The results are not saved: closing the tool makes them disappear.
- A section keeps one set of saved values, replaced at each successful calculation.
- The ground used is the one saved for each span, in the **Sol** tab (floor). After a change of the
  section floors, click **Calculate** again to update the results.
- A span without saved ground is calculated with a straight ground, between the ground altitudes at the
  feet of its two supports.
- Points beyond the first or the last point of the ground keep the altitude of that end point.
- When the saved values are no longer valid, for example a range of supports that no longer exists, or a
  number of points that is no longer in the catalog, the form goes back to the default values. Rules that
  are no longer offered are dropped.

---

## Messages

| Message | Meaning |
|---|---|
| **Forest trenches inputs saved.** | The calculation succeeded and the form values are saved with the section. |
| **Forest trenches calculation failed: …** | The calculation could not complete. The message gives the cause. Nothing is saved. |
| *Forest trenches configuration is missing from the obstacle catalog…* | The catalog has no configuration for this tool. Close the other Stellar tabs, then reload the application. |

---

## Related documentation

- {doc}`Conformity check <conformity>` — the rules, the distances and how to read the conformity table.
- {doc}`Obstacles <obstacles>` — the obstacles of the section.
- {doc}`Free positioning <plot/free-positioning>` — place obstacles and ground on the chart.
