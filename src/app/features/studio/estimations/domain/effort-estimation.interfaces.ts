/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Span selected in the effort estimation form. */
export interface EffortEstimationSpan {
  index: number;
  uuid: string;
}

/** Direction of the targeted vertical displacement of the cable. */
export type EffortEstimationDirection = 'UP' | 'DOWN';

/** Side of the selected span the distance is measured from. */
export type EffortEstimationSupportSide = 'LEFT' | 'RIGHT';

/** Option of the displacement direction switch. */
export interface EffortEstimationDirectionOption {
  labelKey: string;
  value: EffortEstimationDirection;
}

/** Raw value of the effort estimation form (disabled controls included). */
export interface EffortEstimationFormValue {
  span: EffortEstimationSpan | null;
  referenceSupport: EffortEstimationSupportSide | null;
  distanceToReferenceSupport: number | null;
  temperature: number | null;
  direction: EffortEstimationDirection;
  targetDisplacement: number | null;
}

/** Results of the effort estimation. */
export interface EffortEstimationResults {
  /** Effort in daN: negative for a traction, positive for a weight. */
  effort: number;
  /** Displacement of the application point along the span axis, in meters. */
  xDisplacement: number;
}
