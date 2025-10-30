import { Data } from 'plotly.js-dist-min';
import { PlotObjectsType, PlotOptions } from './types';
import { createDataObject } from './createPlotDataObject';
import { GetSectionOutput } from '@core/services/worker_python/tasks/types';

export const createPlotData = (
  params: GetSectionOutput,
  options: PlotOptions
): Data[] => {
  const data = (['spans', 'insulators', 'supports'] as PlotObjectsType[]).map(
    (type) => {
      return createDataObject(
        params[type],
        options.startSupport,
        options.endSupport,
        type,
        options.view,
        options.side
      );
    }
  );

  return data.flat();
};
