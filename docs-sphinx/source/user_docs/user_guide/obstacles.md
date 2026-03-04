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

- Exiting the mode:
  - by disabling the **Free positioning** toggle, or
  - by pressing **Escape**

### Interaction with altitude

- In **Absolute (NGF)** mode: a click directly sets `z` to the clicked NGF altitude.
- In **Relative (to support)** mode: a click records `z` as a delta:

$$z = \text{clickedAltitudeNGF} - \text{altitudeSupportNGF}$$

The point remains displayed at the correct NGF level (support altitude + delta).
