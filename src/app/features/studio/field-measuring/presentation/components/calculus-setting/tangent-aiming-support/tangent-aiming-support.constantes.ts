/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  TangentAimingFieldRule,
  TangentAimingNumberFieldView
} from '../tangent-aiming-common/tangent-aiming-common.interfaces';
import { TANGENT_AIMING_FIELD_RULES } from '../tangent-aiming-common/tangent-aiming-common.constantes';
import { TangentAimingSupportInputField, TangentAimingSupportNumericField } from './tangent-aiming-support.interfaces';

const I18N = 'field-measuring.tangent-aiming-support';

/** Display description of each numeric input. */
export const TANGENT_AIMING_SUPPORT_NUMBER_FIELDS: Record<
  TangentAimingSupportNumericField,
  TangentAimingNumberFieldView
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
    labelKey: 'common.vertical-angle-right-support-label',
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
    labelKey: 'common.tangent-angle-label',
    unitKey: 'common.grade-unit',
    testId: 'tangent-angle-input',
    step: 0.01,
    area: 'tangentAngle'
  }
};

/** Bounds, decimals and default of each numeric input. */
export const TANGENT_AIMING_SUPPORT_FIELD_RULES: Record<TangentAimingSupportNumericField, TangentAimingFieldRule> = {
  tangentSpanLength: TANGENT_AIMING_FIELD_RULES.spanLength,
  cableHAccDistance: TANGENT_AIMING_FIELD_RULES.hAccDistance,
  cableVerticalAccAngle: TANGENT_AIMING_FIELD_RULES.verticalAccAngle,
  cableParameter: TANGENT_AIMING_FIELD_RULES.parameter,
  cableTangentAngle: TANGENT_AIMING_FIELD_RULES.tangentAngle
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
