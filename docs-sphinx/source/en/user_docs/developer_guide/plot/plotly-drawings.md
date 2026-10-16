# Plotly drawings constants

`PlotlyDrawings` (`src/app/shared/constants/plotly-drawings.constantes.ts`) is the **single source** for
everything static that the Plotly plots draw: colors, FontAwesome icons, glyphs, marker symbols, sizes, line widths
and styles, opacities and pixel offsets.

The goal is that the look of the app's plots is changed in one place, and that no plot helper holds a hard-coded
`'#2563eb'` or `size: 14` of its own.

---

## What it is

A single `as const` object, grouped by **drawn object** (`span`, `support`, `insulator`, `loadPunctual`,
`cableModification`, `cutStrands`, `obstacle`, `floor`, `distance`, `freePositioning`, `conformity`, `supportPlot`,
…), plus a `plot` group for what every plot shares (font, backgrounds, grid).

```typescript
import { PlotlyDrawings } from '@shared/constants/plotly-drawings.constantes';

const trace = {
  line: {
    color: PlotlyDrawings.distance.color,
    width: PlotlyDrawings.distance.lineWidth[view]
  }
};
```

Read it directly where it is needed. Do not re-export it through an intermediate `*.constantes.ts` file.

---

## Conventions

- **Per view sizes**: a size or width drawn in the section plot is given for each view, `{ '2d': …, '3d': … }`, and
  read with `[view]`. A plot that only exists in one view (free positioning and conformity: 2D, support plot: 3D) uses
  plain numbers.
- **Selection looks**: a drawing whose look changes with the selection declares `unselected` and `selected`. An object
  made of several points (obstacle, floor) also declares `inactivePoint`, the look of the other points of the selected
  object. The icons (loads, cable modification, cut strands) only declare `unselected`.
- **Pixels, not data units**: offsets such as `arrowYOffset` or `cutStrands.offsetY` are in pixels, so the gap stays
  the same at any zoom level.
- **Comment the why**: when a value looks arbitrary (a 40 px gap between two icons, an opacity used instead of an
  alpha), a short comment next to it explains the constraint.

---

## Adding or changing a drawing

1. **Change a look**: edit the value in `PlotlyDrawings`. Nothing else should need to change.
2. **Draw a new object**: add a group named after the object, following the conventions above, then read it from the
   helper that builds the trace or the annotation.
3. **Need a computed value** (e.g. `getCutStrandsLineLength`, derived from the icon size and its padding): keep the
   raw numbers in `PlotlyDrawings` and put the computation in a function that reads them. Do not copy the numbers.
4. **Tests**: assert against `PlotlyDrawings` rather than repeating its values, so a restyle does not break specs.

---

## Pitfalls

- **3D transparency**: `scatter3d` washes out `rgba()` colors. In the 3D view, use an opaque color and the trace
  `opacity`, and never stack both. See `createShadowDataObject` for the span shadow.
- **Font**: `plot.fontFamily` is shared by every text. The FontAwesome icons are the only ones to override the family
  (`clickableIconAnnotation.fontFamily`). The layout base that applies it is `getPlotlyBaseLayout()`
  (`src/app/shared/constants/plotly-base-layout.constantes.ts`); spread it first in each plot layout.
- **Layouts are mutable**: Plotly modifies the layout object it is given in place. If two plots share a nested object
  (`font`, `xaxis`…), changing one plot changes the other. Always build the layout with `getPlotlyBaseLayout()`, which
  returns new objects on every call, rather than spreading a shared constant (a spread only copies the top level).
- **Not in here**: the conformity rule zone colors come from the catalog json config, not from `PlotlyDrawings`.
