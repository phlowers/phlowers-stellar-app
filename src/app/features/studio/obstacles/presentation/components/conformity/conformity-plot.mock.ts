/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ConformityPlotResponse } from './conformity-plot.model';

/**
 * Fixed mock of the python task's graph response, used until the real conformity calculation
 * exists. It intentionally mirrors the exact response contract (`ConformityPlotResponse`) so
 * swapping in the task output is a drop-in.
 */
export const CONFORMITY_PLOT_MOCK: ConformityPlotResponse = {
  obstacle: {
    name: '05176a6c-4726-4488-8b2a-418551510254',
    points: [{ x: 20.0, y: 30.0 }]
  },
  conformity: {
    RULE_1: {
      zonePlot: {
        zonePoints: [
          { LowerLeft: { x: 9.0, y: 47.25352991994568 } },
          { LowerRight: { x: 12.251346876446044, y: 47.25352991994568 } },
          { UpperRight: { x: 12.251346876446044, y: 51.09436686666673 } },
          { UpperLeft: { x: 9.0, y: 51.09436686666673 } }
        ],
        zoneBorder: [
          { x: 9.0, y: 51.09436686666673 },
          { x: 9.0, y: 47.25352991994568 },
          { x: 12.251346876446044, y: 47.25352991994568 },
          { x: 12.251346876446044, y: 51.09436686666673 }
        ]
      },
      points: [
        { x: 11.251346876446044, y: 49.59436686666673, radius: 1.0 },
        { x: 10.0, y: 48.75352991994568, radius: 1.0 }
      ]
    },
    RULE_2: {
      zonePlot: {
        zonePoints: [
          { LowerLeft: { x: 8.0, y: 46.25352991994568 } },
          { LowerRight: { x: 13.46449046107179, y: 46.25352991994568 } },
          { UpperRight: { x: 13.46449046107179, y: 51.50378892208745 } },
          { UpperLeft: { x: 8.0, y: 51.50378892208745 } }
        ],
        zoneBorder: [
          { x: 8.0, y: 51.50378892208745 },
          { x: 8.0, y: 46.25352991994568 },
          { x: 13.46449046107179, y: 46.25352991994568 },
          { x: 13.46449046107179, y: 51.50378892208745 }
        ]
      },
      points: [
        { x: 11.46449046107179, y: 49.00378892208745, radius: 1.0 },
        { x: 10.0, y: 48.75352991994568, radius: 1.0 }
      ]
    }
  }
};
