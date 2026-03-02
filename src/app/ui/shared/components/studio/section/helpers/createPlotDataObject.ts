// Exports are done individually at the bottom of the file
import { Dash, Data } from 'plotly.js-dist-min';
import { SPAN_COLOR } from './plot.constants';
import { PlotObjectsType, Side, View } from './types';

import { Support } from '@core/domain/models/support.model';

// Determines the Plotly mode based on the object type
function getMode(
  type: PlotObjectsType
):
  | 'number'
  | 'text'
  | 'delta'
  | 'gauge'
  | 'none'
  | 'lines'
  | 'markers'
  | 'lines+markers'
  | 'text+markers'
  | 'text+lines'
  | 'text+lines+markers'
  | 'number+delta'
  | 'gauge+number'
  | 'gauge+number+delta'
  | 'gauge+delta'
  | undefined {
  switch (type) {
    case 'supports':
      return 'text+lines+markers';
    case 'spans':
    case 'insulators':
      return 'lines+markers';
    default:
      return 'lines';
  }
}

// Determines the marker style based on the type and view
function getMarker(type: PlotObjectsType, view: View): object {
  switch (type) {
    case 'supports':
      return { size: view === '3d' ? 8 : 6, color: 'indigo', symbol: 'circle' };
    case 'spans':
      return { size: view === '3d' ? 6 : 4, color: SPAN_COLOR, symbol: 'line-ns-open' };
    case 'insulators':
      return { size: view === '3d' ? 6 : 4, color: 'orange', symbol: 'diamond' };
    default:
      return { size: 4, color: 'gray', symbol: 'circle' };
  }
}

// Generates text associated with each point (can be extended as needed)
function getText(type: PlotObjectsType, points: number[][], index: number): string[] {
  // No text by default; can be adapted for supports or other types
  if (type === 'supports') {
    return points.map((_, i) => `Support ${index + i}`);
  }
  return [];
}

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
// Version with supports
export const createDataObjectWithSupports = (
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
      text: getText(type, points, startSupport + index),
      name: type,
      supportUuid: supports[startSupport + index]?.uuid
    };
    return dataObject;
  });
};

// Version with axes norms
export const createDataObjectWithNorms = (
  data: number[][][],
  startSupport: number,
  endSupport: number,
  type: PlotObjectsType,
  view: View,
  side: Side,
  axesNorms?: { x: number; y: number; z: number }
): Data[] => {
  const slidedData = data.slice(startSupport, type === 'spans' ? endSupport : endSupport + 1);
  return slidedData.map((points, index) => {
    const norms = getNorms(axesNorms, view, side);
    const x = points.map((point) => (norms ? point[0] / norms.x : point[0]));
    const y = points.map((point) => (norms ? point[1] / norms.y : point[1]));
    const z = points.map((point) => (norms ? point[2] / norms.z : point[2]));

    const dataObject: Data = {
      x: side === 'face' && view === '2d' ? y : x,
      z: view === '3d' ? z : y,
      y: view === '3d' ? y : z,
      type: view === '3d' ? 'scatter3d' : 'scatter',
      mode: getMode(type),
      line: getLine(type, view),
      textposition: 'top center',
      marker: getMarker(type, view),
      text: getText(type, points, startSupport + index),
      name: type
    };
    return dataObject;
  });
};
/**
 * A Plotly `Data` object extended with an optional support UUID for identification.
 * @category Studio
 */
export type DataObject = Data & { supportUuid?: string };

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
const getNorms = (
  axesNorms: { x: number; y: number; z: number } | undefined,
  view: View,
  side: Side
): { x: number; y: number; z: number } | undefined => {
  if (!axesNorms) return undefined;
  if (view === '2d' && side === 'face') {
    return {
      x: axesNorms.x,
      y: axesNorms.z,
      z: axesNorms.y
    };
  }
  return axesNorms;
};

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
      text: getText(type, points, startSupport + index),
      name: type,
      supportUuid: supports[startSupport + index]?.uuid
    };
    return dataObject;
  });
};
