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
  TangentAimingInteriorInputField,
  TangentAimingInteriorNumericField
} from './tangent-aiming-interior.interfaces';

/** Display description of each numeric input. */
export const TANGENT_AIMING_INTERIOR_NUMBER_FIELDS: Record<
  TangentAimingInteriorNumericField,
  TangentAimingSupportNumberFieldView
> = {
  spanLength: {
    id: 'taiSpanLength',
    labelKey: 'common.measured-span-length-label',
    unitKey: 'common.meter',
    testId: 'span-length-input',
    step: 0.01,
    area: 'spanLength'
  },
  hAccDistance: {
    id: 'taiHAccDistance',
    labelKey: 'common.tangent-aiming-h-acc-distance-label',
    unitKey: 'common.meter',
    testId: 'h-acc-distance-input',
    step: 0.01,
    area: 'hDistance'
  },
  verticalAccAngleLeft: {
    id: 'taiVerticalAccAngleLeft',
    labelKey: 'common.tangent-aiming-vertical-acc-angle-left-label',
    unitKey: 'common.grade-unit',
    testId: 'vertical-acc-angle-left-input',
    step: 0.01,
    area: 'vAngleLeft'
  },
  verticalAccAngleRight: {
    id: 'taiVerticalAccAngleRight',
    labelKey: 'common.tangent-aiming-vertical-acc-angle-right-label',
    unitKey: 'common.grade-unit',
    testId: 'vertical-acc-angle-right-input',
    step: 0.01,
    area: 'vAngleRight'
  },
  parameter: {
    id: 'taiParameter',
    labelKey: 'common.parameter-label',
    unitKey: 'common.meter',
    testId: 'parameter-input',
    step: 1,
    area: 'parameter'
  }
};

/** Support field whose rule (bounds, decimals, default) each interior numeric input reuses. */
export const TANGENT_AIMING_INTERIOR_RULE_FIELDS: Record<
  TangentAimingInteriorNumericField,
  TangentAimingSupportNumericField
> = {
  spanLength: 'tangentSpanLength',
  hAccDistance: 'cableHAccDistance',
  verticalAccAngleLeft: 'cableVerticalAccAngle',
  verticalAccAngleRight: 'cableVerticalAccAngle',
  parameter: 'cableParameter'
};

/** Bounds, decimals and default of each numeric input, shared with the tangent aiming (support) form. */
export const TANGENT_AIMING_INTERIOR_FIELD_RULES: Record<
  TangentAimingInteriorNumericField,
  TangentAimingSupportFieldRule
> = {
  ...(Object.fromEntries(
    Object.entries(TANGENT_AIMING_INTERIOR_RULE_FIELDS).map(([field, ruleField]) => [
      field,
      TANGENT_AIMING_SUPPORT_FIELD_RULES[ruleField]
    ])
  ) as Record<TangentAimingInteriorNumericField, TangentAimingSupportFieldRule>),
  // RG.VIS-INT.DIS-HSG.1: the interior horizontal distance goes up to 5000 m, unlike the support/exterior one.
  hAccDistance: { ...TANGENT_AIMING_SUPPORT_FIELD_RULES.cableHAccDistance, max: 5000 }
};

/** `FieldMeasure` field persisting each input of the form. */
export const TANGENT_AIMING_INTERIOR_MODEL_FIELDS: Record<TangentAimingInteriorInputField, keyof FieldMeasure> = {
  leftSupport: 'interiorLeftSupport',
  spanLength: 'interiorSpanLength',
  hAccDistance: 'interiorHAccDistance',
  verticalAccAngleLeft: 'interiorVerticalAccAngleLeft',
  verticalAccAngleRight: 'interiorVerticalAccAngleRight',
  parameter: 'interiorParameter'
};
