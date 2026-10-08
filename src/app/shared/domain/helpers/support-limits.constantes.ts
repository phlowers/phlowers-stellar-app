/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Allowed min/max of the numeric support fields in the section form. */
export const SUPPORT_FIELD_LIMITS = {
  spanLength: { min: 5, max: 5000 },
  attachmentHeight: { min: -100, max: 9000 },
  spanAngle: { min: -200, max: 200 },
  chainLength: { min: 0, max: 15 },
  chainWeight: { min: 0, max: 5000 },
  attachmentSet: { min: 1, max: 60 },
  armLength: { min: -50, max: 50 },
  counterWeight: { min: 0, max: 5000 },
  supportFootAltitude: { min: -150, max: 9000 },
  chainSurface: { min: 0, max: 9.99 }
} as const;
