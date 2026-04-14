import { Dash, Data, PlotData } from 'plotly.js-dist-min';
import { SPAN_COLOR } from './plot.constants';
import { PlotObjectsType, Side, View } from '@shared/types/plot.types';
import { Support } from '@shared/domain/models/support.model';
import { formatSupportNumber } from '@shared/helpers/formatSupportNumber';

/**
 * Returns line styling for a given plot object type and view mode.
 * @param type - The type of plot object.
 * @param view - The current view mode.
 * @returns Line color, dash style, and width configuration.
 */
const getLine = (
  type: PlotObjectsType,
  view: View
): {
  color: string;
  dash: Dash;
  width: number;
} => {
  switch (type) {
    case 'spans':
      return {
        color: SPAN_COLOR,
        dash: 'solid',
        width: view === '3d' ? 8 : 4
      };
    case 'supports':
      return { color: 'indigo', dash: 'solid', width: view === '3d' ? 8 : 4 };
    case 'insulators':
      return { color: 'red', dash: 'solid', width: view === '3d' ? 8 : 4 };
    default:
      return { color: 'black', dash: 'solid', width: view === '3d' ? 8 : 4 };
  }
};

const getMode = (type: PlotObjectsType): PlotData['mode'] => {
  if (type === 'supports') return 'text+lines+markers';
  return 'lines+markers';
};

const getText = (type: PlotObjectsType, points: number[][], support: Support | undefined): string[] => {
  if (type !== 'supports') return [];
  const highestPointIndex = points.findIndex((point) => point[2] === Math.max(...points.map((p) => p[2])));
  const label = formatSupportNumber(support?.number ?? null);
  return points.map((_, index) => (index === highestPointIndex ? label : ''));
};

const getMarker = (type: PlotObjectsType, view: View): PlotData['marker'] => {
  switch (type) {
    case 'spans':
      return { size: view === '3d' ? 3 : 5 };
    case 'supports':
      return { size: view === '3d' ? 3 : 4 };
    case 'insulators':
      return { size: view === '3d' ? 4 : 6 };
    default:
      return { size: 3 };
  }
};

/** A Plotly `Data` object extended with an optional support UUID for identification.
 * @category Studio
 */
export type DataObject = Data & { supportUuid: string | undefined };

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
  return slidedData.map((points, index) => {
    const x = points.map((point) => point[0]);
    const y = points.map((point) => point[1]);
    const z = points.map((point) => point[2]);
    const dataObject: DataObject = {
      x: side === 'face' && view === '2d' ? y : x,
      z: view === '3d' ? z : y,
      y: view === '3d' ? y : z,
      type: view === '3d' ? 'scatter3d' : 'scatter',
      mode: getMode(type),
      line: getLine(type, view),
      textposition: 'top center',
      marker: getMarker(type, view),
      text: getText(type, points, supports[startSupport + index]),
      name: type,
      supportUuid: supports[startSupport + index]?.uuid
    };
    return dataObject;
  });
};
