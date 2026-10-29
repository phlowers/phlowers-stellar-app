/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  TangentAimingSupportFieldRule,
  TangentAimingSupportNumberFieldView
} from '../tangent-aiming-support/tangent-aiming-support.interfaces';
import { TANGENT_AIMING_SHARED_I18N } from '../tangent-aiming-support/tangent-aiming-support.constantes';
import { TANGENT_AIMING_EXTERIOR_FIELD_RULES } from '../tangent-aiming-exterior/tangent-aiming-exterior.constantes';
import { TangentAimingInteriorNumericField } from './tangent-aiming-interior.interfaces';

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
    labelKey: `${TANGENT_AIMING_SHARED_I18N}.h-acc-distance-label`,
    unitKey: 'common.meter',
    testId: 'h-acc-distance-input',
    step: 0.01,
    area: 'hDistance'
  },
  verticalAccAngleLeft: {
    id: 'taiVerticalAccAngleLeft',
    labelKey: `${TANGENT_AIMING_SHARED_I18N}.vertical-acc-angle-left-label`,
    unitKey: 'common.grade-unit',
    testId: 'vertical-acc-angle-left-input',
    step: 0.01,
    area: 'vAngleLeft'
  },
  verticalAccAngleRight: {
    id: 'taiVerticalAccAngleRight',
    labelKey: 'common.vertical-angle-right-support-label',
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

/** Bounds, decimals and default of each numeric input, shared with the tangent aiming (exterior) form. */
export const TANGENT_AIMING_INTERIOR_FIELD_RULES: Record<
  TangentAimingInteriorNumericField,
  TangentAimingSupportFieldRule
> = {
  spanLength: TANGENT_AIMING_EXTERIOR_FIELD_RULES.spanLength,
  hAccDistance: TANGENT_AIMING_EXTERIOR_FIELD_RULES.hAccDistance,
  verticalAccAngleLeft: TANGENT_AIMING_EXTERIOR_FIELD_RULES.verticalAccAngleLeft,
  verticalAccAngleRight: TANGENT_AIMING_EXTERIOR_FIELD_RULES.verticalAccAngleRight,
  parameter: TANGENT_AIMING_EXTERIOR_FIELD_RULES.parameter
};
