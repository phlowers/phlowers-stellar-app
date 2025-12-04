import { Dash, Data, PlotData } from 'plotly.js-dist-min';
import { PlotObjectsType, Side, View } from './types';

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
        color: 'dodgerblue',
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

const getText = (
  type: PlotObjectsType,
  points: number[][],
  supportIndex: number
): string[] => {
  if (type !== 'supports') return [];
  const highestPointIndex = points.findIndex(
    (point) => point[2] === Math.max(...points.map((point) => point[2]))
  );
  return points.map((point, index) =>
    index === highestPointIndex ? (supportIndex + 1).toString() : ''
  );
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

export const createDataObject = (
  data: number[][][],
  startSupport: number,
  endSupport: number,
  type: PlotObjectsType,
  view: View,
  side: Side
): Data[] => {
  const slidedData = data.slice(
    startSupport,
    type === 'spans' ? endSupport : endSupport + 1
  );
  return slidedData.map((points, index) => {
    const x = points.map((point) => point[0]);
    const y = points.map((point) => point[1]);
    const z = points.map((point) => point[2]);
    const dataObject: Data = {
      x: side === 'face' && view === '2d' ? y : x,
      z: view === '3d' ? z : y,
      y: view === '3d' ? y : z,
      type: view === '3d' ? 'scatter3d' : 'scatter',
      mode: getMode(type),
      line: getLine(type, view),
      textposition: 'top center',
      marker: getMarker(type, view),
      text: getText(type, points, startSupport + index)
    };
    return dataObject;
  });
};
