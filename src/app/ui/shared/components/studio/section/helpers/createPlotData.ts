import { Data } from 'plotly.js-dist-min';
import { CreateDataForPlotParams, PlotObjectType, PlotOptions } from './types';
import { createDataObject } from './createPlotDataObject';
import { uniq } from 'lodash';

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

export const createPlotData = (
  params: CreateDataForPlotParams,
  options: PlotOptions
): Data[] => {
  const { litXs, litYs, litZs, litSection, litTypes, litSupports } = params;
  const uniqueSupports = uniq(litSupports).slice(
    options.startSupport,
    options.endSupport
  );
  const uniqueSupportsForSupports = uniq(litSupports).slice(
    options.startSupport,
    options.endSupport + 1
  );
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
      side: options.side,
      view: options.view
    });
  });

  return data.flat();
};
