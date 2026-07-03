/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Results of a distance/angle measurement between the three points. */
export interface DistanceMeasuringResults {
  /** Distance between point 1 and point 2 (meters). */
  distance12: number;
  /** Distance between point 2 and point 3 (meters), null when point 3 is not filled in. */
  distance23: number | null;
  /** Angle at point 2 formed by points 1-2-3 (degrees), null when point 3 is not filled in. */
  angle123: number | null;
}
