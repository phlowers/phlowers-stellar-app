/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Represents a cable length modification on a span.
 *
 * @remarks
 * A cable modification stores the parameters used to lengthen or shorten
 * a cable on a given span, relative to a support reference point.
 *
 * @category Domain Models
 */
export interface CableModification {
  /** Unique identifier (UUID v4) */
  uuid: string;
  /** UUID of the span this modification applies to */
  spanUuid: string;
  /** Reference support used as origin for the modification */
  supportRef: 'LEFT' | 'RIGHT';
  /** Direction of the cable length modification */
  modificationType: 'lengthening' | 'shortening';
  /** Size of the cable modification in meters */
  modifiedLengthCable: number;
  /** Distance from the reference support in meters */
  distanceSupportRef: number;
}
