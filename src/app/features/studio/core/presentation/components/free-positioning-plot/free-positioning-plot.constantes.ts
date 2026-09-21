/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import Plotly, { ModeBarButtonAny } from 'plotly.js-dist-min';
import { PLOT_AXIS_CONFIG } from '@shared/components/studio/section/helpers/plot.constants';
import { FreePositioningCategory } from './free-positioning-plot.interfaces';

export {
  CATEGORY_COLORS,
  CATEGORY_SYMBOLS,
  DEFAULT_POINT_SIZE,
  DEBOUNCED_REFRESH_STUDIO_DELAY,
  DEBOUNCED_UPDATE_SELECTED_POSITION_MARKERS_DELAY,
  EDITABLE_POINT_COLOR,
  EDITABLE_POINT_SIZE,
  FREE_POSITIONING_CATEGORIES,
  LOAD_ICON,
  MARKING_ICON,
  POINT_SELECTION_PIXEL_RADIUS
} from '../free-positioning/free-positioning.constantes';

export const FREE_POSITIONING_PLOT_CONFIG = {
  HEIGHT: 500,
  MARGIN_LEFT: 35,
  MARGIN_RIGHT: 0,
  MARGIN_TOP: 0,
  MARGIN_BOTTOM: 35,
  SHAPE_EXTENT: 1000,
  PLOT_CREATION_DELAY_MS: 300,
  MARKER_DELTA: 5
} as const;

export const FREE_POSITIONING_MODE_BAR_BUTTONS: ModeBarButtonAny[][] = [['zoomIn2d', 'zoomOut2d']];

export const CORE_PLOT_IDS = {
  PROFILE: 'plotly-output-free-positioning-profile',
  FACE: 'plotly-output-free-positioning-face'
} as const;

export const DEFAULT_VISIBLE_CATEGORIES: readonly FreePositioningCategory[] = [
  'obstacle',
  'floor',
  'distance',
  'loads'
];

export const getFreePositioningPlotConfig = (): Partial<Plotly.Config> => ({
  displayModeBar: true,
  fillFrame: false,
  responsive: true,
  autosizable: true,
  displaylogo: false,
  modeBarButtons: FREE_POSITIONING_MODE_BAR_BUTTONS
});

export const getFreePositioningPlotLayout = (sharedRange: [number, number] | null): Partial<Plotly.Layout> => ({
  autosize: true,
  showlegend: false,
  dragmode: 'pan',
  margin: {
    l: FREE_POSITIONING_PLOT_CONFIG.MARGIN_LEFT,
    r: FREE_POSITIONING_PLOT_CONFIG.MARGIN_RIGHT,
    t: FREE_POSITIONING_PLOT_CONFIG.MARGIN_TOP,
    b: FREE_POSITIONING_PLOT_CONFIG.MARGIN_BOTTOM
  },
  yaxis: {
    ...PLOT_AXIS_CONFIG,
    showticklabels: true,
    showgrid: true,
    showline: true,
    ...(sharedRange ? { range: [...sharedRange], autorange: false } : {})
  },
  xaxis: {
    ...PLOT_AXIS_CONFIG,
    showticklabels: true,
    showgrid: true,
    showline: true
  }
});
