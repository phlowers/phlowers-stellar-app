---
applyTo: "src/app/shared/components/studio/section/**"
---

# Studio 3D section plot — modebar camera buttons

**`zoom3d` and `pan3d` MUST remain in `modeBarButtonsToRemove` and replaced by custom buttons.**

Native `zoom3d`/`pan3d` call `Plotly.relayout` → `updateFx()` internally, which resets the 3D
camera — regression bug #703. The custom replacements (`customZoom3d`, `customPan3d`) use
`setDragmodeDirect()` which bypasses `relayout` and preserves the camera.

**Never revert these to native Plotly buttons. Never call `Plotly.relayout` with `scene.dragmode`
in the section plot.**

File: `src/app/shared/components/studio/section/helpers/createPlot.ts` — `getConfig()`.

# Studio section plot — annotations

**Never build a clickable icon annotation manually.**
Always use `buildClickableIconAnnotation` from
`@shared/components/studio/section/helpers/createClickableIconAnnotation`.

```typescript
buildClickableIconAnnotation({
  x, y, z,
  icon: '&#xf5cd;',
  color: '#4A355A',
  arrowYOffset: -50,
  data: { type: 'myType', uuid: '...' }
});
```

**Exception:** obstacle annotations use Unicode markers + label (`showarrow: false`) — do NOT use
this helper.
