/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { TangentAimingMode } from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-common/tangent-aiming-common.interfaces';
import {
  applyTangentAimingExteriorDefaults,
  invalidateTangentAimingExteriorResult,
  isTangentAimingExteriorDataValid,
  resetNonDisplayedExteriorFields
} from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-exterior/tangent-aiming-exterior.helpers';
import {
  applyTangentAimingInteriorDefaults,
  invalidateTangentAimingInteriorResult,
  isTangentAimingInteriorDataValid,
  resetNonDisplayedInteriorFields
} from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-interior/tangent-aiming-interior.helpers';
import {
  applyTangentAimingSupportDefaults,
  invalidateTangentAimingSupportResult,
  isTangentAimingSupportDataValid,
  resetNonDisplayedParameterFields
} from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-support/tangent-aiming-support.helpers';

/** Tangent aiming modes by calculation method; any other method (PAPOTO, PEP) is absent. */
export const TANGENT_AIMING_MODES: Partial<Record<FieldMeasure['calculationMethod'], TangentAimingMode>> = {
  'tangente-aiming': {
    outputKey: 'tangentAimingSupport',
    isDataValid: isTangentAimingSupportDataValid,
    applyDefaults: applyTangentAimingSupportDefaults,
    invalidateResult: invalidateTangentAimingSupportResult,
    resetNonDisplayedFields: resetNonDisplayedParameterFields
  },
  'tangente-aiming-exterior': {
    outputKey: 'tangentAimingExterior',
    isDataValid: isTangentAimingExteriorDataValid,
    applyDefaults: applyTangentAimingExteriorDefaults,
    invalidateResult: invalidateTangentAimingExteriorResult,
    resetNonDisplayedFields: resetNonDisplayedExteriorFields
  },
  'tangente-aiming-interior': {
    outputKey: 'tangentAimingInterior',
    isDataValid: isTangentAimingInteriorDataValid,
    applyDefaults: applyTangentAimingInteriorDefaults,
    invalidateResult: invalidateTangentAimingInteriorResult,
    resetNonDisplayedFields: resetNonDisplayedInteriorFields
  }
};
