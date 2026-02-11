import { PlotObjectsType, PlotOptions } from './types';
import { createDataObject, DataObject } from './createPlotDataObject';
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { Support } from '@core/domain/models/support.model';

export const createPlotData = (
  params: GetSectionOutput,
  options: PlotOptions,
  supports: Support[] = []
): DataObject[] => {
  const dataObjects: DataObject[] = [];
  (['spans', 'supports', 'insulators'] as (keyof GetSectionOutput)[]).forEach((type) => {
    dataObjects.push(
      ...(createDataObject(
        params[type as keyof GetSectionOutput] as number[][][],
        options.startSupport,
        options.endSupport,
        type as PlotObjectsType,
        options.view,
        options.side,
        supports
      ) as DataObject[])
    );
  });

  return dataObjects.flat();
};
