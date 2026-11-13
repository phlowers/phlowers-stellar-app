/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { createTestMeasureData } from './helpers';
import { TANGENT_AIMING_MODES } from './tangent-aiming-modes.constantes';

describe('TANGENT_AIMING_MODES', () => {
  const methods = ['tangente-aiming', 'tangente-aiming-exterior', 'tangente-aiming-interior'] as const;

  it('should only hold the tangent aiming methods', () => {
    expect(Object.keys(TANGENT_AIMING_MODES)).toEqual(methods);
    expect(TANGENT_AIMING_MODES['papoto']).toBeUndefined();
    expect(TANGENT_AIMING_MODES['pep']).toBeUndefined();
  });

  it.each(methods)('%s should clear its own result only when invalidated', (method) => {
    const mode = TANGENT_AIMING_MODES[method]!;
    const result = { parameter: 1, uncertainty: 1, criterion: 1, checkValidity: true };
    const outputs = {
      ...createTestMeasureData().outputs,
      tangentAimingSupport: result,
      tangentAimingExterior: result,
      tangentAimingInterior: result
    } as FieldMeasure['outputs'];

    const invalidated = mode.invalidateResult(createTestMeasureData({ calculationMethod: method, outputs }));

    expect(invalidated.outputs[mode.outputKey]).toBeNull();
    const others = methods.filter((other) => other !== method).map((other) => TANGENT_AIMING_MODES[other]!.outputKey);
    others.forEach((key) => expect(invalidated.outputs[key]).toEqual(result));
  });

  it.each(methods)('%s should complete the defaults of an empty measure and be valid once completed', (method) => {
    const mode = TANGENT_AIMING_MODES[method]!;
    const completed = mode.applyDefaults(createTestMeasureData({ calculationMethod: method }), '1');

    expect(mode.isDataValid(completed)).toBe(true);
    expect(mode.resetNonDisplayedFields(completed)).not.toEqual(completed);
  });
});
