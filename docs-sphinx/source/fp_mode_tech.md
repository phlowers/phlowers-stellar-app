# Free-positioning mode — technical design

Technical companion to [fp_mode_features.md](fp_mode_features.md). It documents how
the free-positioning (fp) behaviour is implemented so the two documents stay in
sync when requirements change.

## Component architecture

Free-positioning is built around **one centralized plot component and four thin
wrappers**, one per concerned tab:

- `FreePositioningPlotComponent` — the shared, centralized plot used by every tab.
  It owns the plot rendering and interaction logic.
- Four wrappers that adapt the shared plot to their tab context:
  - `ObstacleFreePositioningComponent`
  - `FloorFreePositioningComponent`
  - `LoadsFreePositioningComponent`
  - `DistanceFreePositioningComponent`

The wrappers are rendered from
`studio-page.component.html` inside the free-positioning `@switch`, one `@case`
per `freePositioningSource` (`obstacle`, `floor`, `loads`, `distance`), with
`@default` falling back to `<app-studio>`.

### Point data reactivity

Every wrapper exposes its plot points as a `computed`:

```ts
readonly points = computed(() => this.dataService.getPoints(this.frozenSpan(), '<category>'));
```

A `computed` only re-evaluates when a **signal it reads** changes. In
`FreePositioningDataService.buildAggregateParams`, the inputs must therefore come
from signal-backed state — not from raw Angular form values such as
`form.get('positions').value`, `group.value`, or `form.value`. Those are plain
objects/arrays, so updating the form does not notify the `computed` that its
input changed and the markers stay stale after a free-positioning click.
Concretely:

- Distance reads `distanceMeasuringService.positions()` (a `toSignal` of the
  form value changes).
- Obstacle reads `obstacleFormService.positionsSnapshot()` (a `toSignal` of the
  positions `FormArray`), **not** `form.get('positions').value`.
- Floor reads `floorFormService.pointsView()` (a `computed` backed by the
  reactive point snapshot), **not** the raw `FormArray.value`. It also reads
  `floorFormService.referenceSupportValue()` (a `toSignal` of the reference
  support control) so flipping the reference support re-renders the floor
  markers mirrored — see *Reference support mirroring* below.

This keeps all tabs behaving identically: clicking the left (x·z / profile) plot
fills and shows a point's along-span and altitude, and clicking the right (y·z /
face) plot fills its lateral coordinate.

### Form field reactivity (`OnPush` templates)

Reading a signal in `FreePositioningDataService` is enough to refresh the *plot
markers*, but each tab's own form fields are a separate `OnPush` component tree
with its own reactivity requirements. `ObstaclesFormComponent`'s point inputs are
bound with `[value]="..."` (not `formControlName`) to handle intermediate typing
states such as a lone `-` — see `onPositionInput` / `onPositionBlur`. A `[value]`
binding only re-renders when Angular re-checks the component, and an `OnPush`
component is only re-checked when it reads a **signal** that changed (or gets an
event/`@Input`). A free-positioning click calls `positionGroup.patchValue(...)`,
which changes no signal read by `ObstaclesFormComponent`'s template, so the field
stayed stale until an unrelated re-render (e.g. selecting another point).

The fix: bind the point inputs to the reactive
`obstacleFormService.positionsSnapshot()` signal instead of the FormArray's
plain `.value`:

```html
[value]="obstacleFormService.positionsSnapshot()[$index]?.z"
```

Reading that signal in the template makes `ObstaclesFormComponent` mark itself
dirty whenever a position changes, refreshing the fields immediately after a
free-positioning click — without touching the `[value]` + `onPositionInput` /
`onPositionBlur` typing-state handling. The distance tab never had this problem
because it binds `[formControl]`, whose `ControlValueAccessor` writes the DOM
directly on `patchValue`, independent of change detection.

### Reference support mirroring

The plot's x-axis is always measured from the **left support** of the frozen
span (`litData` is re-zeroed there), while floor points and load positions are
stored **relative to their reference support**, which can be LEFT or RIGHT. The
two frames are bridged by a shared pure helper in
`free-positioning-data.helpers.ts`, generalizing the conversion the loads tab
already applied inline in `LoadFormsService.setLoadPosition`:

```ts
export const mirrorPositionForReferenceSupport = (
  position: number,
  spanLength: number | null | undefined,
  referenceSupport: 'LEFT' | 'RIGHT' | null | undefined
): number =>
  referenceSupport === 'RIGHT' && typeof spanLength === 'number' && !Number.isNaN(spanLength)
    ? spanLength - position
    : position;
```

The conversion is **self-inverse**, so the same function serves both directions:

- **Display (form → plot)** — `buildFloorPoints` mirrors
  `distanceToRefSupport` to the plot abscissa: active form points use the form's
  `floorReferenceSupport` (passed through `AggregatePointsParams` from the
  signal-backed `floorFormService.referenceSupportValue()`), saved-floor points
  use the floor's own stored `referenceSupport`. Flipping the reference support
  select therefore re-renders the markers in place instead of making them jump.
- **Placement (plot click → form)** — `FloorFreePositioningComponent.onPlacement`
  mirrors the left-measured click abscissa back into the reference-relative
  `distanceToRefSupport` (span length taken from
  `floorFormService.spanSupports().spanLength`) before calling
  `setFreePointPosition`, exactly like the loads tab does in
  `LoadFormsService.setLoadPosition`.

The span length comes from the left support's `spanLength` field
(`supports[frozenSpan].spanLength`), not from `litData`, so the mirroring works
even before any worker output is available.

## The frozen span

The frozen span is a single source of truth held by `PlotOptionsService`:

- `readonly frozenSpan = signal<number>(0);`
- It is **captured once** when fp mode is enabled, inside
  `setFreePositioningMode(enabled, source, spanIndex?)`:

  ```ts
  if (enabled) {
    const snapshot = spanIndex ?? untracked(() => this.plotOptions().startSupport);
    this.frozenSpan.set(snapshot);
  }
  ```

  The owning tab passes the span index currently selected in its dropdown
  (`spanIndex`); the plot's `startSupport` is only used as a fallback. This
  matters because selecting a span in a tab dropdown does **not** move the plot
  (only the zoom button writes `startSupport`), so freezing `startSupport` would
  otherwise capture a stale span. Using `untracked` guarantees the capture is a
  one-off snapshot with no reactive dependency on `plotOptions()`.

  Capturing the frozen span is not enough on its own: the plot's x-coordinates
  come from `litData`, which Python re-zeroes at the **left support of the
  projected range** in `refreshProjection()`. If fp mode is entered while the
  studio is projected on a different span, `litData` keeps the old x-origin and
  the frozen span's left support (the *reference support*) is drawn at a non-zero
  x. To avoid this, `FreePositioningToggleComponent.onChange` enables the mode —
  which snapshots the current view and camera (see *View and camera restore*
  below) — and **then** reprojects on the frozen span:

  ```ts
  if (enabled) {
    this.plotOptionsService.setFreePositioningMode(true, this.source(), this.spanIndex());
    const span = this.spanIndex() ?? this.plotOptionsService.plotOptions().startSupport;
    this.plotService.plotOptionsChange({ view: '2d', startSupport: span, endSupport: span + 1 });
    return;
  }
  ```

  The mode is enabled **first** so `setFreePositioningMode` captures the pre-fp
  view and camera before the 2D reprojection overwrites them.
  `plotService.plotOptionsChange` forces a 2D single-span view **and** triggers
  `refreshProjection()`, so `litData` is recomputed with the frozen span's left
  support at `x = 0`. The reprojection lives in the toggle (not in
  `PlotOptionsService`) because it needs `PlotService`, which would be a circular
  dependency inside `PlotOptionsService`.

- It is reset to `0` in `reset()`.
- Every wrapper reads it directly, with **no reactivity** of its own:

  ```ts
  readonly frozenSpan = this.plotOptionsService.frozenSpan;
  ```

`LoadFormsService.getActiveSpanIndex()` also returns
`this.plotOptionsService.frozenSpan()` instead of resolving the span from tab
form fields.

### View and camera restore

Entering fp mode forces a 2D single-span view, discarding the view the user had.
To give it back on exit, `PlotOptionsService.setFreePositioningMode(true, ...)`
snapshots the current state into the `freePositioningSavedView` signal
**before** the toggle forces the reprojection:

- `plotOptions` — a shallow copy of the full options object (view, side, support
  window, invert);
- `camera` — the live 3D camera read from the Plotly DOM via `getCamera()`
  (`null` when the previous view had no 3D scene).

The restore is applied by a single generic effect in `PlotService` — not per
tab — so it fires no matter which control turned the mode off (toggle, tab
change, wrapper `ngOnDestroy`, auto-exit effect): when `isFreePositioningMode()`
is `false` while a snapshot exists, the effect clears the snapshot, stores the
camera in `pendingCameraRestore` (consumed by `SectionPlotComponent` after the
first 3D render, like the back-navigation restore), and calls
`plotService.plotOptionsChange({ ...savedView.plotOptions })`, which also
refreshes the projection so `litData` matches the restored support window. The
effect lives in `PlotService` because restoring the support window needs
`refreshProjection()`, which `PlotOptionsService` cannot reach (circular
dependency). `PlotOptionsService.reset()` clears the snapshot so leaving the
studio never restores a stale view.

### Removed reactive machinery

The previous implementation resolved the span reactively from each tab's form
fields and wrote it back through an effect. This has been removed:

- The `resolveFrozenSpan` helper (in `free-positioning-data.helpers.ts`) was
  deleted.
- The `syncFrozenSpan(span)` method on `PlotOptionsService` was deleted.
- Wrappers no longer inject `PlotSpanService` or use `effect` / `toSignal` to
  derive the frozen span.

## Freezing the controls

All span-changing controls are disabled while fp mode is on, driven by
`plotOptionsService.isFreePositioningMode()`:

- Zoom buttons: `[disabled]="... || plotOptionsService.isFreePositioningMode()"`.
- Per-tab span selectors: `[disabled]="plotOptionsService.isFreePositioningMode()"`
  in `floor.component.html`, `obstaclesForm.component.html`,
  `distance-measuring.component.html`, `load-marking.component.html`.
- Global span navigation, span-amount select and slider (studio-page) and the
  3D/2D selector, profile/face side selector and invert toggle (top-toolbar) were
  already bound to `isFreePositioningMode()`.

Additionally, `ObstacleFreePositioningComponent` disables and forces three
obstacle form controls to standardized FP values in its constructor:

- `referenceSupport` → `LEFT`
- `altitudeType` → `absolute`
- `lateralDistanceType` → `SPAN_AXIS`

Because no coordinate transformation exists between these frames, the constructor
**first compares the current form values against the forced frame**. On any
mismatch it emits a warning through `NotificationService.warning(...)` with the
transloco key `studio.obstacles-form.free-positioning-forced-frame-warning`
(exported as `OBSTACLE_FP_FORCED_FRAME_WARNING_KEY` from
`obstacle-free-positioning.component.constantes.ts`), telling the user that the
existing coordinates may be misinterpreted. The warning is informational only:
the values are still forced and locked, and existing point coordinates are
reinterpreted — not converted — in the new frame.

When saving, `ObstacleFormService.buildObstacleFromForm()` uses
`form.getRawValue()` instead of `form.value` to include these disabled controls,
so the obstacle is saved with the FP-forced values intact (not dropped by
Angular's form.value, which excludes disabled controls). This ensures the saved
obstacle has valid metadata for the Python worker's coordinate transformation.

Components that gained the binding (`distance-measuring`, `load-marking`) now
inject `PlotOptionsService` as a public readonly field for template access.

## Enabling the toggle

The `app-free-positioning-toggle` `[disabled]` input gates when fp mode can be
turned on:

- Loads / distance: disabled while no span is selected
  (`!spanSelectValue()` / `!service.selectedSupportUuid()`).
- Floor / obstacle: additionally require at least one point, via a
  `hasEditablePoints` computed on the tab form service
  (`!spanValue() || !hasEditablePoints()` for floor, and
  `!supportUuid || !hasEditablePoints()` for obstacle). `ObstacleFormService`
  exposes `hasEditablePoints = computed(() => positionsSnapshot().length > 0)`,
  mirroring `FloorFormService`.
The toggle also carries a `[spanIndex]` input: each tab binds a
`selectedSpanIndex` computed that maps its selected span UUID to an index via
`PlotSpanService.getSupportIndex` (`null` when nothing is selected). The toggle
forwards it to `setFreePositioningMode`, so the frozen span is exactly the span
selected in the tab, not the plot's last-zoomed span. Distance exposes the
computed on `DistanceMeasuringService`; the other tabs expose it on their
component.

Because the toggle is disabled while `!hasEditablePoints()`, deleting the last
point while fp mode is on would lock the user in the mode: the switch is the
only in-tab way out, and it is disabled. To avoid this, both
`FloorComponent` and `ObstaclesFormComponent` carry an auto-exit effect that
turns the mode off when the tab's `hasEditablePoints()` flips to `false` while
that tab owns the session:

```ts
private readonly clearFreePositioningWhenNoPointsEffect = effect(() => {
  const hasEditablePoints = this.<tab>FormService.hasEditablePoints();
  const source = this.plotOptionsService.freePositioningSource();
  if (!hasEditablePoints && source === '<tab>') {
    untracked(() => this.plotOptionsService.setFreePositioningMode(false, '<tab>'));
  }
});
```

The `freePositioningSource()` check guarantees the effect never disturbs a
session owned by another tab (e.g. the obstacle tab deleting its last point
while floor fp mode is on leaves it untouched).

## History / rebase note

A broken rebase on `refactor/free-positioning/new_dev` previously left the branch
in an inconsistent state: the conflict resolution kept the legacy monolithic
`FreePositioningComponent` layout while other files already used the new per-tab
wrappers. This reverted the layout and broke the point reactivity. The merge was
completed by adopting the new per-tab components in `studio-page` (`.ts` imports
and `.html` cases) while keeping `onLoadTabChange()` / `exitFreePositioningMode()`
which the template still relies on.

The legacy `FreePositioningComponent` monolith is now unused and is logged for
review in `deadcode.md`.
