/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Section, Study, SkyCover } from '@shared/domain';
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { TranslocoService } from '@jsverse/transloco';
import { createTestMeasureData } from './helpers';
import {
  buildFieldMeasureExportJson,
  buildGeneralExport,
  buildGroundMeasurementExport,
  buildMeasureExport,
  buildParameterCalculationExport,
  buildSpanExport,
  buildTemperatureCalculationExport,
  buildZeroWindCalculationExport,
  formatExportDateTimeWithOffset,
  formatExportMeasureDate,
  formatExportMeasureTime,
  formatExportTime
} from './field-measure-export.helpers';

describe('field-measure-export.helpers', () => {
  const mockTranslocoService = { translate: (key: string) => key } as TranslocoService;

  const mockSection: Section = {
    uuid: 'section-uuid',
    name: 'Section A',
    lit_idr: 'LIT-1',
    lit_adr: 'LIT ADR 1',
    supports: [],
    initial_conditions: [{ uuid: 'ic-1', name: 'Initial Condition 1' }],
    selected_initial_condition_uuid: 'ic-1',
    charges: [{ uuid: 'charge-1', name: 'Load case 1' }],
    selected_charge_uuid: 'charge-1'
  } as unknown as Section;

  /** Supports whose displayed numbers differ from their 1-based index. */
  const sectionWithSupports = {
    ...mockSection,
    supports: [{ number: 'P42' }, { number: 'P43' }]
  } as unknown as Section;

  const mockStudy: Study = {
    author_email: 'user@example.com',
    title: 'Test Study',
    updated_at_offline: '2026-01-27T10:00:00Z'
  } as unknown as Study;

  const mockLitData: GetSectionOutput = {
    output_parameters: {
      span_length: [100, 200, 300],
      horizontal_distance: [90, 190, 290],
      elevation: [1, 2, 3]
    }
  } as unknown as GetSectionOutput;

  const rfc9557Pattern = (offset: string): RegExp =>
    new RegExp(
      `^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}\\${offset.slice(0, 1)}${offset.slice(1)}\\[Europe/Paris\\]$`
    );
  const isParisMachine = Intl.DateTimeFormat().resolvedOptions().timeZone === 'Europe/Paris';
  /** Literal examples only hold when the machine is in the configured zone; the other tests hold anywhere. */
  const itOnParisMachine = isParisMachine ? it : it.skip;

  describe('formatExportMeasureDate', () => {
    it('should return null for a null or invalid date', () => {
      expect(formatExportMeasureDate(null)).toBeNull();
      expect(formatExportMeasureDate(new Date('invalid'))).toBeNull();
    });

    it.each([
      ['winter', new Date(2026, 0, 5, 18, 45), '2026-01-05T00:00:00.000+01:00[Europe/Paris]'],
      ['summer', new Date(2026, 6, 5, 18, 45), '2026-07-05T00:00:00.000+02:00[Europe/Paris]'],
      ['late-evening', new Date(2026, 6, 5, 23, 30), '2026-07-05T00:00:00.000+02:00[Europe/Paris]']
    ])('should format a %s date as the midnight of its day in Europe/Paris', (_season, date, expected) => {
      expect(formatExportMeasureDate(date)).toBe(expected);
    });
  });

  describe('formatExportTime', () => {
    it('should return null for a null time', () => {
      expect(formatExportTime(null)).toBeNull();
    });

    it('should format a time as HH:mm', () => {
      const result = formatExportTime(new Date(2026, 0, 5, 14, 30, 45));
      expect(result).toBe('14:30');
    });
  });

  describe('formatExportMeasureTime', () => {
    it('should return null for a null or invalid time', () => {
      expect(formatExportMeasureTime(null)).toBeNull();
      expect(formatExportMeasureTime(new Date('invalid'), new Date(2026, 0, 5))).toBeNull();
    });

    it.each([
      [
        'winter',
        new Date(2026, 0, 15),
        new Date(2026, 6, 15, 14, 30, 15),
        '2026-01-15T14:30:15.000+01:00[Europe/Paris]'
      ],
      [
        'summer',
        new Date(2026, 6, 15),
        new Date(2026, 0, 15, 14, 30, 15),
        '2026-07-15T14:30:15.000+02:00[Europe/Paris]'
      ]
    ])(
      'should combine a %s measure date with the clock of a time stored on another season day',
      (_season, date, time, expected) => {
        // The offset is the one of the measure day, not of the day stored in the time field
        expect(formatExportMeasureTime(time, date)).toBe(expected);
      }
    );

    itOnParisMachine('should write the entered time on the measure day in Europe/Paris', () => {
      expect(formatExportMeasureTime(new Date(2026, 0, 1, 16, 46, 15, 869), new Date(2026, 10, 6))).toBe(
        '2026-11-06T16:46:15.869+01:00[Europe/Paris]'
      );
      expect(formatExportMeasureTime(new Date(2026, 0, 1, 16, 46, 15, 869), new Date(2026, 6, 6))).toBe(
        '2026-07-06T16:46:15.869+02:00[Europe/Paris]'
      );
    });

    it('should fall back to the day of the time without a valid measure date', () => {
      const time = new Date(2026, 6, 15, 9, 5, 0);
      expect(formatExportMeasureTime(time, null)).toBe('2026-07-15T09:05:00.000+02:00[Europe/Paris]');
      expect(formatExportMeasureTime(time, new Date('invalid'))).toBe(formatExportMeasureTime(time, null));
    });
  });

  describe('formatExportDateTimeWithOffset', () => {
    it('should return null for a missing or invalid value', () => {
      expect(formatExportDateTimeWithOffset(null)).toBeNull();
      expect(formatExportDateTimeWithOffset('')).toBeNull();
      expect(formatExportDateTimeWithOffset('not-a-date')).toBeNull();
    });

    it('should write a legacy ISO instant as RFC 9557 in the configured zone, whatever the machine zone', () => {
      expect(formatExportDateTimeWithOffset('2026-09-30T09:11:10.819Z')).toBe(
        '2026-09-30T11:11:10.819+02:00[Europe/Paris]'
      );
      expect(formatExportDateTimeWithOffset('2026-11-13T14:29:52.604Z')).toBe(
        '2026-11-13T15:29:52.604+01:00[Europe/Paris]'
      );
    });

    it('should keep the same instant when the value is already in RFC 9557', () => {
      const value = '2026-11-13T15:29:52.604+01:00[Europe/Paris]';
      expect(formatExportDateTimeWithOffset(value)).toBe(value);
    });
  });

  describe('buildGeneralExport', () => {
    it('should map section/study fields when both are present', () => {
      const result = buildGeneralExport(mockSection, mockStudy);
      expect(result).toEqual({
        author: 'user@example.com',
        date: '2026-01-27T11:00:00.000+01:00[Europe/Paris]',
        study: 'Test Study',
        litCode: 'LIT-1',
        litName: 'LIT ADR 1',
        section: 'Section A',
        initialCondition: 'Initial Condition 1',
        loadCase: 'Load case 1'
      });
    });

    it('should read the study update date in RFC 9557, as the application now writes it', () => {
      const study = { ...mockStudy, updated_at_offline: '2026-07-14T10:30:00.123+02:00[Europe/Paris]' } as Study;
      expect(buildGeneralExport(mockSection, study).date).toBe('2026-07-14T10:30:00.123+02:00[Europe/Paris]');
    });

    it('should return null fields when section and study are null', () => {
      expect(buildGeneralExport(null, null)).toEqual({
        author: null,
        date: null,
        study: null,
        litCode: null,
        litName: null,
        section: null,
        initialCondition: null,
        loadCase: null
      });
    });
  });

  describe('buildMeasureExport', () => {
    it('should map measure identification and electrical/mechanical fields', () => {
      const measureData = createTestMeasureData({
        name: 'MT 1',
        date: new Date(2026, 0, 5),
        time: new Date(2026, 0, 5, 10, 0, 0),
        voltage: '225 kV',
        spanType: 'phase',
        cableName: 'ASTER600',
        numberOfConductors: 2,
        phaseNumber: 3,
        season: 'winter'
      });
      const result = buildMeasureExport(measureData, mockTranslocoService);
      expect(result).toMatchObject({
        name: 'MT 1',
        season: 'field-measuring.export-labels.season.winter',
        voltage: { value: '225 kV', unit: 'KV' },
        sectionType: 'common.section-type.phase',
        cable: 'ASTER600',
        cablesNumber: 2,
        phaseNumber: 3
      });
    });

    it('should export the measure date and time as RFC 9557 date-times with the measure day offset, or null without them', () => {
      const measure = buildMeasureExport(
        createTestMeasureData({ date: new Date(2026, 0, 15), time: new Date(2026, 6, 15, 14, 30, 15) }),
        mockTranslocoService
      );
      expect(measure.date).toMatch(rfc9557Pattern('+01:00'));
      expect(measure.time).toMatch(rfc9557Pattern('+01:00'));
      expect(measure.date).toBe('2026-01-15T00:00:00.000+01:00[Europe/Paris]');
      expect(measure.time).toBe('2026-01-15T14:30:15.000+01:00[Europe/Paris]');

      const empty = buildMeasureExport(createTestMeasureData({ date: null, time: null }), mockTranslocoService);
      expect(empty.date).toBeNull();
      expect(empty.time).toBeNull();
    });

    it('should return a null time for an invalid time instead of throwing', () => {
      const measureData = createTestMeasureData({ time: new Date('invalid') });
      expect(() => buildMeasureExport(measureData, mockTranslocoService)).not.toThrow();
      expect(buildMeasureExport(measureData, mockTranslocoService).time).toBeNull();
    });

    it('should translate the season through its export key', () => {
      const result = buildMeasureExport(createTestMeasureData({ season: 'summer' }), mockTranslocoService);
      expect(result.season).toBe('field-measuring.export-labels.season.summer');
    });
  });

  describe('buildSpanExport', () => {
    it('should format the span name and geographic values', () => {
      const measureData = createTestMeasureData({
        span: [0, 1],
        longitude: 1.5,
        latitude: 2.5,
        azimuth: 90,
        altitude: 150
      });
      const result = buildSpanExport(measureData, mockSection);
      expect(result).toEqual({
        name: '1 - 2',
        longitude: { value: 1.5, unit: '°' },
        latitude: { value: 2.5, unit: '°' },
        azimuth: { value: 90, unit: '°' },
        altitude: { value: 150, unit: 'm' }
      });
    });
  });

  describe('buildTemperatureCalculationExport', () => {
    it('should map environment inputs and leave calculatedTemperature undefined when not computed', () => {
      const measureData = createTestMeasureData({
        ambientTemperature: 20,
        windSpeed: 5,
        windSpeedUnit: 'kmh',
        windDirection: 'N',
        windIncidence: 10,
        measuredDiffusedPlusDirectSolarFlux: 100,
        skyCover: SkyCover.N0,
        directSolarFlux: 50,
        diffusedSolarFlux: 30,
        transit: 200
      });
      const result = buildTemperatureCalculationExport(measureData, mockTranslocoService);
      expect(result.ambientTemperature).toEqual({ value: 20, unit: '°C' });
      expect(result.wind).toEqual({
        speed: { value: 5, unit: 'field-measuring.export-labels.wind-speed-unit.kmh' },
        direction: 'N',
        incidence: { value: 10, unit: '°' }
      });
      expect(result.solarFlux).toEqual({
        measured: { value: 100, unit: 'W/m²' },
        cloudiness: SkyCover.N0,
        diffuse: { value: 30, unit: 'W/m²' },
        direct: { value: 50, unit: 'W/m²' }
      });
      expect(result.current).toEqual({ value: 200, unit: 'A' });
      expect(result.calculatedTemperature).toBeUndefined();
    });

    it('should export 90° as incidence when the wind incidence mode is perpendicular', () => {
      const measureData = createTestMeasureData({ windIncidenceMode: 'perpendicular', windIncidence: 10 });
      const result = buildTemperatureCalculationExport(measureData, mockTranslocoService);
      expect(result.wind.incidence).toEqual({ value: 90, unit: '°' });
    });

    it('should map calculatedTemperature when outputs.cableTemperature is present', () => {
      const measureData = createTestMeasureData({
        outputs: {
          papoto: null,
          cableTemperature: { cableSolarFlux: 40, cableTemperature: 35, cableTemperatureUncertainty: 2 },
          parameter15C: null,
          tangentAimingSupport: null,
          tangentAimingExterior: null,
          tangentAimingInterior: null
        }
      });
      const result = buildTemperatureCalculationExport(measureData, mockTranslocoService);
      expect(result.calculatedTemperature).toEqual({
        cableTemperature: { value: 35, unit: '°C', uncertainty: 2 },
        cableSolarFlux: { value: 40, unit: 'W/m²' }
      });
    });
  });

  describe('buildParameterCalculationExport', () => {
    it('should populate only the papoto method block for the papoto calculation method', () => {
      const measureData = createTestMeasureData({
        calculationMethod: 'papoto',
        leftSupport: 'P42',
        span: [0, 1],
        spanLength: 105,
        measuredElevationDifference: 3,
        HL: 1,
        H1: 2,
        H2: 3,
        H3: 4,
        HR: 5,
        VL: 6,
        V1: 7,
        V2: 8,
        V3: 9,
        VR: 10,
        outputs: {
          papoto: {
            parameter: 500,
            parameter_1_2: 1,
            parameter_2_3: 2,
            parameter_1_3: 3,
            checkValidity: true,
            uncertainty: 0.5
          },
          cableTemperature: null,
          parameter15C: null,
          tangentAimingSupport: null,
          tangentAimingExterior: null,
          tangentAimingInterior: null
        }
      });
      const result = buildParameterCalculationExport(
        measureData,
        sectionWithSupports,
        mockLitData,
        mockTranslocoService
      );
      expect(result.methodName).toBe('common.papoto-label');
      expect(result.subMethodName).toBeNull();
      expect(result.leftSupport).toBe('P42');
      expect(result.method.papoto).toBeDefined();
      expect(result.method.tangentialSights).toBeUndefined();
      expect(result.method.pep).toBeUndefined();
      expect(result.method.papoto?.measuredHorizontalDistance).toBeDefined();
      expect(result.method.papoto?.calculatedHorizontalDistance).toEqual({ value: 90, unit: 'm' });
      expect(result.method.papoto?.measuredVerticalDistance).toBeDefined();
      expect(result.method.papoto?.calculatedVerticalDistance).toEqual({ value: 1, unit: 'm' });
      expect(result.method.papoto?.calculatedParameter).toEqual({
        parameter: { value: 500, unit: 'm', uncertainty: 0.5 },
        criterion: { threshold: 0.5, unit: '%', status: true }
      });
    });

    const tangentOutput = { parameter: 600, uncertainty: 4, criterion: 0.8, checkValidity: false };
    const emptyOutputs = createTestMeasureData().outputs;

    it('should export the support sub-method of the tangential sights from the support form fields', () => {
      const measureData = createTestMeasureData({
        calculationMethod: 'tangente-aiming',
        span: [0, 1],
        tangentLeftSupport: '1',
        tangentSpanLength: 102,
        cableHAccDistance: 12.5,
        cableVerticalAccAngle: 95.5,
        calculationType: 'parametre',
        cableParameter: 1800,
        cableTangentAngle: 7,
        outputs: { ...emptyOutputs, tangentAimingSupport: tangentOutput }
      });
      const result = buildParameterCalculationExport(
        measureData,
        sectionWithSupports,
        mockLitData,
        mockTranslocoService
      );
      expect(result.methodName).toBe('VISEES_TANGENTES');
      expect(result.subMethodName).toBe('SUPPORT');
      expect(result.leftSupport).toBe('P43');
      expect(result.method.papoto).toBeUndefined();
      expect(result.method.pep).toBeUndefined();
      expect(result.method.tangentialSights).toEqual({
        measuredHorizontalDistance: { value: 102, unit: 'm' },
        calculatedHorizontalDistance: { value: 90, unit: 'm' },
        leftSupportMeasures: {
          verticalDistance: { value: 12.5, unit: 'm' },
          verticalAngle: { value: null, unit: 'gr' },
          horizontalDistance: { value: null, unit: 'm' }
        },
        rightSupportMeasures: { verticalAngle: { value: 95.5, unit: 'gr' } },
        calculationType: { type: 'common.parameter-label', value: 1800 },
        calculatedParameter: {
          parameter: { value: 600, unit: 'm', uncertainty: 4 },
          criterion: { threshold: 1, unit: '%', status: false }
        }
      });
    });

    it.each([
      ['tangente-aiming-exterior', 'EXTERIEUR', 'tangentAimingExterior'],
      ['tangente-aiming-interior', 'INTERIEUR', 'tangentAimingInterior']
    ] as const)('should export the %s sub-method from its own form fields', (method, subMethod, outputKey) => {
      const prefix = method === 'tangente-aiming-exterior' ? 'exterior' : 'interior';
      const measureData = createTestMeasureData({
        calculationMethod: method,
        span: [0, 1],
        [`${prefix}LeftSupport`]: '0',
        [`${prefix}SpanLength`]: 103,
        [`${prefix}HAccDistance`]: 20,
        [`${prefix}VerticalAccAngleLeft`]: 90,
        [`${prefix}VerticalAccAngleRight`]: 110,
        [`${prefix}CalculationType`]: 'tangente',
        [`${prefix}Parameter`]: 1500,
        [`${prefix}TangentAngle`]: 8,
        outputs: { ...emptyOutputs, [outputKey]: tangentOutput }
      });
      const result = buildParameterCalculationExport(
        measureData,
        sectionWithSupports,
        mockLitData,
        mockTranslocoService
      );
      expect(result.subMethodName).toBe(subMethod);
      expect(result.leftSupport).toBe('P42');
      expect(Object.keys(result.method)).toEqual(['tangentialSights']);
      expect(result.method.tangentialSights).toMatchObject({
        measuredHorizontalDistance: { value: 103, unit: 'm' },
        leftSupportMeasures: {
          verticalDistance: { value: null, unit: 'm' },
          verticalAngle: { value: 90, unit: 'gr' },
          horizontalDistance: { value: 20, unit: 'm' }
        },
        rightSupportMeasures: { verticalAngle: { value: 110, unit: 'gr' } },
        calculationType: { type: 'common.calculation-type-tangent', value: 8 },
        calculatedParameter: { criterion: { threshold: 1, unit: '%', status: false } }
      });
    });

    it('should treat a measure without calculation type as the default tangent type, like the form', () => {
      const measureData = createTestMeasureData({
        calculationMethod: 'tangente-aiming',
        calculationType: undefined,
        cableTangentAngle: 7,
        cableParameter: 1800
      });
      const result = buildParameterCalculationExport(measureData, null, null, mockTranslocoService);
      expect(result.method.tangentialSights?.calculationType).toEqual({
        type: 'common.calculation-type-tangent',
        value: 7
      });
    });

    it('should leave the tangential sights calculated parameter undefined and the length null without result', () => {
      const measureData = createTestMeasureData({ calculationMethod: 'tangente-aiming', span: null });
      const result = buildParameterCalculationExport(measureData, null, null, mockTranslocoService);
      expect(result.method.tangentialSights?.calculatedParameter).toBeUndefined();
      expect(result.method.tangentialSights?.calculatedHorizontalDistance).toEqual({ value: null, unit: 'm' });
      expect(result.leftSupport).toBeNull();
    });

    it('should export the PAPOTO angles in grades like the form', () => {
      const result = buildParameterCalculationExport(
        createTestMeasureData({ calculationMethod: 'papoto' }),
        null,
        null,
        mockTranslocoService
      );
      expect(result.method.papoto?.horizontalAngles.unit).toBe('gr');
      expect(result.method.papoto?.verticalAngles.unit).toBe('gr');
    });

    it('should populate only the pep method block for the pep calculation method', () => {
      const measureData = createTestMeasureData({ calculationMethod: 'pep' });
      const result = buildParameterCalculationExport(measureData, null, null, mockTranslocoService);
      expect(result.methodName).toBe('common.pep-label');
      expect(result.method.pep).toBeDefined();
      expect(result.method.papoto).toBeUndefined();
      expect(result.method.tangentialSights).toBeUndefined();
      expect(result.method.pep?.calculatedParameter).toBeUndefined();
    });
  });

  describe('buildZeroWindCalculationExport', () => {
    it('should use manual inputs when updateMode15C is manual', () => {
      const measureData = createTestMeasureData({
        updateMode15C: 'manual',
        manualParameterCalculation15CWithoutWind: {
          parameterPapoto: 480,
          parameterUncertaintyPapoto: 5,
          cableTemperatureCalibration: 25,
          cableTemperatureCalibrationUncertainty: 1
        }
      });
      const result = buildZeroWindCalculationExport(measureData, mockTranslocoService);
      expect(result.mode).toBe('field-measuring.export-labels.update-mode-15c.manual');
      expect(result.inputParameter).toEqual({ value: 480, unit: 'm', uncertainty: 5 });
      expect(result.inputTemperature).toEqual({ value: 25, unit: '°C', uncertainty: 1 });
      expect(result.zeroWindParameters).toEqual({
        parameter: null,
        minusParameter: null,
        plusParameter: null,
        unit: 'm'
      });
    });

    it('should use computed outputs when updateMode15C is auto', () => {
      const measureData = createTestMeasureData({
        updateMode15C: 'auto',
        outputs: {
          papoto: {
            parameter: 500,
            parameter_1_2: 1,
            parameter_2_3: 2,
            parameter_1_3: 3,
            checkValidity: true,
            uncertainty: 0.5
          },
          cableTemperature: { cableSolarFlux: 40, cableTemperature: 30, cableTemperatureUncertainty: 1.5 },
          parameter15C: { parameter15C: 480, parameter15CMinusUncertainty: 470, parameter15CPlusUncertainty: 490 },
          tangentAimingSupport: null,
          tangentAimingExterior: null,
          tangentAimingInterior: null
        }
      });
      const result = buildZeroWindCalculationExport(measureData, mockTranslocoService);
      expect(result.mode).toBe('field-measuring.export-labels.update-mode-15c.auto');
      expect(result.inputParameter).toEqual({ value: 500, unit: 'm', uncertainty: 0.5 });
      expect(result.inputTemperature).toEqual({ value: 30, unit: '°C', uncertainty: 1.5 });
      expect(result.zeroWindParameters).toEqual({
        parameter: 480,
        minusParameter: 470,
        plusParameter: 490,
        unit: 'm'
      });
    });

    it('should keep the computed parameter15C value even when the uncertainty bounds are null (current engine behavior)', () => {
      const measureData = createTestMeasureData({
        updateMode15C: 'auto',
        outputs: {
          papoto: null,
          cableTemperature: null,
          parameter15C: {
            parameter15C: -1.414,
            parameter15CMinusUncertainty: null as unknown as number,
            parameter15CPlusUncertainty: null as unknown as number
          },
          tangentAimingSupport: null,
          tangentAimingExterior: null,
          tangentAimingInterior: null
        }
      });
      const result = buildZeroWindCalculationExport(measureData, mockTranslocoService);
      expect(result.zeroWindParameters).toEqual({
        parameter: -1.414,
        minusParameter: null,
        plusParameter: null,
        unit: 'm'
      });
    });
  });

  describe('buildGroundMeasurementExport / buildFieldMeasureExportJson', () => {
    it('should compose all export blocks into a single groundMeasurement entry', () => {
      const measureData = createTestMeasureData({ name: 'MT 1' });
      const result = buildGroundMeasurementExport(
        measureData,
        mockSection,
        mockStudy,
        mockLitData,
        mockTranslocoService
      );
      expect(result).toHaveProperty('general');
      expect(result).toHaveProperty('measure');
      expect(result).toHaveProperty('span');
      expect(result).toHaveProperty('temperatureCalculation');
      expect(result).toHaveProperty('parameterCalculation');
      expect(result).toHaveProperty('zeroWindCalculation');
    });

    it('should serialize the export contract as a pretty-printed JSON string with a groundMeasurement array', () => {
      const measureData = createTestMeasureData({ name: 'MT 1' });
      const json = buildFieldMeasureExportJson(measureData, mockSection, mockStudy, mockLitData, mockTranslocoService);
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed.groundMeasurement)).toBe(true);
      expect(parsed.groundMeasurement).toHaveLength(1);
      expect(parsed.groundMeasurement[0].measure.name).toBe('MT 1');
      expect(json).toContain('\n');
    });
  });
});
