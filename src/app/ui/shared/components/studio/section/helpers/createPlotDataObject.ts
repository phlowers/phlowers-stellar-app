import { Dash, Data, PlotData } from 'plotly.js-dist-min';
import { CreateDataObjectPlotParams, PlotObjectType } from './types';

const getColor = (
  type: PlotObjectType
): {
  color: string;
  dash: Dash;
} => {
  switch (type) {
    case 'span':
      return { color: 'red', dash: 'solid' };
    case 'support':
      return { color: 'blue', dash: 'solid' };
    case 'insulator':
      return { color: 'green', dash: 'solid' };
    default:
      return { color: 'black', dash: 'solid' };
  }
};

const getMode = (type: PlotObjectType): PlotData['mode'] => {
  if (type === 'support') return 'text+lines';
  return 'lines';
};

export const createDataObject = (
  params: CreateDataObjectPlotParams
): Data[] => {
  const {
    litXs,
    litYs,
    litZs,
    litSection,
    litTypes,
    litSupports,
    uniqueSupports,
    name,
    side,
    type,
    view
  } = params;
  const filterCoordinates = (
    coordinates: (number | null)[],
    support: string
  ) => {
    return coordinates.filter(
      (_, index: number) =>
        litSupports[index] === support &&
        (litTypes[index] === 'span' ? litSection[index] === name : true) &&
        litTypes[index] === type
    );
  };
  return uniqueSupports.map((support) => {
    const x = filterCoordinates(litXs, support);
    const y = filterCoordinates(litYs, support);
    const z = filterCoordinates(litZs, support);
    return {
      x: side === 'face' && view === '2d' ? y : x,
      z: view === '3d' ? z : y,
      y: view === '3d' ? y : z,
      type: view === '3d' ? 'scatter3d' : 'scatter',
      mode: getMode(type),
      line: getColor(type),
      textposition: 'inside',
      text: ''
    };
  });
};
