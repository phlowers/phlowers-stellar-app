import { Dash, Data, PlotData } from 'plotly.js-dist-min';
import { PlotObjectsType, Side, View } from './types';

const getColor = (
  type: PlotObjectsType
): {
  color: string;
  dash: Dash;
} => {
  switch (type) {
    case 'spans':
      return { color: 'red', dash: 'solid' };
    case 'supports':
      return { color: 'blue', dash: 'solid' };
    case 'insulators':
      return { color: 'green', dash: 'solid' };
    default:
      return { color: 'black', dash: 'solid' };
  }
};

const getMode = (type: PlotObjectsType): PlotData['mode'] => {
  if (type === 'supports') return 'text+lines';
  return 'lines';
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
    return {
      x: side === 'face' && view === '2d' ? y : x,
      z: view === '3d' ? z : y,
      y: view === '3d' ? y : z,
      type: view === '3d' ? 'scatter3d' : 'scatter',
      mode: getMode(type),
      line: getColor(type),
      textposition: 'top center',
      text: getText(type, points, startSupport + index)
    };
  });
};
