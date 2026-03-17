# Scale View Component

## Summary

This document describes the `ScaleViewComponent` located in the Studio top-toolbar. It controls plot resolution via a slider and a numeric input, synchronizes both controls, persists and applies resolution changes through `PlotService`, and refreshes the plot projection. This file lists the component behavior, the impacted `PlotService` API surface, debugging tips and suggested tests for developers.

## Component location

`src/app/features/studio/core/presentation/components/top-toolbar/scale-view/scale-view.component.ts`

## Purpose

- Provide a popover UI with a slider and numeric input to change the plot resolution.
- Keep slider and input synchronized using Angular `signal`/`effect` and reactive forms.
- Persist resolution changes and apply them to the plotting engine, then refresh the projection.

## Key behaviors

- Controls
  - `sliderControl` (FormControl<number>) — slider for resolution.
  - `pointsControl` (FormControl<number>) — numeric input for points count.
  - `formScaleView` — form group containing `scale`, `sliderPointsCount`, `pointsCount`.

- Signals / Effects
  - `sliderValue` and `pointsCountValue` are created with `toSignal(...)` from `valueChanges`.
  - Effects synchronize slider -> input and input -> slider; they call `PlotService.setResolution(...)` when changes originate from the UI.
  - An effect keeps both controls in sync with `PlotService.resolution()` when the service changes the resolution externally.

- Validation flow (`onValidate()`)
  1. Toggle the popover closed.
  2. Read `resolution` from `pointsControl` and `scale` from the form.
  3. Call `PlotService.setResolution(resolution)`.
  4. Await `PlotService.applyResolution(resolution)`.
  5. Determine axis norms from `scaleNormsMap` and call `PlotService.setAxesNorms(norms)`.
  6. Await `PlotService.refreshProjection()`.

## Scale norms

The component defines `scaleNormsMap`:

- `plan` → `{ x: 0.2, y: 1, z: 1, aspectMode: 'manual' }`
- `geo` → `{ x: 1, y: 1, z: 1, aspectMode: 'manual' }`
- `celeste` → `{ x: 1, y: 1, z: 0.5, aspectMode: 'manual' }`
- `auto` → `{ x: 1, y: 1, z: 1, aspectMode: 'data' }`

## Impacted service: `PlotService`

Verify these methods exist and behave as expected when debugging or writing tests:

- `maxResolution(): number`
  - Used by the component as `scaleMax` to bound the slider value. This value is initialized from the Python worker's `RESOLUTION` constant (100) via the `getConfig` task.
- `resolution(): number`
  - Returns the current resolution; the component reads this value to initialize and to remain synchronized.
  - When restored from localStorage, the value is clamped to `MIN_RESOLUTION` (25). Once `maxResolution` is loaded from the worker, the resolution is re-clamped if it exceeds the maximum.
- `setResolution(value: number): void`
  - Persist the requested resolution (local state, storage or engine configuration).
  - Internally normalizes the value using `normalizeResolution()` to clamp it between `MIN_RESOLUTION` (25) and `maxResolution()`.
- `applyResolution(value: number): Promise<void>`
  - Apply the resolution to the plotting engine. The component awaits this in `onValidate()`.
- `setAxesNorms(norms: {x:number,y:number,z:number,aspectMode:string}): void`
  - Apply axis normalization presets computed from `scaleNormsMap`.
- `refreshProjection(): Promise<void>`
  - Recompute or redraw the plot projection; awaited by `onValidate()`.

## Resolution bounds

- **Minimum**: 25 (enforced in `PlotService.MIN_RESOLUTION` and `ScaleViewComponent.scaleMin`)
- **Maximum**: Loaded dynamically from Python worker's `RESOLUTION` constant (default: 100)
- **Default**: 100 (`DEFAULT_RESOLUTION` in `PlotService`)
- Stored values from localStorage are clamped to these bounds on load and after worker initialization to prevent inconsistent control state.

## Debugging guide

When controls are out of sync or the plot does not update after changes, follow these steps:

1. Check `PlotService.resolution()` — if it differs from controls, inspect the persistence layer or initialization sequence.
2. Ensure `sliderValue` and `pointsCountValue` receive `valueChanges` events. If `valueChanges` are missing, check for `emitEvent: false` usages elsewhere.
3. Confirm `setResolution(...)` is invoked exactly once per intended user change. The component uses `emitEvent: false` when programmatically updating the paired control to avoid cycles.
4. Inspect `applyResolution(...)` and `refreshProjection()` for errors or long-running tasks. Add temporary logging to detect promise rejections or delays.
5. If axis norms appear incorrect after validation, verify the `scale` value from the form and the `scaleNormsMap` mapping.

## Suggested unit tests

- Mock `PlotService` and assert the following:
  - Slider -> input synchronization triggers `setResolution` with the new value.
  - Input -> slider synchronization triggers `setResolution` with the new value.
  - `onValidate()` calls `applyResolution`, `setAxesNorms` with the right norms and then `refreshProjection`.
  - The component updates controls when `PlotService.resolution()` changes (effect keeps them in sync).

## Integration / E2E suggestions

- Open the popover, change resolution via slider and input, click Apply, verify the visible plot updates accordingly.

## Where to look in code

- Component: `src/app/features/studio/core/presentation/components/top-toolbar/scale-view/scale-view.component.ts`
- Plot service: search for `class PlotService` under `src/app` to find its implementation and tests/mocks.

## Notes for reviewers

- Component uses Angular standalone component imports and PrimeNG components.
- Form controls are created with `nonNullable: true`; tests should initialize numeric values accordingly.

---

End of document.
