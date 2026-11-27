/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export const FOREST_TRENCHES_PLOT_ID = 'forest-trenches-plot';

// The forest trenches task computes every span of the interval in a single call, the default 30 s is too short for long sections
export const FOREST_TRENCHES_CALCULATION_TIMEOUT_MS = 90_000;

export const FOREST_TRENCHES_PLOT_COLORS = {
  axis: '#000000'
} as const;

// The trench points file name and number format are a contract with a third-party application: never translated
export const TRENCH_POINTS_EXPORT_FILENAME_PREFIX = 'Export PointsTranchee';
export const TRENCH_POINTS_EXPORT_EXTENSION = '.csv';
export const TRENCH_POINTS_EXPORT_PICKER_TYPES = [{ description: 'CSV', accept: { 'text/csv': ['.csv'] } }];
export const TRENCH_POINTS_NUMBER_FORMAT = new Intl.NumberFormat('fr-FR', {
  useGrouping: false,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'negative'
});

/** Small thin cross drawn on the span axis at every ground slicing point. */
export const FOREST_TRENCHES_AXIS_POINT_MARKER = {
  symbol: 'x-thin',
  size: 7,
  lineWidth: 1.5
} as const;
