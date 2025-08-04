import { Data } from 'plotly.js-dist-min';
import { CreateDataForPlotParams, PlotObjectType } from './types';
import { createDataObject } from './createPlotDataObject';

const objects: {
  name: string;
  type: PlotObjectType;
}[] = [
  {
    name: 'phase_1',
    type: 'span'
  },
  {
    name: 'phase_2',
    type: 'span'
  },
  {
    name: 'phase_3',
    type: 'span'
  },
  {
    name: 'garde',
    type: 'span'
  },
  {
    name: 'support',
    type: 'support'
  },
  {
    name: 'insulator',
    type: 'insulator'
  }
];

export const createPlotData = (params: CreateDataForPlotParams): Data[] => {
  const {
    litXs,
    litYs,
    litZs,
    litSection,
    litTypes,
    litSupports,
    uniqueSupports,
    uniqueSupportsForSupports,
    side
  } = params;
  const data = objects.map((object) => {
    return createDataObject({
      litXs,
      litYs,
      litZs,
      litSection,
      litType: litTypes,
      litSupports,
      uniqueSupports:
        object.type === 'support' || object.type === 'insulator'
          ? uniqueSupportsForSupports
          : uniqueSupports,
      name: object.name,
      type: object.type,
      side
    });
  });

  return data.flat();
};
