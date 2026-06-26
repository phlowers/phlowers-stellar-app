/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Min/max constraints for climate form fields. */
export const climateConstraints = {
  windPressure: { min: -3000, max: 3000 },
  cableTemperature: { min: -50, max: 250 },
  iceThickness: { min: 0, max: 20 }
} as const;
