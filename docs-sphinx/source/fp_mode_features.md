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
- When the switch is turned **on**:
  - The span currently selected in the studio (the start support of the active
    span) is **captured once** and becomes the *frozen span* for the whole
    fp session.
  - The opened tab loads its data for that frozen span.
  - The plot displays that span and does not move.

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

On re-entry, the newly selected span is captured as the new frozen span.

## Leaving free-positioning mode

When the switch is turned **off**, all frozen controls become interactive again
and the studio returns to its normal reactive behaviour.
