import { Data } from 'plotly.js-dist-min';
import { CreateDataForPlotParams, PlotObjectType } from './types';
import { createDataObject } from './createPlotDataObject';

const PLOT_OBJECTS: {
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
  const data = PLOT_OBJECTS.map((plotObject) => {
    return createDataObject({
      litXs,
      litYs,
      litZs,
      litSection,
      litTypes,
      litSupports,
      uniqueSupports:
        plotObject.type === 'support' || plotObject.type === 'insulator'
          ? uniqueSupportsForSupports
          : uniqueSupports,
      name: plotObject.name,
      type: plotObject.type,
      side
    });
  });

  return data.flat();
};
