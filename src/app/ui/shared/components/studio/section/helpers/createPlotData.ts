import { PlotObjectsType, PlotOptions } from './types';
import { createDataObject, DataObject } from './createPlotDataObject';
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { Support } from '@core/domain/models/support.model';

/**
 * Builds an array of Plotly-compatible data objects for all section object types
 * (spans, supports, insulators) from the raw computation output.
 * @category Studio
 * @param params - The raw section output from the Python computation engine.
 * @param options - Plot rendering options (view, side, support range).
 * @param supports - Optional array of support models used to attach UUIDs to data objects.
 * @returns A flat array of `DataObject` entries ready for Plotly rendering.
 */
export const createPlotData = (params: GetSectionOutput, options: PlotOptions, supports?: Support[]): DataObject[] => {
  const dataObjects: DataObject[] = [];
  (['spans', 'supports', 'insulators'] as const).forEach((type: PlotObjectsType) => {
    dataObjects.push(
      ...createDataObject(
        params[type as keyof GetSectionOutput] as number[][][],
        options.startSupport,
        options.endSupport,
        type,
        options.view,
        options.side,
        supports
      )
    );
  });
  return dataObjects.flat();
};
