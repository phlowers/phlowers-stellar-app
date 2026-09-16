/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import Plotly, { ModeBarButtonAny } from 'plotly.js-dist-min';
import { PLOT_AXIS_CONFIG } from '@shared/components/studio/section/helpers/plot.constants';
import { FreePositioningConfig } from '@features/studio/core/presentation/components/free-positioning-plot/free-positioning-plot.interfaces';

/** Config consumed by the shared FreePositioningPlotComponent: profile only, floor is the editable category. */
export const FLOOR_FREE_POSITIONING_CONFIG: FreePositioningConfig = {
  showFace: false,
  editableCategory: 'floor',
  defaultVisibleCategories: ['floor']
};

export const PLOT_CONFIG = {
  MARGIN_LEFT: 35,
  MARGIN_RIGHT: 0,
  MARGIN_TOP: 0,
  MARGIN_BOTTOM: 35
} as const;

export {
  DEBOUNCED_REFRESH_STUDIO_DELAY,
  DEBOUNCED_UPDATE_SELECTED_POSITION_MARKERS_DELAY
} from '@features/studio/core/presentation/components/free-positioning/free-positioning.constantes';

/** Click-to-select radius (pixels) for picking an existing floor point instead of placing the active one. */
export const POINT_SELECTION_PIXEL_RADIUS = 12;

export const FLOOR_FREE_POSITIONING_PLOT_ID = 'plotly-output-floor-free-positioning';

export const getFloorFreePositioningPlotLayout = (): Partial<Plotly.Layout> => ({
  autosize: true,
  showlegend: false,
  dragmode: 'pan',
  margin: {
    l: PLOT_CONFIG.MARGIN_LEFT,
    r: PLOT_CONFIG.MARGIN_RIGHT,
    t: PLOT_CONFIG.MARGIN_TOP,
    b: PLOT_CONFIG.MARGIN_BOTTOM
  },
  yaxis: {
    ...PLOT_AXIS_CONFIG,
    showticklabels: true,
    showgrid: true,
    showline: true
  },
  xaxis: {
    ...PLOT_AXIS_CONFIG,
    showticklabels: true,
    showgrid: true,
    showline: true
  }
});

export const getFloorFreePositioningPlotConfig = (): Partial<Plotly.Config> => ({
  displayModeBar: true,
  fillFrame: false,
  responsive: true,
  autosizable: true,
  displaylogo: false,
  modeBarButtons: [['zoomIn2d', 'zoomOut2d']] as ModeBarButtonAny[][]
});
