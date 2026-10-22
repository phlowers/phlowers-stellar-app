/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import {
  TangentAimingSupportFieldRule,
  TangentAimingSupportNumberFieldView,
  TangentAimingSupportNumericField
} from '../tangent-aiming-support/tangent-aiming-support.interfaces';
import { TANGENT_AIMING_SUPPORT_FIELD_RULES } from '../tangent-aiming-support/tangent-aiming-support.constantes';
import {
  TangentAimingExteriorCalculationType,
  TangentAimingExteriorInputField,
  TangentAimingExteriorNumericField
} from './tangent-aiming-exterior.interfaces';

const I18N = 'field-measuring.tangent-aiming-exterior';

/** Display description of each numeric input. */
export const TANGENT_AIMING_EXTERIOR_NUMBER_FIELDS: Record<
  TangentAimingExteriorNumericField,
  TangentAimingSupportNumberFieldView
> = {
  spanLength: {
    id: 'taeSpanLength',
    labelKey: 'common.measured-span-length-label',
    unitKey: 'common.meter',
    testId: 'span-length-input',
    step: 0.01,
    area: 'spanLength'
  },
  hAccDistance: {
    id: 'taeHAccDistance',
    labelKey: `${I18N}.h-acc-distance-label`,
    unitKey: 'common.meter',
    testId: 'h-acc-distance-input',
    step: 0.01,
    area: 'hDistance'
  },
  verticalAccAngleLeft: {
    id: 'taeVerticalAccAngleLeft',
    labelKey: `${I18N}.vertical-acc-angle-left-label`,
    unitKey: 'common.grade-unit',
    testId: 'vertical-acc-angle-left-input',
    step: 0.01,
    area: 'vAngleLeft'
  },
  verticalAccAngleRight: {
    id: 'taeVerticalAccAngleRight',
    labelKey: `${I18N}.vertical-acc-angle-right-label`,
    unitKey: 'common.grade-unit',
    testId: 'vertical-acc-angle-right-input',
    step: 0.01,
    area: 'vAngleRight'
  },
  parameter: {
    id: 'taeParameter',
    labelKey: 'common.parameter-label',
    unitKey: 'common.meter',
    testId: 'parameter-input',
    step: 1,
    area: 'tangentAngle'
  },
  tangentAngle: {
    id: 'taeTangentAngle',
    labelKey: 'common.tangent-angle-label',
    unitKey: 'common.grade-unit',
    testId: 'tangent-angle-input',
    step: 0.01,
    area: 'tangentAngle'
  }
};

/** Support field whose rule (bounds, decimals, default) each exterior numeric input reuses. */
export const TANGENT_AIMING_EXTERIOR_RULE_FIELDS: Record<
  TangentAimingExteriorNumericField,
  TangentAimingSupportNumericField
> = {
  spanLength: 'tangentSpanLength',
  hAccDistance: 'cableHAccDistance',
  verticalAccAngleLeft: 'cableVerticalAccAngle',
  verticalAccAngleRight: 'cableVerticalAccAngle',
  parameter: 'cableParameter',
  tangentAngle: 'cableTangentAngle'
};

/** Bounds, decimals and default of each numeric input, shared with the tangent aiming (support) form. */
export const TANGENT_AIMING_EXTERIOR_FIELD_RULES = Object.fromEntries(
  Object.entries(TANGENT_AIMING_EXTERIOR_RULE_FIELDS).map(([field, ruleField]) => [
    field,
    TANGENT_AIMING_SUPPORT_FIELD_RULES[ruleField]
  ])
) as Record<TangentAimingExteriorNumericField, TangentAimingSupportFieldRule>;

/** Inputs always displayed, whatever the calculation type. */
export const TANGENT_AIMING_EXTERIOR_COMMON_FIELDS: TangentAimingExteriorInputField[] = [
  'leftSupport',
  'spanLength',
  'hAccDistance',
  'verticalAccAngleLeft',
  'verticalAccAngleRight'
];

/** Input shown only for the given calculation type. */
export const TANGENT_AIMING_EXTERIOR_TYPE_FIELD: Record<
  TangentAimingExteriorCalculationType,
  TangentAimingExteriorNumericField
> = {
  parametre: 'parameter',
  tangente: 'tangentAngle'
};

/** `FieldMeasure` field persisting each input of the form. */
export const TANGENT_AIMING_EXTERIOR_MODEL_FIELDS: Record<TangentAimingExteriorInputField, keyof FieldMeasure> = {
  leftSupport: 'exteriorLeftSupport',
  spanLength: 'exteriorSpanLength',
  hAccDistance: 'exteriorHAccDistance',
  verticalAccAngleLeft: 'exteriorVerticalAccAngleLeft',
  verticalAccAngleRight: 'exteriorVerticalAccAngleRight',
  parameter: 'exteriorParameter',
  tangentAngle: 'exteriorTangentAngle'
};
