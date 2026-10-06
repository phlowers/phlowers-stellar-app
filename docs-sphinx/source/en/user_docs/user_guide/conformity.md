# Conformity check

## Purpose

An obstacle near a span (a tree, a building, a road, the ground…) must stay far enough from the
cable, whatever the weather. The **conformity check** answers this question for one obstacle: it
moves the cable of the span through the climatic conditions of the regulatory rules, measures
its distance to the obstacle in each of them, and tells, rule by rule, whether the required
distance is respected.

The result is a **table** of values and a **graph** of the cable positions around the obstacle.

---

## What is checked

### Rules

A **rule** is a regulatory requirement. It sets:

- the **climatic conditions** in which the cable position is evaluated (cable temperature and
  wind pressure);
- the **minimum distances** to respect, which depend on the **electric tension** of the study
  (63, 90, 150, 225 or 400 kV) and on the **type of obstacle**.

You can check an obstacle against several rules at once. The rules offered for an obstacle, and
the ones selected by default, depend on its type.

### Two distances

| Distance | Measured | Cable position |
|---|---|---|
| **Overhang** | Vertically, between the obstacle and the cable above it. | Cable in the *overhang* condition of the rule. |
| **Lateral** | Horizontally, across the span, between the obstacle and the cable swung sideways by the wind. | Cable in the *lateral* condition of the rule, in **both** wind directions. |

Some obstacle types only have an overhang distance (the ground, a road, agricultural land).
Others have both.

### The cross-section

All the distances are measured in a vertical plane that is **perpendicular to the span** and goes
through the obstacle. The graph shows this plane seen from the support:

- the horizontal axis is the **distance to the line axis**, in meters;
- the vertical axis is the **altitude**, in meters.

---

## Access

1. Open a study, then a section in the **Studio**.
2. In the obstacle form, select a **saved** obstacle.
3. Click **Conformity**, next to **Calculate and save**.

The **Conformity verifications** dialog opens. If a condition is not met, a message tells which
one, and the dialog does not open:

| Message | What to do |
|---|---|
| *obstacle must be saved* | Save the obstacle first. |
| *obstacle type '…' is not eligible for conformity control* | This type of obstacle has no conformity rules. Nothing can be checked. |
| *study must have an electric tension level* | Set the electric tension level of the study. |

---

## Field descriptions

### Obstacle

A recap of the obstacle: **Name**, **Type**, **Span**, **Reference support**, **Altitude type**,
and the **Altitude point**, **Reference support distance** and **Distance to line axis** of the
point. These fields cannot be edited here.

When the obstacle has several points, choose the one to display in **Obstacle's point**. The
choice is mandatory to calculate.

:::{note}
The calculation measures the distances from the **first point** of the obstacle.
:::

### Electric tension

The electric tension of the study. It selects the minimum distances of each rule. It cannot be
edited here.

### Wind zone

The wind zone of the obstacle. It gives the wind pressure used by the rules that depend on the
wind. A default zone is selected.

### Wind -

Reverses the wind direction of the **lateral** case shown in the table. The opposite direction is
always checked too, so the verdict does not change: only the side shown in the *lateral* column
does.

### Red zone presence

Tick it when the obstacle is in a red zone, where a higher wind pressure applies. The wind
pressure of the selected wind zone is then the **red zone** one instead of the normal one, for all
the selected rules.

The checkbox is only shown for the obstacle types concerned.

### Repartition temperature (°C)

The temperature of the cable for the **overhang** case of the rules that do not fix their own.
A default value is proposed.

### Lateral distance temperature (°C)

The temperature of the cable for the **lateral** case of the rules that do not fix their own. The
hint below the field gives the reference value. A rule that fixes its own lateral temperature
ignores this field.

Both temperatures are mandatory, between **0** and **250 °C**, with up to 2 decimals.

### Conformity

The rules to check. The rules active by default for the obstacle type are selected. Select or
unselect rules at any time: the graph follows immediately, the table columns too (see
[Results](#conformity-user-results)).

### Calculate

Runs the calculation. The button is available when the form is valid and, for an obstacle with
several points, a point is selected.

---

(conformity-user-results)=
## Results

### Table

There is one column for each selected rule and, except for an obstacle that only has an overhang
distance, an *overhang* and a *lateral* column.

| Row | Meaning |
|---|---|
| **Cable altitude** | Position of the cable in the case. In the *overhang* column, its altitude. In the *lateral* column, its horizontal position in the graph. |
| **Cable line axis distance** | Distance between the obstacle and the cable in the case: vertical for *overhang*, horizontal for *lateral*. |
| **Distance to comply** | The distance required by the rule, at the electric tension of the study. |
| **Compliance altitude** | *Overhang* only. The highest altitude the obstacle may reach under the cable: cable altitude minus distance to comply. |
| **Compliance line axis distance** | *Lateral* only. The horizontal margin: distance between the obstacle and the cable minus distance to comply. A negative value means the obstacle is too close. |
| **Conformity compliance** | The verdict for the rule: **Yes**, **No** or **Unknown**. |

For the obstacle types drawn with disks, a **Minimum distance case** block adds the
**Temperature** (°C), the **Wind pressure** (Pa) and the **Minimal distance** (m) of the overhang
and lateral cases.

A cell is empty when the value does not apply.

### Conformity compliance

The verdict is **Yes** only if **every** position of the cable checked for the rule respects its
distance:

- the lateral case, in both wind directions, and the intermediate positions of the disks graph:
  the **horizontal** distance to the obstacle must be **greater** than the lateral distance;
- the overhang case: the **vertical** distance to the obstacle must be **greater** than the
  overhang distance.

The verdict is **No** as soon as one position is too close, and **Unknown** when the rule has no
result: for example a rule you selected **after** the calculation. Click **Calculate** again to
include it.

The graph helps to see the situation; the **Conformity compliance** row is the reference result.

### Graph

Each rule has its own color. The obstacle is the dark **diamond**. The cable positions are
markers; hover a point to read its coordinates, scroll to zoom, and use the toolbar of the graph
to pan or save an image. Both axes have the same scale, so distances are not distorted.

The graph depends on the type of obstacle. The assignment below is the one of the default
catalog.

#### Horizontal line

For obstacles with an overhang distance only. Each rule draws a horizontal line, at the altitude
of the cable position minus the overhang distance. The obstacle must stay **below** the line.

#### Trench

Used for vegetation. The cable positions of each rule (overhang, lateral, and lateral in the
opposite direction) are surrounded by a clearance zone, extended by the lateral distance on the
sides and by the overhang distance above and below. The border is drawn on the sides and the
bottom, like a trench.

#### Disks

Used for buildings and structures. Each position of the cable is the center of a **disk** whose
radius is the distance to respect. The positions are the overhang case, the lateral case in both
directions, and intermediate positions between them, which give the *track* of the cable. The
obstacle must stay **outside** all the disks.

### Enlarge the graph

**Enlarge graphic view** hides the form and the table and gives the whole dialog to the graph.
**Reduce graphic view** brings them back.

---

## Save

**Save** stores the choices of the form (wind zone, checkboxes, temperatures, selected rules and
point) with the obstacle. The results themselves are not saved: when you reopen the dialog of an
obstacle with saved choices, the calculation runs again by itself.

:::{note}
**Report** and **Export** are shown in the dialog but are not available yet.
:::

---

## Troubleshooting

| Message | Cause |
|---|---|
| *Cannot calculate conformity: obstacle type has no conformity configuration* | The catalog has no conformity setting for this type of obstacle. |
| *Calculation failed: …* | The engine could not calculate. The message tells why, for example when no wind zone is selected. |

The rules, the distances, the climatic conditions and the wind zones are part of the application
catalog. To change them, see the
{doc}`developer guide <../developer_guide/configure_conformity>`.

---

## Related documentation

- {doc}`Obstacles <obstacles>` — altitude types and chart display of the obstacles.
- {doc}`Free positioning <plot/free-positioning>` — place obstacles on the chart.
