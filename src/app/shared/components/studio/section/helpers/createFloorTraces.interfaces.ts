/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Data payload attached to a floor point annotation for click event handling.
 * @category Studio
 */
export interface FloorAnnotationData {
  /** Discriminator indicating this annotation represents a floor point. */
  type: 'floor';
  /** UUID of the floor the point belongs to. */
  floorUuid: string;
  /** Index of the point within the floor. */
  pointIndex: number;
}
