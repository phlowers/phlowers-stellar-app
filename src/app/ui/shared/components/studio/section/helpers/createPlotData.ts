import { Data } from 'plotly.js-dist-min';
import { PlotObjectsType, PlotOptions } from './types';
import { createDataObject } from './createPlotDataObject';
import { GetSectionOutput } from '@core/services/worker_python/tasks/types';

export const createPlotData = (
  params: GetSectionOutput,
  options: PlotOptions
): Data[] => {
  const data = (
    ['spans', 'supports', 'insulators'] as (keyof GetSectionOutput)[]
  ).map((type) => {
    return createDataObject(
      params[type as keyof GetSectionOutput] as number[][][],
      options.startSupport,
      options.endSupport,
      type as PlotObjectsType,
      options.view,
      options.side
    );
  });

  return data.flat();
};
