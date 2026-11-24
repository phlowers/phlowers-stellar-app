import { PlotObjectsType, PlotOptions } from '@shared/types/plot.types';
import { createDataObject, createVirtualSupportDataObjects, DataObject } from './createPlotDataObject';
import { GetSectionOutput, SectionCoords } from '@services/worker_python/tasks/types';
import { Support } from '@shared/domain/models/support.model';

/**
 * Builds an array of Plotly-compatible data objects for all section object types
 * (spans, supports, insulators, then the virtual supports and their insulators) from the raw computation output.
 * @category Studio
 * @param params - The raw section output from the Python computation engine.
 * @param options - Plot rendering options (view, side, support range).
 * @param supports - Optional array of support models used to attach UUIDs to data objects.
 * @returns A flat array of `DataObject` entries ready for Plotly rendering.
 */
export const createPlotData = (
  params: GetSectionOutput,
  options: PlotOptions,
  supports: Support[] = []
): DataObject[] => {
  const dataObjects: DataObject[] = [];
  (['spans', 'supports', 'insulators'] as (keyof SectionCoords)[]).forEach((type) => {
    dataObjects.push(
      ...(createDataObject(
        params.coords[type] as number[][][],
        options.startSupport,
        options.endSupport,
        type as PlotObjectsType,
        options.view,
        options.side,
        supports
      ) as DataObject[])
    );
  });
  dataObjects.push(
    ...createVirtualSupportDataObjects(
      params.coords,
      options.startSupport,
      options.endSupport,
      options.view,
      options.side
    )
  );

  return dataObjects.flat();
};
