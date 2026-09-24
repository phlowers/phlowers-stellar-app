/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Extracts point index from a floor form point ID ('floor-form-X'), or null.
 */
export const parseFloorFormPointIndex = (pointId: string): number | null => {
  const match = /^floor-form-(\d+)$/.exec(pointId);
  return match ? Number(match[1]) : null;
};
