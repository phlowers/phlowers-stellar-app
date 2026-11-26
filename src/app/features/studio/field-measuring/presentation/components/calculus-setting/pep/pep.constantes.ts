/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { PapotoResult } from '@features/studio/field-measuring/domain/types';
import {
  PepNumericField,
  PepSight
} from '@features/studio/field-measuring/presentation/components/calculus-setting/pep/pep.interfaces';

/** Bounds and maximum decimals of each numeric input (RG.PEP.LON/DEN/XV/YV.1). */
export const PEP_FIELD_RULES: Record<PepNumericField, { min: number; max: number; decimals: number }> = {
  lengthBetweenSightGD: { min: 0, max: 5000, decimals: 2 },
  elevationDifferenceBetweenSightGD: { min: -1000, max: 1000, decimals: 2 },
  xSight1: { min: 0, max: 5000, decimals: 2 },
  xSight2: { min: 0, max: 5000, decimals: 2 },
  xSight3: { min: 0, max: 5000, decimals: 2 },
  ySight1: { min: -1000, max: 1000, decimals: 2 },
  ySight2: { min: -1000, max: 1000, decimals: 2 },
  ySight3: { min: -1000, max: 1000, decimals: 2 }
};

/**
 * Mocked PEP result, returned whatever the inputs: the engine has no PEP calculation yet.
 * ponytail: replace by a `Task.calculatePep` call once the engine implements PEP.
 */
export const PEP_MOCK_RESULT: PapotoResult = {
  parameter: 2000,
  uncertainty: 5,
  parameter_1_2: 1990,
  parameter_2_3: 2010,
  parameter_1_3: 2000,
  checkValidity: true
};

/** Sights 1 to 3 displayed by the PEP form, in display order. */
export const PEP_SIGHTS: readonly PepSight[] = [
  { index: 1, xField: 'xSight1', yField: 'ySight1' },
  { index: 2, xField: 'xSight2', yField: 'ySight2' },
  { index: 3, xField: 'xSight3', yField: 'ySight3' }
];
