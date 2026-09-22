# Free-positioning mode — feature behaviour

This page describes, from a user point of view, how the **free-positioning (fp)**
mode behaves in the studio. It is intentionally written as a requirements document:
you can edit it to change the expected behaviour, and the implementation described
in [fp_mode_tech.md](fp_mode_tech.md) should follow it.

## Purpose

Free-positioning lets the user place elements (obstacles, floor, loads, distance
markers) on a **single, stable span** without the plot moving or the reference
span changing under their feet. To make this possible, the mode **freezes** the
current span and every control that could change it.

## Entering free-positioning mode

- Each concerned tab (obstacle, floor, loads, distance) exposes a free-positioning
  toggle switch.
- The toggle switch is **disabled until the tab has something to position**:
  - Loads and distance require a **span to be selected** (load span / distance
    support).
  - Obstacle and floor additionally require **at least one point to be added**
    (an obstacle point / a floor point). Selecting the span alone is not enough;
    the switch stays disabled until a point exists.
- When the switch is turned **on**:
  - The span currently **selected in the tab** (its span dropdown) is **captured
    once** and becomes the *frozen span* for the whole fp session. It does not
    matter which span the studio plot was last zoomed to — the tab selection wins.
  - The view the studio was in (3D / 2D, profile / face side, support window,
    invert, and the 3D camera position) is **recorded**, so it can be restored
    when the mode is turned off.
  - The plot is forced to a **2D single-span view** of the frozen span, whatever
    the previous view was.
  - The opened tab loads its data for that frozen span.
  - The plot displays that span and does not move.
- On the **obstacle** tab, free-positioning works in a single coordinate frame:
  **left reference support**, **absolute altitude type** and **span-axis lateral
  distance type**. When fp mode is turned on, these three obstacle form fields
  are forced to those values and disabled for the whole fp session.
  - If the obstacle form was using a different frame (right reference support,
    relative altitude, or another lateral distance type), a **warning** is shown
    on entry: *"Free positioning mode is only available with a left reference
    support, an absolute altitude type and a span-axis lateral distance type.
    The current obstacle settings differ, so the results may be inaccurate."*
  - The existing point coordinates are **not converted** between frames: they
    are reinterpreted in the forced frame. The user is expected to review the
    displayed positions after the warning.

## Reference support side (floor tab)

On the **floor** tab, the reference support can be LEFT or RIGHT and stays
**editable** while free-positioning is on:

- Floor points are stored as a *distance to the reference support*. The plot
  measures positions from the span's **left** support, so when the reference
  support is RIGHT the points are **mirrored along the span** (a point at
  distance `d` from the right support is drawn at `span length − d`).
- Switching the reference support **keeps the already placed points in place**:
  the same floor profile is simply read from the other end, both on the plot and
  in the form (which already mirrors the saved distances and reverses the point
  order).
- Clicking the plot while the reference support is RIGHT fills the point's
  distance **to the right support**, matching what the form displays.

## What is frozen while fp mode is on

While free-positioning is active, the following controls are **disabled** so that
nothing can change the reference span:

- Zoom buttons (return-to-span / zoom-to-span) on every concerned tab.
- The per-tab span selector (obstacle span, floor span, distance span, load span).
- The global span navigation (previous / next span buttons).
- The span-amount selector and the span slider.
- The 3D / 2D view selector.
- The profile / face side selector.
- The invert toggle.

There is **no reactive behaviour** that can silently change the selected span
while fp mode is on. The frozen span stays constant for the whole session.

## Changing the span

Because the span is frozen, the span cannot be changed while fp mode is on.
To work on a different span the user must:

1. Turn the free-positioning switch **off**.
2. Change the span using the normal span navigation / selector.
3. Turn the free-positioning switch **on** again.

On re-entry, the newly selected span is captured as the new frozen span (and the
current view is recorded again as the one to restore on exit).

## Leaving free-positioning mode

When the switch is turned **off**, all frozen controls become interactive again
and the studio returns to its normal reactive behaviour. The view recorded when
the mode was turned on — 3D / 2D, profile / face side, support window, invert,
and the 3D camera position — is **restored**, so the user lands back exactly
where they were before entering the mode. This happens whichever way the mode is
turned off (toggle switch, tab change, or automatic exit).

On the **obstacle** and **floor** tabs, fp mode also turns **off by itself** when
the last editable point is removed (the toggle switch flips back off). There is
no longer anything to position, and the switch would otherwise be left disabled
with no way to turn the mode off from that tab — the switch requires at least one
point to be interactive.
