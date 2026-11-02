/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FieldMeasure, FieldMeasureOutputs } from '@features/studio/field-measuring/domain/types';
import { buildFieldMeasureExportFilename, createTestMeasureData, getActiveParameterOutput } from './helpers';

describe('getActiveParameterOutput', () => {
  const result = { parameter: 1200, uncertainty: 2, criterion: 1, checkValidity: true };
  const papoto = { parameter: 900, uncertainty: 3 };

  const withOutputs = (calculationMethod: FieldMeasure['calculationMethod'], outputs: Partial<FieldMeasureOutputs>) => {
    const measureData = createTestMeasureData({ calculationMethod });
    return { calculationMethod, outputs: { ...measureData.outputs, ...outputs } };
  };

  it.each([
    ['tangente-aiming', 'tangentAimingSupport'],
    ['tangente-aiming-exterior', 'tangentAimingExterior'],
    ['tangente-aiming-interior', 'tangentAimingInterior']
  ] as const)('should return the %s result', (method, outputKey) => {
    expect(getActiveParameterOutput(withOutputs(method, { [outputKey]: result }))).toEqual({
      parameter: 1200,
      uncertainty: 2
    });
  });

  it.each(['tangente-aiming', 'tangente-aiming-exterior', 'tangente-aiming-interior'] as const)(
    'should return null without result for %s, never falling back to the PAPOTO result',
    (method) => {
      expect(
        getActiveParameterOutput(withOutputs(method, { papoto: papoto as FieldMeasureOutputs['papoto'] }))
      ).toBeNull();
    }
  );

  it('should return the PAPOTO result for the PAPOTO method', () => {
    expect(
      getActiveParameterOutput(withOutputs('papoto', { papoto: { ...papoto } as FieldMeasureOutputs['papoto'] }))
    ).toEqual(papoto);
  });
});

describe('buildFieldMeasureExportFilename', () => {
  const date = new Date(2026, 8, 30);

  it('should keep accents, spaces and hyphens', () => {
    const measureData = createTestMeasureData({ name: 'MT-2 - Portée-AB1-AB2' });
    expect(buildFieldMeasureExportFilename(measureData, 'Canton démo 3', date)).toBe(
      'Export Mesure de terrain_MT-2 - Portée-AB1-AB2_Canton démo 3_2026-09-30'
    );
  });

  it('should remove forbidden file system characters', () => {
    const measureData = createTestMeasureData({ name: 'a/b:c*d?e"f<g>h|i\\j' });
    expect(buildFieldMeasureExportFilename(measureData, 'sec', date)).toBe(
      'Export Mesure de terrain_abcdefghij_sec_2026-09-30'
    );
  });

  it('should fall back to field-measure when the measure name is empty after sanitizing', () => {
    const measureData = createTestMeasureData({ name: '  ' });
    expect(buildFieldMeasureExportFilename(measureData, null, date)).toBe(
      'Export Mesure de terrain_field-measure_field-measure_2026-09-30'
    );
  });
});
