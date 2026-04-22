/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { PlotOptions } from '@shared/types/plot.types';

/**
 * Checks whether a projection refresh is needed based on changed plot options.
 * @param oldOptions - Previous plot options
 * @param newOptions - New plot options
 * @param loading - Whether a calculation is currently in progress
 * @returns `true` if the projection should be refreshed
 */
export const checkIfProjectionNeedRefresh = (
  oldOptions: PlotOptions,
  newOptions: PlotOptions,
  loading: boolean
): boolean => {
  if (loading) {
    return false;
  }
  const oldView = oldOptions.view;
  const newView = newOptions.view;
  const oldSide = oldOptions.side;
  const newSide = newOptions.side;
  if (oldView !== newView || oldSide !== newSide) {
    return true;
  }
  if (newView !== '2d') {
    return false;
  }
  const oldStartSupport = oldOptions.startSupport;
  const oldEndSupport = oldOptions.endSupport;
  const newStartSupport = newOptions.startSupport;
  const newEndSupport = newOptions.endSupport;
  if (oldStartSupport !== newStartSupport || oldEndSupport !== newEndSupport) {
    return true;
  }
  return false;
};
