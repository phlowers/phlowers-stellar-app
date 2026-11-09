/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FieldMeasure, FieldMeasureOutputs } from '@features/studio/field-measuring/domain/types';
import { TranslocoService } from '@jsverse/transloco';
import { SkyCover } from '@shared/domain';
import {
  buildFieldMeasureExportFilename,
  buildWindDirectionOptions,
  createTestMeasureData,
  formatGenerationDate,
  getActiveParameterOutput,
  isManual15CDataValid,
  isPapotoDataValid,
  isTemperatureDataValid,
  resetInactive15CMode
} from './helpers';

describe('isPapotoDataValid', () => {
  const filled = createTestMeasureData({
    leftSupport: '1',
    spanLength: 100,
    measuredElevationDifference: 0,
    HL: 1,
    H1: 1,
    H2: 1,
    H3: 1,
    HR: 1,
    VL: 1,
    V1: 1,
    V2: 1,
    V3: 1,
    VR: 1
  });

  it('should accept a fully filled form, zeros included', () => {
    expect(isPapotoDataValid(filled)).toBe(true);
  });

  it('should reject a missing input', () => {
    expect(isPapotoDataValid({ ...filled, H2: null })).toBe(false);
    expect(isPapotoDataValid({ ...filled, leftSupport: null })).toBe(false);
  });
});

describe('isTemperatureDataValid', () => {
  const valid = createTestMeasureData({ cableName: 'CABLE', transit: 100, skyCover: SkyCover.N0 });

  it('should accept filled inputs within bounds', () => {
    expect(isTemperatureDataValid(valid)).toBe(true);
  });

  it('should reject a missing required input', () => {
    expect(isTemperatureDataValid({ ...valid, cableName: null })).toBe(false);
    expect(isTemperatureDataValid({ ...valid, transit: null })).toBe(false);
    expect(isTemperatureDataValid({ ...valid, skyCover: null })).toBe(false);
  });

  it('should reject a transit or a solar flux out of bounds', () => {
    expect(isTemperatureDataValid({ ...valid, transit: -1 })).toBe(false);
    expect(isTemperatureDataValid({ ...valid, transit: 4001 })).toBe(false);
    expect(isTemperatureDataValid({ ...valid, measuredDiffusedPlusDirectSolarFlux: 2001 })).toBe(false);
  });
});

describe('isManual15CDataValid', () => {
  const manual = {
    parameterPapoto: 1,
    parameterUncertaintyPapoto: 2,
    cableTemperatureCalibration: 3,
    cableTemperatureCalibrationUncertainty: 4
  };
  const withManual = (overrides: Partial<typeof manual> | null) =>
    createTestMeasureData({
      manualParameterCalculation15CWithoutWind: overrides === null ? null : { ...manual, ...overrides }
    });

  it('should accept all inputs filled', () => {
    expect(isManual15CDataValid(withManual({}))).toBe(true);
  });

  it('should reject missing manual inputs', () => {
    expect(isManual15CDataValid(withManual(null))).toBe(false);
    expect(isManual15CDataValid(withManual({ parameterPapoto: undefined }))).toBe(false);
    expect(isManual15CDataValid(withManual({ parameterUncertaintyPapoto: undefined }))).toBe(false);
  });

  it('should accept a negative cable temperature', () => {
    expect(isManual15CDataValid(withManual({ cableTemperatureCalibration: -5 }))).toBe(true);
  });

  it('should reject a negative uncertainty', () => {
    expect(isManual15CDataValid(withManual({ parameterUncertaintyPapoto: -1 }))).toBe(false);
    expect(isManual15CDataValid(withManual({ cableTemperatureCalibrationUncertainty: -1 }))).toBe(false);
  });
});

describe('resetInactive15CMode', () => {
  const manualInputs = {
    parameterPapoto: 1,
    parameterUncertaintyPapoto: 2,
    cableTemperatureCalibration: 3,
    cableTemperatureCalibrationUncertainty: 4
  };

  it('should drop the manual inputs in auto mode', () => {
    const data = createTestMeasureData({
      updateMode15C: 'auto',
      manualParameterCalculation15CWithoutWind: manualInputs
    });
    expect(resetInactive15CMode(data).manualParameterCalculation15CWithoutWind).toBeNull();
  });

  it('should keep the manual inputs in manual mode', () => {
    const data = createTestMeasureData({
      updateMode15C: 'manual',
      manualParameterCalculation15CWithoutWind: manualInputs
    });
    expect(resetInactive15CMode(data)).toBe(data);
  });
});

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

describe('formatGenerationDate', () => {
  const date = new Date(2026, 10, 6, 9, 5);

  it('should format the date only by default', () => {
    expect(formatGenerationDate(date)).toBe('2026-11-06');
  });

  it('should append the zero-padded hours and minutes with withTime', () => {
    expect(formatGenerationDate(date, true)).toBe('2026-11-06 09-05');
  });
});

describe('buildWindDirectionOptions', () => {
  it('should expose the 16 compass directions ordered clockwise from North', () => {
    const translocoService = { translate: (key: string) => key } as unknown as TranslocoService;
    const options = buildWindDirectionOptions(translocoService);

    expect(options.map((option) => option.value)).toEqual([
      'North',
      'North-North-East',
      'North-East',
      'East-North-East',
      'East',
      'East-South-East',
      'South-East',
      'South-South-East',
      'South',
      'South-South-West',
      'South-West',
      'West-South-West',
      'West',
      'West-North-West',
      'North-West',
      'North-North-West'
    ]);
    expect(options[1].label).toBe('field-measuring.shared.wind-direction.north-north-east');
  });
});
