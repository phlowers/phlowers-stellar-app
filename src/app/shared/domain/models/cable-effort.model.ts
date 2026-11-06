/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Direction of the targeted vertical displacement of the cable. */
export type CableEffortDirection = 'UP' | 'DOWN';

/** Inputs of the cable effort estimation (distances in meters, temperature in °C). */
export interface CableEffortInputs {
  spanIndex: number;
  referenceSupport: 'LEFT' | 'RIGHT';
  distanceToReferenceSupport: number;
  temperature: number;
  targetDisplacement: number;
  direction: CableEffortDirection;
}

/** Result of the cable effort estimation. */
export interface CableEffortResult {
  /** Effort in daN: negative for a traction, positive for a weight. */
  effort: number;
  /** Displacement of the application point along the span axis, in meters. */
  xDisplacement: number;
}
