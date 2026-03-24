# Incoherent Load / Calculus Button Issues (PR #610)

:::{admonition} Branch
:class: note

`fixbug/610/Incoherent-load-when-calculus-button-is-used`
:::

This document covers all bugs identified and fixed in PR #610. Four separate issues were
addressed, three of which are bugs and one is a supporting UX improvement that enabled
the root cause of the incoherent load to be fully observable and fixed.

---

## Bug 1 — Load marker disappears when `loadWeight = 0`

:::{admonition} Bug
:class: warning

When a user sets `loadWeight = 0` for a punctual span load, the load marker disappears
from the Plotly chart even though `loadPosition` is non-zero. The marker should remain
visible to show that a load is positioned on the span.
:::

> Full detailed documentation: [load_weight_zero_marker_fix.md](load_weight_zero_marker_fix.md)

### Root cause chain

Three independent issues all caused by treating `0` as a falsy value:

**Issue 1a — Angular form `setValue({ emitEvent: false })` blocked signal updates**

File: `src/app/features/studio/loads/presentation/components/span/span.component.ts`

When `applySelectedLoadValues()` repopulated the form on span selection, it used
`{ emitEvent: false }` for `loadPosition` and `loadWeight`. Since `toSignal()` listens
to `valueChanges`, the signal stayed frozen at its previous value. When the user
subsequently typed `0`, Angular detected no change (`0 === 0`) and the `effect()` did
not fire.

```typescript
// Before — signals never updated on form population
this.form.controls.loadWeight.setValue(load.loadWeight, { emitEvent: false });

// After — signals stay in sync
this.form.controls.loadWeight.setValue(load.loadWeight);
```

**Issue 1b — Python: `engine.add_loads()` was gated on both arrays being non-zero**

File: `src/app/core/services/worker_python/tasks/python-scripts/functions.py`

```python
# Before — skipped load registration entirely if any value was 0
if (load_position_meters != 0).any() and (load_mass != 0).any():
    engine.add_loads(load_position_meters, load_mass)
    plt_line = plt_line.generate_reset()

# After — always registers loads; stale loads from previous calculations are cleared
engine.add_loads(load_position_meters, load_mass)
plt_line = plt_line.generate_reset()
```

**Issue 1c — Python: `loadWeight = 0` caused `PlotEngine.get_loads_coords()` to return no entry**

The mechaphlowers `PlotEngine` does not return coordinates for a span when its registered
mass is exactly `0`. The fix replaces `0` with a tiny epsilon so the engine still
returns coordinates, allowing the marker to appear.

```python
# Before
load_weight_list_daN.append(span["loadWeight"])

# After — epsilon substitute so PlotEngine returns coordinates for this span
weight = span["loadWeight"]
load_weight_list_daN.append(weight if weight != 0 else 1e-6)
```

### Regression tests

File: `src/app/shared/components/studio/section/section-plot.component.spec.ts`

- `should include punctual load when loadWeight is 0 but loadPosition is non-zero`

---

## Bug 2 — `invert` option has no effect in 3D view

:::{admonition} Bug
:class: warning

Toggling the **Invert** switch in the toolbar correctly flips the 2D chart axis but has
no visible effect in 3D view.
:::

### Root cause

File: `src/app/shared/components/studio/section/helpers/createPlot.ts`

In `createScene()`, the function received the camera object as a direct reference to
Plotly's internal `_fullLayout.scene.camera`. It then **mutated that object in-place**
before calling `Plotly.react()`. Since Plotly compares the layout object to its previous
internal state by reference, it saw no difference and skipped the re-render.

Additionally, when the camera was `null` (first render), `normalCamera()` was used
without applying `invert`, so the initial render was always wrong when `invert` was
`true`.

```typescript
// Before — mutated the shared internal Plotly object; react() detected no change
if (plotParams.camera) {
  const y = Math.abs(plotParams.camera.eye?.y || 0);
  plotParams.camera.eye = {           // ← direct mutation of Plotly internals
    ...plotParams.camera.eye,
    y: plotParams.invert ? y : y * -1
  };
}
return {
  // ...
  camera: plotParams.camera ? plotParams.camera : { ...normalCamera() }
  //                                                ↑ invert never applied here
};

// After — creates a new camera object; react() detects the change
const baseCamera = plotParams.camera ?? normalCamera();  // invert applied to both cases
const y = Math.abs(baseCamera.eye?.y || 0);
const camera: Partial<Camera> = {
  ...baseCamera,
  eye: {
    ...baseCamera.eye,
    y: plotParams.invert ? y : y * -1   // ← new object, Plotly detects the change
  }
};
return {
  // ...
  camera
};
```

`normalCamera()` was also updated to include the `up` vector so the spread produces a
fully valid `Partial<Camera>`:

```typescript
const normalCamera = () => ({
  center: { x: 0, y: 0, z: 0 },
  eye:    { x: 0.02, y: -3.5, z: 0.2 },
  up:     { x: 0, y: 0, z: 1 }          // ← added
});
```

### Regression tests

File: `src/app/shared/components/studio/section/helpers/createPlot.spec.ts`,
block `describe('3D invert camera behaviour')`:

| Test | Description |
|---|---|
| `should set camera eye.y positive when invert is true and camera is null` | First render with `invert: true` → `eye.y > 0` |
| `should set camera eye.y negative when invert is false and camera is null` | First render with `invert: false` → `eye.y < 0` |
| `should set camera eye.y positive when invert is true and camera is provided` | Subsequent renders preserve direction |
| `should set camera eye.y negative when invert is false and camera is provided` | Subsequent renders preserve direction |
| `should not mutate the original camera object` | Guards against regression of direct mutation |

---

## Bug 3 — `spanAmountChoice` signal not updated when span selection changes programmatically

:::{admonition} Bug
:class: warning

When clicking a load annotation on the 3D chart jumped to a single-span view, the
`spanAmountChoice` signal (which drives the span selector UI) was not updated. The UI
showed the old selection ("all" / "double") while the plot showed a single span.
:::

### Root cause

File: `src/app/core/services/plot/plot.service.ts`

`plotOptionsChange()` updated `plotOptions` but never synchronised `spanAmountChoice`
when `startSupport` or `endSupport` were part of the incoming change. The signal was
only updated from user interaction on the span selector component, not from programmatic
calls (e.g. clicking an obstacle or load annotation on the chart).

```typescript
// Before — spanAmountChoice never updated from plotOptionsChange
plotOptionsChange(values: Partial<PlotOptions>) {
  const newOptions = { ...oldOptions, ...values };
  this.plotOptions.set(newOptions);
  this.refreshCamera();
  // ...
}

// After — spanAmountChoice kept in sync
plotOptionsChange(values: Partial<PlotOptions>) {
  const newOptions = { ...oldOptions, ...values };
  this.plotOptions.set(newOptions);
  if ('startSupport' in values || 'endSupport' in values) {
    const diff = Math.abs(newOptions.endSupport - newOptions.startSupport);
    this.spanAmountChoice.set(diff === 1 ? 'single' : diff === 2 ? 'double' : 'all');
  }
  this.refreshCamera();
  // ...
}
```

### Regression tests

File: `src/app/core/services/plot/plot.service.spec.ts`:

- `should set spanAmountChoice to single when diff is 1`
- `should set spanAmountChoice to double when diff is 2`
- `should set spanAmountChoice to all when diff is greater than 2`
- `should not change spanAmountChoice when only view changes`
- `should not change spanAmountChoice when only invert changes`

---

## Feature — Zoom to span button and span auto-selection from chart click

:::{admonition} UX improvement
:class: tip

This feature was added alongside the bug fixes to make the incoherent load scenario
fully observable and reproducible, and to improve the user workflow.
:::

### Changes

**`span.component.ts`** — `zoomToSpan()` method

A new `zoomToSpan()` button calls `plotService.plotOptionsChange()` directly to zoom
into the selected span, replacing the old implicit zoom on span selection.

**`span.component.ts`** — `externalSpanSelectionEffect`

An `effect()` reacts to `loadFormsService.selectedSpanSupportUuid` so that clicking a
span load annotation on the chart automatically selects the correct span in the Charges
panel.

**`createLoadAnnotations.ts`** — annotation `data` payload

Load annotations now embed the `supportUuid` in their `customdata` so that click events
on the chart can identify which span was clicked.

**`section-plot.component.ts`** — `addEventListenersToPlot`

Handles `plotly_clickannotation` for span load clicks: opens the Charges tab and sets
`selectedSpanSupportUuid` on `loadFormsService`.

### Regression tests

File: `src/app/shared/components/studio/section/section-plot.component.spec.ts`,
block `describe('addEventListenersToPlot — span load click')`:

- `should open Charges side tab and select span when span load annotation is clicked`
- `should set selectedSpanSupportUuid to the clicked support uuid`
- `should open Charges tab even when supportUuid is unknown`
- `should not process span load click when annotation data is absent`

File: `src/app/features/studio/loads/presentation/components/span/span.component.spec.ts`:

- `updates supports options when span is selected`
- `should not call plotOptionsChange when a signal read inside getSupportIndex changes`
- `zoomToSpan() calls plotOptionsChange with the correct span index`
- `zoomToSpan() does nothing when no span is selected`
