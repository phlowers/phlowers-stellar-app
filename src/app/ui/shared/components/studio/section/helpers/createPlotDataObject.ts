import { Dash, Data } from 'plotly.js-dist-min';
import { GetAllPhasesParams, PlotObjectType } from './types';

const getColor = (
  type: PlotObjectType
): {
  color: string;
  dash: Dash;
} => {
  if (type === 'span') return { color: 'red', dash: 'solid' };
  if (type === 'support') return { color: 'blue', dash: 'solid' };
  if (type === 'insulator') return { color: 'green', dash: 'solid' };
  return { color: 'black', dash: 'solid' };
};

const getMode = (
  type: PlotObjectType
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
  | undefined => {
  if (type === 'support') return 'text+lines';
  return 'lines';
};

export const createDataObject = (params: GetAllPhasesParams): Data[] => {
  const {
    litXs,
    litYs,
    litZs,
    litSection,
    litType,
    litSupports,
    uniqueSupports,
    name,
    side,
    type
  } = params;
  const filterCoordinates = (
    coordinates: (number | null)[],
    support: string
  ) => {
    return coordinates.filter(
      (_, index: number) =>
        litSupports[index] === support &&
        (litType[index] === 'span' ? litSection[index] === name : true) &&
        litType[index] === type
    );
  };
  return uniqueSupports.map((support) => {
    const x = filterCoordinates(litXs, support);
    const y = filterCoordinates(litYs, support);
    const z = filterCoordinates(litZs, support);
    return {
      x: side === 'face' ? y : x,
      z: y,
      y: z,
      type: 'scatter',
      mode: getMode(type),
      line: getColor(type),
      textposition: 'inside',
      text: ''
    };
  });
};
