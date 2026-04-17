# Plan: Always show all obstacles in Plotly

## TL;DR

Currently, obstacles are only visible in the Plotly plot when one is selected from the dropdown. The goal is to **always display all obstacles in black** (unselected state / "No selected" default), and display the **selected obstacle in red** (all its points) when chosen via the dropdown or clicked in the chart.

**Approach**: modify `createObstaclesAnnotations()` to iterate over **all** `litData.obstacles` instead of filtering to only the selected one.

---

## Steps

### Phase 1 — Modify obstacle annotation logic

1. **Update `createObstaclesAnnotations()` in `obstacles.ts`** (lines 108-162)
   - Remove the early return when `currentObstacleUuid` is `null` (keep only `!litData?.obstacles?.length`)
   - Replace the filter `[selectedLitObstacle]` with a full iteration over **all** `litData.obstacles`
   - Result: all obstacle annotations render regardless of selection state

2. **Update `getHighlightColor()` in `obstacles.ts`** (lines 92-99) — *parallel with step 1*
   - Current logic: red if both UUID AND pointIndex match, else black
   - **New logic**: red if `obstacleUuid === currentObstacleUuid` (all points of the selected obstacle), black otherwise
   - Remove the condition on `positionIndex === currentObstaclePointIndex`

3. **Verify click handler** in `section-plot.component.ts` (lines 213-230) — *depends on 1*
   - No change needed: `plotly_clickannotation` reads `data.obstacleUuid` from the annotation, since ALL obstacles now have a `data` payload, clicking any unselected obstacle correctly triggers selection

### Phase 2 — Update tests

4. **Update `createObstaclesAnnotations` tests** in `obstacles.spec.ts` — *depends on 1, 2*
   - Update test "should return empty array when no obstacle is selected" → must now return annotations for ALL obstacles in black
   - Update test "should only show the selected obstacle on the chart" → must now show ALL obstacles, selected in red, others in black
   - Add new test: "should render all obstacles in black when no obstacle is selected"
   - Add new test: "should render selected obstacle points all in red and others in black"
   - Adjust highlight test to reflect that ALL points of the selected obstacle are red

5. **Run tests and lint** — *depends on 4*
   - `npm run test`
   - `npm run lint`

---

## Relevant files

- `src/app/shared/components/studio/section/helpers/obstacles.ts` — **Main change**: `createObstaclesAnnotations()` and `getHighlightColor()`
- `src/app/shared/components/studio/section/helpers/obstacles.spec.ts` — **Update tests**
- `src/app/shared/components/studio/section/section-plot.component.ts` — **No change needed**, verify click handler
- `src/app/features/studio/core/presentation/pages/studio-page/studio-page.component.ts` — **No change needed**, dropdown logic stays the same

---

## Verification

1. `npm run test` — all obstacle-related tests pass
2. `npm run lint` — no errors
3. Manual: Open studio, load a section with 2+ obstacles, confirm all visible in black
4. Manual: Select obstacle A → A turns red (all points), B stays black
5. Manual: Click obstacle B annotation in chart → B turns red, A turns black, dropdown updates to B
6. Manual: Select "No selected" → all obstacles return to black

---

## Decisions

- **All points of a selected obstacle are red** (not just the active point) — for clearer visual distinction from unselected obstacles
- **"No selected" option stays** in the dropdown — useful for deselecting and hiding distance calculations
- **Distance lines**: when no obstacle is selected, distance calculations won't display (unchanged behavior)
- **Scope**: only the visual display of obstacles changes — no changes to dropdown options, distance calculations, or obstacle form behavior
