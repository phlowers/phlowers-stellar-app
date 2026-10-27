/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import {
  TangentAimingFieldRule,
  TangentAimingNumberFieldView
} from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-common/tangent-aiming-common.interfaces';
import { TANGENT_AIMING_FIELD_RULES } from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-common/tangent-aiming-common.constantes';
import {
  TangentAimingExteriorCalculationType,
  TangentAimingExteriorInputField,
  TangentAimingExteriorNumericField
} from './tangent-aiming-exterior.interfaces';

/** Display description of each numeric input. */
export const TANGENT_AIMING_EXTERIOR_NUMBER_FIELDS: Record<
  TangentAimingExteriorNumericField,
  TangentAimingNumberFieldView
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
    labelKey: 'common.tangent-aiming-h-acc-distance-label',
    unitKey: 'common.meter',
    testId: 'h-acc-distance-input',
    step: 0.01,
    area: 'hDistance'
  },
  verticalAccAngleLeft: {
    id: 'taeVerticalAccAngleLeft',
    labelKey: 'common.tangent-aiming-vertical-acc-angle-left-label',
    unitKey: 'common.grade-unit',
    testId: 'vertical-acc-angle-left-input',
    step: 0.01,
    area: 'vAngleLeft'
  },
  verticalAccAngleRight: {
    id: 'taeVerticalAccAngleRight',
    labelKey: 'common.vertical-angle-right-support-label',
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
    area: 'parameter'
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

/** Bounds, decimals and default of each numeric input, shared with the other tangent aiming forms. */
export const TANGENT_AIMING_EXTERIOR_FIELD_RULES: Record<TangentAimingExteriorNumericField, TangentAimingFieldRule> = {
  spanLength: TANGENT_AIMING_FIELD_RULES.spanLength,
  hAccDistance: TANGENT_AIMING_FIELD_RULES.hAccDistance,
  verticalAccAngleLeft: TANGENT_AIMING_FIELD_RULES.verticalAccAngle,
  verticalAccAngleRight: TANGENT_AIMING_FIELD_RULES.verticalAccAngle,
  parameter: TANGENT_AIMING_FIELD_RULES.parameter,
  tangentAngle: TANGENT_AIMING_FIELD_RULES.tangentAngle
};

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
