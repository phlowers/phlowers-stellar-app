/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Data } from 'plotly.js-dist-min';
import { PlotObjectsType, PlotOptions } from '@shared/types/plot.types';
import { createShadowDataObject } from './createShadowDataObject';
import { GetSectionOutput, SectionCoords } from '@services/worker_python/tasks/types';

/**
 * Builds an array of shadow (background/overlay) Plotly data objects for all section object types.
 * Shadow traces are rendered with reduced opacity behind the main traces to provide
 * a visual reference of the base section geometry.
 * @category Studio
 * @param params - The raw section output from the Python computation engine.
 * @param options - Plot rendering options (view, side, support range).
 * @returns A flat array of Plotly `Data` entries for shadow traces.
 */
export const createShadowPlotData = (params: GetSectionOutput, options: PlotOptions): Data[] => {
  const data = (['spans', 'supports', 'insulators'] as (keyof SectionCoords)[]).map((type) => {
    return createShadowDataObject(
      params.coords[type] as number[][][],
      options.startSupport,
      options.endSupport,
      type as PlotObjectsType,
      options.view,
      options.side
    );
  });

  return data.flat();
};
