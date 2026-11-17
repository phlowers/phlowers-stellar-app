/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Display index and measure keys of the horizontal and vertical coordinates of one PEP sight. */
export interface PepSight {
  index: number;
  xField: 'xSight1' | 'xSight2' | 'xSight3';
  yField: 'ySight1' | 'ySight2' | 'ySight3';
}
