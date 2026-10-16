/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  TangentAimingSupportFieldRule,
  TangentAimingSupportInputField,
  TangentAimingSupportNumberFieldView,
  TangentAimingSupportNumericField
} from './tangent-aiming-support.interfaces';

const I18N = 'field-measuring.tangent-aiming-support';

/** Display description of each numeric input. */
export const TANGENT_AIMING_SUPPORT_NUMBER_FIELDS: Record<
  TangentAimingSupportNumericField,
  TangentAimingSupportNumberFieldView
> = {
  tangentSpanLength: {
    id: 'tasSpanLength',
    labelKey: 'common.measured-span-length-label',
    unitKey: 'common.meter',
    testId: 'span-length-input',
    step: 0.01,
    area: 'spanLength'
  },
  cableHAccDistance: {
    id: 'tasHAccDistance',
    labelKey: `${I18N}.h-acc-distance-label`,
    unitKey: 'common.meter',
    testId: 'h-acc-distance-input',
    step: 0.01,
    area: 'hDistance'
  },
  cableVerticalAccAngle: {
    id: 'tasVerticalAccAngle',
    labelKey: `${I18N}.vertical-acc-angle-label`,
    unitKey: 'common.grade-unit',
    testId: 'vertical-acc-angle-input',
    step: 0.01,
    area: 'vAngle'
  },
  cableParameter: {
    id: 'tasParameter',
    labelKey: 'common.parameter-label',
    unitKey: 'common.meter',
    testId: 'parameter-input',
    step: 1,
    area: 'parameter'
  },
  cableTangentAngle: {
    id: 'tasTangentAngle',
    labelKey: `${I18N}.tangent-angle-label`,
    unitKey: 'common.grade-unit',
    testId: 'tangent-angle-input',
    step: 0.01,
    area: 'tangentAngle'
  }
};

/** Bounds, decimals and default of each numeric input. */
export const TANGENT_AIMING_SUPPORT_FIELD_RULES: Record<
  TangentAimingSupportNumericField,
  TangentAimingSupportFieldRule
> = {
  tangentSpanLength: { min: 0, max: 5000, decimals: 2, default: 0 },
  cableHAccDistance: { min: 0, max: 1000, decimals: 2, default: 0 },
  cableVerticalAccAngle: { min: -200, max: 200, decimals: 2, default: 0 },
  cableParameter: { min: 20, max: 5000, decimals: 0, default: 20 },
  cableTangentAngle: { min: -200, max: 200, decimals: 2, default: 0 }
};

/** Inputs always displayed, whatever the calculation type. */
export const TANGENT_AIMING_SUPPORT_COMMON_FIELDS: TangentAimingSupportInputField[] = [
  'tangentLeftSupport',
  'tangentSpanLength',
  'cableHAccDistance',
  'cableVerticalAccAngle'
];

/** Input shown only for the given calculation type. */
export const TANGENT_AIMING_SUPPORT_TYPE_FIELD = {
  parametre: 'cableParameter',
  tangente: 'cableTangentAngle'
} as const;
