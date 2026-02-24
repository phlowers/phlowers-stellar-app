# Plot Data Object Creation

`createPlotData.ts` and `createPlotDataObject.ts` are the two files that turn 3D coordinate arrays into Plotly.js data objects for rendering. They handle three types of objects:
- **Spans** (blue) - main structural elements
- **Supports** (indigo) - support structures with numbered labels
- **Insulators** (red) - insulator elements

## How It Works

### `createPlotData.ts`

This is the entry point. It takes section output data and plot options, then:
1. Loops through spans, supports, and insulators
2. Calls `createDataObject()` for each type
3. Flattens everything into one array of Plotly data objects

```typescript
const plotData = createPlotData(sectionData, {
  view: '3d',
  side: 'profile',
  startSupport: 0,
  endSupport: 5,
  invert: false
});
```

### `createPlotDataObject.ts`

This does the actual work of transforming coordinates into Plotly objects.

**`createDataObject()`** - The main function:
- Slices the data based on support indices (spans exclude the end, supports/insulators include it)
- Extracts x, y, z coordinates from each point
- Transforms coordinates based on view:
  - **3D**: Uses x, y, z directly with `scatter3d`
  - **2D Profile**: Projects onto XZ plane (x→x, z→z, y→y)
  - **2D Face**: Projects onto YZ plane (y→x, z→z, swaps axes)
- Applies styling (colors, line width, markers, text labels)

**Helper functions:**
- `getLine()` - Returns color (blue/indigo/red), dash style, and width (thicker in 3D)
- `getMode()` - Returns `'text+lines+markers'` for supports, `'lines+markers'` for others
- `getText()` - Labels supports with their number (1-indexed) on the highest point
- `getMarker()` - Sets marker sizes (varies by type and view)

## Quick Reference

**Coordinate transformations:**
- 3D: `x, y, z` → `x, y, z` (scatter3d)
- 2D Profile: `x, y, z` → `x, z, y` (scatter)
- 2D Face: `x, y, z` → `y, z, y` (scatter, swaps x/y)

**Styling:**
- Spans: dodgerblue, width 8 (3D) or 4 (2D)
- Supports: indigo, width 8 (3D) or 4 (2D), shows numbered labels
- Insulators: red, width 8 (3D) or 4 (2D)

**Note:** Support indices are 0-based internally but displayed as 1-based in labels.

## Style Configuration Summary

### Lines

All line styles use `dash: 'solid'`. Line width varies by view mode (thicker in 3D):

| Type | Color | Width (3D) | Width (2D) |
|------|-------|------------|------------|
| **Spans** | `dodgerblue` | 8 | 4 |
| **Supports** | `indigo` | 8 | 4 |
| **Insulators** | `red` | 8 | 4 |
| **Default** | `black` | 8 | 4 |

### Markers

Marker sizes vary by object type and view mode:

| Type | Size (3D) | Size (2D) |
|------|-----------|-----------|
| **Spans** | 3 | 5 |
| **Supports** | 3 | 4 |
| **Insulators** | 4 | 6 |
| **Default** | 3 | 3 |

### Text

- **Mode**: 
  - Supports: `'text+lines+markers'` (displays text labels)
  - All others: `'lines+markers'` (no text labels)
  
- **Text Labels** (Supports only):
  - Display: Support number (1-indexed) on the highest point (maximum z-coordinate)
  - Position: `'top center'` (applied to all data objects)
  - Logic: Only the point with the highest z-value in each support gets labeled; all other points have empty strings

- **Text Position**: `'top center'` (applied globally to all data objects)
