import { Dash, Data, PlotData } from 'plotly.js-dist-min';
import { PlotlyDrawings } from '@shared/constants/plotly-drawings.constantes';
import { PlotObjectsType, Side, View } from '@shared/types/plot.types';
import { Support } from '@shared/domain/models/support.model';
import { formatSupportNumber } from '@shared/helpers/formatSupportNumber';
import { SectionCoords } from '@services/worker_python/tasks/types';

/**
 * Returns line styling for a given plot object type and view mode.
 * @param type - The type of plot object.
 * @param view - The current view mode.
 * @returns Line color, dash style, and width configuration.
 */
export const getLine = (
  type: PlotObjectsType,
  view: View
): {
  color: string;
  dash: Dash;
  width: number;
} => {
  switch (type) {
    case 'spans':
      return { color: PlotlyDrawings.span.color, dash: 'solid', width: PlotlyDrawings.span.lineWidth[view] };
    case 'supports':
      return { color: PlotlyDrawings.support.color, dash: 'solid', width: PlotlyDrawings.support.lineWidth[view] };
    case 'insulators':
      return { color: PlotlyDrawings.insulator.color, dash: 'solid', width: PlotlyDrawings.insulator.lineWidth[view] };
    case 'virtual_supports':
      return {
        color: PlotlyDrawings.virtualSupport.color,
        dash: 'solid',
        width: PlotlyDrawings.virtualSupport.lineWidth[view]
      };
  }
};

const getMode = (type: PlotObjectsType): PlotData['mode'] => {
  if (type === 'supports') return 'text+lines+markers';
  return 'lines+markers';
};

const getText = (
  type: PlotObjectsType,
  points: number[][],
  support: Support | undefined,
  fallbackIndex: number
): string[] => {
  if (type !== 'supports') return [];
  const highestPointIndex = points.findIndex((point) => point[2] === Math.max(...points.map((p) => p[2])));
  const label = formatSupportNumber(support?.number || String(fallbackIndex));
  return points.map((_, index) => (index === highestPointIndex ? label : ''));
};

/** Marker size of a plot object type; the shadow traces reuse it. */
export const getMarker = (type: PlotObjectsType, view: View): PlotData['marker'] => {
  switch (type) {
    case 'spans':
      return { size: PlotlyDrawings.span.markerSize[view] };
    case 'supports':
      return { size: PlotlyDrawings.support.markerSize[view] };
    case 'insulators':
      return { size: PlotlyDrawings.insulator.markerSize[view] };
    case 'virtual_supports':
      return { size: PlotlyDrawings.virtualSupport.markerSize[view] };
  }
};

/** A Plotly `Data` object extended with an optional support UUID for identification.
 * @category Studio
 */
export type DataObject = Data & { supportUuid: string | undefined };

// One polyline as a trace, mapped to the axes of the view and side
const toDataObject = (
  points: number[][],
  type: PlotObjectsType,
  view: View,
  side: Side,
  text: string[],
  supportUuid: string | undefined
): DataObject => {
  const x = points.map((point) => point[0]);
  const y = points.map((point) => point[1]);
  const z = points.map((point) => point[2]);
  return {
    x: side === 'face' && view === '2d' ? y : x,
    z: view === '3d' ? z : y,
    y: view === '3d' ? y : z,
    type: view === '3d' ? 'scatter3d' : 'scatter',
    mode: getMode(type),
    line: getLine(type, view),
    textposition: 'top center',
    marker: getMarker(type, view),
    text,
    name: type,
    supportUuid
  };
};

/**
 * Creates an array of Plotly-compatible data objects from raw 3D coordinate arrays
 * for a specific section object type (spans, supports, or insulators).
 * Handles coordinate mapping based on the selected view and side.
 * @category Studio
 * @param data - Array of polyline coordinate arrays (`[x, y, z][][]`).
 * @param startSupport - Zero-based index of the first support to include.
 * @param endSupport - Zero-based index of the last support to include.
 * @param type - The section object type being rendered.
 * @param view - The rendering dimension (`'2d'` or `'3d'`).
 * @param side - The viewing side (`'profile'` or `'face'`).
 * @param supports - Optional array of support models to attach UUIDs.
 * @returns An array of `DataObject` entries.
 */
export const createDataObject = (
  data: number[][][],
  startSupport: number,
  endSupport: number,
  type: PlotObjectsType,
  view: View,
  side: Side,
  supports: Support[] = []
): DataObject[] => {
  const slidedData = data.slice(startSupport, type === 'spans' ? endSupport : endSupport + 1);
  return slidedData.map((points, index) =>
    toDataObject(
      points,
      type,
      view,
      side,
      getText(type, points, supports[startSupport + index], startSupport + index + 1),
      supports[startSupport + index]?.uuid
    )
  );
};

/**
 * Creates the Plotly data objects of the virtual supports (e.g. the crane of a cable span manipulation) and of
 * their insulators (e.g. the sling).
 *
 * @remarks
 * A virtual support stands inside a span: `virtual_supports_span_indices` gives the span of each one, and only the
 * spans currently visible are drawn (`startSupport` ≤ index < `endSupport`, like the span traces). The support is
 * drawn in its own `PlotlyDrawings.virtualSupport` look, without a number; its insulator keeps the insulator look.
 *
 * @category Studio
 * @param coords - The section coordinates computed by the engine.
 * @param startSupport - Zero-based index of the first support to include.
 * @param endSupport - Zero-based index of the last support to include.
 * @param view - The rendering dimension (`'2d'` or `'3d'`).
 * @param side - The viewing side (`'profile'` or `'face'`).
 * @returns The support then insulator data objects of each drawn virtual support.
 */
export const createVirtualSupportDataObjects = (
  coords: SectionCoords,
  startSupport: number,
  endSupport: number,
  view: View,
  side: Side
): DataObject[] =>
  (coords.virtual_supports_span_indices ?? []).flatMap((spanIndex, virtualIndex) => {
    if (spanIndex < startSupport || spanIndex >= endSupport) return [];
    const support = coords.virtual_supports?.[virtualIndex];
    const insulator = coords.virtual_insulators?.[virtualIndex];
    return [
      ...(support ? [toDataObject(support, 'virtual_supports', view, side, [], undefined)] : []),
      ...(insulator ? [toDataObject(insulator, 'insulators', view, side, [], undefined)] : [])
    ];
  });
