# Obstacles

## Altitude: Absolute (NGF) vs Relative

Each obstacle point has a `z` coordinate whose interpretation depends on the **Altitude type** field.

- **Absolute (NGF)**
  - `z` is an absolute NGF altitude.
  - On charts (2D/3D), the point is placed at the entered NGF altitude.
  - Example: if `z = 50`, the point is at **50 NGF**, regardless of the support.

- **Relative (to support)**
  - `z` is a delta relative to the NGF altitude of the reference support.
  - The NGF altitude displayed/placed on charts is:

$$\text{altitudeNGF} = \text{altitudeSupportNGF} + z$$

  - Example: if the support is at **30 NGF** and `z = 20`, then the point is at **50 NGF**.

## Chart display

- Each point is rendered with:
  - a **marker** ("●") at the exact point level
  - a **label** (obstacle name) just above the marker
- There is **no** line/arrow between the point and the label.
- The **tooltip** (hover) is attached **only to the marker**, not to the label.

## Free positioning

The **Free positioning** mode allows placing a point by clicking on the chart.

- Exiting the mode by disabling the **Free positioning** toggle

See {doc}`Free positioning <plot/free-positioning>` for the full behaviour of the
mode (frozen span, frozen controls, view restore).

### Interaction with altitude

- In **Absolute (NGF)** mode: a click directly sets `z` to the clicked NGF altitude.
- In **Relative (to support)** mode: a click records `z` as a delta:

$$z = \text{clickedAltitudeNGF} - \text{altitudeSupportNGF}$$

The point remains displayed at the correct NGF level (support altitude + delta).

## Obstacles table

The **Obstacles table** lists the points of the section's obstacles with their distances to the
cable, and generates a PDF report of them.

### Opening the table

1. Open a study, then a section in the **Studio**.
2. In the toolbar, open the **Tables** menu, then choose **Obstacles table**.

### Filter and context

- **Span**: shows the obstacles of a single span. The first span of the section is selected by
  default; choose **All spans** to list the obstacles of the whole section.
- **Initial condition** and **Charge case**: recall the initial condition and the charge case
  selected in the Studio. The distances in the table match that state.

### Columns

The table has **one row per obstacle point**: an obstacle with three points takes three rows.

| Column | Content |
|---|---|
| **No.** | Row number. |
| **Obstacle name** | Name of the obstacle. |
| **Obstacle type** | Type of the obstacle, from the catalog. |
| **Span** | Span of the obstacle, named after its two supports (for example `AB12C - AB13C`). |
| **Reference support** | Support **Ref. support dist.** is measured from. |
| **Altitude type** | **Absolute (NGF)**, **Relative to support** or **Relative to cable attachment**. |
| **Lateral distance type** | Axis **Line axis dist.** is measured from: **Span axis** or **Line axis**. |
| **Point** | Number of the point within the obstacle. |
| **Altitude** | `z` coordinate of the point, in meters, interpreted according to the **Altitude type**. |
| **Ref. support dist.** | Distance to the reference support (`x` coordinate), in meters. |
| **Line axis dist.** | Lateral distance to the axis (`y` coordinate), in meters. |
| **Oblique** | Direct distance between the point and the cable, in meters. |
| **Vertical** | Vertical distance between the point and the cable, in meters. |
| **Horizontal** | Horizontal distance between the point and the cable, in meters. |

The **Oblique**, **Vertical** and **Horizontal** distances show "-" when they could not be
calculated for that point.

Click the **Obstacle name** header to sort the table by name. The number of rows per page
(10, 25, 50 or 100) is set above the table.

### PDF report

The **Report** button, at the bottom of the dialog, downloads the table as a PDF. It is disabled
while the table is empty, and shows a loading indicator while the distances are being calculated
or the report is being generated.

The report follows the table **as displayed**: same span filter and same sort order.

- **First page (portrait)**: the title "Obstacles Table Report", the date, then the
  **Study and section** cartouche (author, study, description, section, comment, initial
  condition, load case and its description).
- **Following pages (landscape)**: the **Obstacle points' table**. The table's columns become rows
  and each obstacle point a column, with at most 5 points per table. The **No.** column is left
  out. A text too long for its cell, such as an obstacle name, is cut after two lines and ends
  with "…".
- Each page is numbered ("Page 2 / 3").

The file is named `Obstacles Table Report_<section>_<load case>_<date> <time>.pdf`, for example
`Obstacles Table Report_Section A_Case 1_10-22-2026 14-35.pdf`.
