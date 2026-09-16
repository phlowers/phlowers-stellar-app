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
per `freePositioningSource` (`obstacle`, `floor`, `loads`), with `@default`
falling back to `<app-studio>`. The distance and floor cases are handled by their
respective wrappers as well.

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
- It is reset to `0` in `reset()`.
- Every wrapper reads it directly, with **no reactivity** of its own:

  ```ts
  readonly frozenSpan = this.plotOptionsService.frozenSpan;
  ```

`LoadFormsService.getActiveSpanIndex()` also returns
`this.plotOptionsService.frozenSpan()` instead of resolving the span from tab
form fields.

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
