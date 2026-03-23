# Load Marker Disappears When loadWeight = 0 (PR #610)

:::{admonition} Bug #610
:class: warning

When a user sets `loadWeight = 0` for a punctual span load, the load marker (icon) disappears
from the Plotly 3D/2D chart, even though the load position is non-zero. The marker should
remain visible to indicate the load is positioned on the span.
:::

## Context

The Studio feature allows configuring span loads (punctual charges and markings) via the
**Charge / Marking** panel. Each load is represented by a marker (FontAwesome icon) annotated
directly on the Plotly section chart at the computed load coordinates.

The full rendering pipeline is:

1. **Form input** → saves `SpanLoad` into `temporaryLoadData` (IndexedDB via Dexie)
2. **`section-plot.component.ts`** → filters which loads to display → passes to `createPlot()`
3. **`createLoadAnnotations.ts`** → looks up `loads_coords[spanIndex]` from Python output → creates Plotly annotation
4. **`functions.py` (`get_loads_coords`)** → mechaphlowers `PlotEngine.get_loads_coords()` → returns per-span coordinates for every registered load

## Root Cause Analysis

The bug manifests through a chain of three independent issues, all related to treating `0` as a
*falsy* value.

### Issue 1 — Angular form: `setValue({ emitEvent: false })` blocks signal update

**File**: `src/app/features/studio/loads/presentation/components/span/span.component.ts`

When `applySelectedLoadValues()` repopulated the form (on span selection), it used
`{ emitEvent: false }` for `loadPosition` and `loadWeight`. Since `toSignal()` listens to
`valueChanges`, the signal stayed frozen at its previous value (often `0`).

When the user subsequently typed `0`, Angular's signal detected no change (`0 === 0`) and the
`effect()` in `loadPositionEffect` / `loadWeightEffect` did not fire — the value was silently
ignored.

**Fix**: removed `{ emitEvent: false }` from both `setValue` calls so signals stay in sync.

```typescript
// Before — signals never updated on form population
this.form.controls.loadWeight.setValue(load.loadWeight ?? 0, { emitEvent: false });
this.form.controls.loadPosition.setValue(load.loadPosition ?? 0, { emitEvent: false });

// After — signals correctly receive the new value
this.form.controls.loadWeight.setValue(load.loadWeight ?? 0);
this.form.controls.loadPosition.setValue(load.loadPosition ?? 0);
```

### Issue 2 — `section-plot.component.ts`: `!!load.loadWeight` treats `0` as falsy

**File**: `src/app/shared/components/studio/section/section-plot.component.ts`

The `getSpanLoadsToDisplay()` method filtered loads with:

```typescript
// Before — excludes any load with loadWeight = 0
(load) => !!load && (!!load.loadWeight || load.type === LoadType.MARKING)
```

`!!0 === false`, so a punctual load with `loadWeight = 0` was always excluded from the array
passed to `createPlot()`, making the annotation impossible.

**Fix**: aligned the condition with the logic already present in `loads-table.component.ts`:

```typescript
// After — mirrors loads-table: show if weight OR position is non-zero
(load) =>
  !!load &&
  (load.type === LoadType.MARKING
    ? load.loadPosition !== 0
    : load.loadWeight !== 0 || load.loadPosition !== 0)
```

### Issue 3 — mechaphlowers `PlotEngine`: `get_loads_coords()` returns nothing for zero-mass loads (root cause)

**File**: `src/app/core/services/worker_python/tasks/python-scripts/functions.py`

Even after fixes 1 and 2, the marker still disappeared. The annotation in
`createLoadAnnotations.ts` requires:

```typescript
if (spanLoad && spanIndex + plotParams.startSupport in load_coords) { ... }
```

`loads_coords` is populated by `plt_line.get_loads_coords()` inside the mechaphlowers
`PlotEngine`. Inspection of the bytecode confirms that this method only registers spans where
`load_mass != 0`. When `loadWeight = 0`, no entry is written for that span index, so
`spanIndex in load_coords` is `false` and no annotation is created.

**Fix**: when `loadWeight = 0`, substitute a negligible epsilon (`1e-6 daN ≈ 1 µg`). This
value is physically irrelevant but forces `PlotEngine` to record the load position and return
coordinates.

```python
# Before — zero mass → no entry in loads_coords → no marker
load_weight_list_daN.append(span["loadWeight"])

# After — epsilon keeps the position registered without affecting tension/sag
weight = span["loadWeight"]
load_weight_list_daN.append(weight if weight != 0 else 1e-6)
```

:::{note}
The epsilon `1e-6 daN` is ~1 µg. The lightest realistic load in the domain is several kilograms,
so this value has no measurable impact on sag, tension, or any other computed output. It is
a purely cosmetic workaround for a limitation in the mechaphlowers `PlotEngine` API.

**TODO**: if mechaphlowers ever exposes a way to register a load position without a mass (e.g.,
a dedicated `register_load_position()` method), this epsilon should be replaced by that API call.
:::

### Issue 4 — `apply_span_loads()`: stale loads persist across successive `calculateLoad()` calls

**File**: `src/app/core/services/worker_python/tasks/python-scripts/functions.py`

The original guard:

```python
if (load_position_meters != 0).any() and (load_mass != 0).any():
    engine.add_loads(load_position_meters, load_mass)
    plt_line = plt_line.generate_reset()
```

prevented `engine.add_loads()` from being called when all masses were zero. If the user:

1. Called `calculateLoadCase()` with `loadWeight = 1` → loads applied to engine
2. Changed `loadWeight = 0` → called `calculateLoadCase()` again

The engine kept the old loads from step 1. `saveLoadCase()` did not have this problem because
it triggers `init_section`, which rebuilds the engine from scratch.

**Fix**: always call `engine.add_loads()` when span loads are provided, since `add_loads`
**replaces** (not accumulates) the loads on the engine:

```python
# Before
if (load_position_meters != 0).any() and (load_mass != 0).any():
    engine.add_loads(load_position_meters, load_mass)
    plt_line = plt_line.generate_reset()

# After
engine.add_loads(load_position_meters, load_mass)
plt_line = plt_line.generate_reset()
```

## Files Changed

| File | Change |
|------|--------|
| `src/app/features/studio/loads/presentation/components/span/span.component.ts` | Removed `{ emitEvent: false }` from `loadWeight` and `loadPosition` `setValue` calls |
| `src/app/shared/components/studio/section/section-plot.component.ts` | Fixed filter condition in `getSpanLoadsToDisplay()` |
| `src/app/shared/components/studio/section/section-plot.component.spec.ts` | Updated and extended tests for the new filter logic |
| `src/app/core/services/worker_python/tasks/python-scripts/functions.py` | `parse_span_loads()`: epsilon for zero weight; `apply_span_loads()`: always call `add_loads` |

## Behavior Before / After

| Scenario | Before | After |
|----------|--------|-------|
| `loadWeight = 1`, `loadPosition = 200` | ✅ Marker visible | ✅ Marker visible |
| `loadWeight = 0`, `loadPosition = 200` | ❌ Marker invisible | ✅ Marker visible |
| Calculate with `loadWeight=1` then calculate with `loadWeight=0` | ❌ Old load still applied | ✅ Load correctly reset |
| Type `0` in field after switching span | ❌ Value ignored (signal stale) | ✅ Value applied |
| `type = marking`, `loadPosition = 0` | ✅ Filtered out (no position) | ✅ Filtered out (no position) |
