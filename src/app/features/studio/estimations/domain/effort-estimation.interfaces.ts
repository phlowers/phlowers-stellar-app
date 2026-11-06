/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { CableEffortDirection } from '@shared/domain';

/** Span selected in the effort estimation form. */
export interface EffortEstimationSpan {
  index: number;
  uuid: string;
}

/** Side of the selected span the distance is measured from. */
export type EffortEstimationSupportSide = 'LEFT' | 'RIGHT';

/** Option of the displacement direction switch. */
export interface EffortEstimationDirectionOption {
  labelKey: string;
  value: CableEffortDirection;
}

/** Raw value of the effort estimation form (disabled controls included). */
export interface EffortEstimationFormValue {
  span: EffortEstimationSpan | null;
  referenceSupport: EffortEstimationSupportSide | null;
  distanceToReferenceSupport: number | null;
  temperature: number | null;
  direction: CableEffortDirection;
  targetDisplacement: number | null;
}

/** Results displayed in the results frame, rounded to the display decimals. */
export interface EffortEstimationDisplayedResults {
  effort: number;
  xDisplacement: number;
}
