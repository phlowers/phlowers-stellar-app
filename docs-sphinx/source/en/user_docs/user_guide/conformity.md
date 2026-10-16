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

When the obstacle has several points, choose the one to check in **Obstacle's point**. The
choice is mandatory to calculate.

:::{note}
The calculation measures the distances from the **selected point**, and the graph shows its
position as *"<obstacle name> point N"*. To check another point, select it and calculate again.
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
| **Cable altitude** | Altitude of the cable in the case, in the graph. |
| **Cable line axis distance** | Position of the cable in the case, as a distance to the line axis, in the graph. |
| **Distance to comply** | The distance required by the rule, at the electric tension of the study. |
| **Compliance altitude** | *Overhang* only. Vertical gap between the obstacle and the cable in the overhang case, minus the distance to comply. A negative value means the obstacle is too close **or above the cable**. |
| **Compliance line axis distance** | *Lateral* only. Distance between the obstacle and the closest cable position of the lateral side (both wind directions and intermediate positions), minus the distance to comply. A negative value means the obstacle is too close. |
| **Conformity compliance** | The verdict for the rule: **Yes**, **No** or **Unknown**. |

A cell is empty when the value does not apply.

#### Minimum distance case

For the `cable_track` conformity plot, a **Minimum distance case** block adds, for the overhang
and the lateral columns, the **Temperature** (°C), the **Wind pressure** (Pa) and the
**Minimal distance** (m).

These values describe the **closest cable position** to the obstacle. Each rule moves the cable
through several scenarios, and each scenario gives one cable position in the graph:

- *overhang* column: the overhang position;
- *lateral* column: the lateral position in both wind directions and the intermediate positions
  between them.

For each column, the position closest to the obstacle is kept. **Minimal distance** is the
distance, in the graph, between the obstacle and this position, and **Temperature** and **Wind
pressure** are those of the scenario that produced it. It tells in which climatic condition the
obstacle is the closest to the cable. The wind pressure of the lateral column is negative when
the closest position is the one of the opposite wind direction.

### Conformity compliance

The verdict is computed from the two compliance values of the table, and depends on the
**conformity plot** of the obstacle type (see [Graph](#conformity-user-graph)):

- `cable_track`: the obstacle is compared to **radius zones**. The overhang value is the distance
  to the overhang position and the lateral value the distance to the closest lateral position,
  each minus its distance to comply. The verdict is **Yes** when the obstacle is outside the
  radius zones, that is when no value is negative (a value of 0 complies).
- `vegetation`: the obstacle is compared to a **rectangle**. The overhang value is the vertical
  gap to the overhang position and the lateral value the horizontal gap to the closest lateral
  position, each minus its distance to comply. The verdict is **No** only when the obstacle is
  **inside the rectangle**: too close vertically (or above the cable), and either too close
  laterally or horizontally between the lateral positions. Being too close on a single axis is
  not enough.
- `overhang`: the obstacle is compared to a **line**. Only the overhang value exists: the vertical
  gap to the overhang position minus the overhang distance. The verdict is **Yes** when it is not
  negative, so it is **No** when the obstacle is too close or above the cable.

The verdict is **Unknown** when the rule has no result: for example a rule you selected **after**
the calculation. Click **Calculate** again to include it.

The graph helps to see the situation; the **Conformity compliance** row is the reference result.

(conformity-user-graph)=
### Graph

Each rule has its own color. The obstacle is the dark **diamond**. The cable positions are
markers; hover a point to read its coordinates, scroll to zoom, and use the toolbar of the graph
to pan or save an image. Both axes have the same scale, so distances are not distorted.

The graph depends on the **conformity plot** of the obstacle type: `overhang`, `vegetation` or
`cable_track`. The assignment below is the one of the default catalog.

#### `overhang`: horizontal line

For obstacles with an overhang distance only. Each rule draws a horizontal line, at the altitude
of the cable position minus the overhang distance. The obstacle must stay **below** the line.

#### `vegetation`: trench (rectangle)

Used for vegetation. The cable positions of each rule (overhang, lateral, and lateral in the
opposite direction) are surrounded by a clearance zone, extended by the lateral distance on the
sides and by the overhang distance above and below. The border is drawn on the sides and the
bottom, like a trench.

#### `cable_track`: disks (radius zones)

Used for buildings and structures. Each position of the cable is the center of a **disk** whose
radius is the distance to respect. The positions are the overhang case, the lateral case in both
directions, and intermediate positions between them, which give the *track* of the cable. The
obstacle must stay **outside** all the disks. The disks are fully opaque.

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
