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
  formatExportDate,
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

  const mockStudy: Study = {
    author_email: 'user@example.com',
    title: 'Test Study',
    updated_at_offline: '2026-01-27T10:00:00Z'
  } as unknown as Study;

  const mockLitData: GetSectionOutput = {
    output_parameters: {
      span_length: [100, 200, 300],
      elevation: [1, 2, 3]
    }
  } as unknown as GetSectionOutput;

  describe('formatExportDate', () => {
    it('should return null for a null date', () => {
      expect(formatExportDate(null)).toBeNull();
    });

    it('should format a date as YYYY-MM-DD', () => {
      expect(formatExportDate(new Date(2026, 0, 5))).toBe('2026-01-05');
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

  describe('buildGeneralExport', () => {
    it('should map section/study fields when both are present', () => {
      const result = buildGeneralExport(mockSection, mockStudy);
      expect(result).toEqual({
        author: 'user@example.com',
        date: '2026-01-27T10:00:00Z',
        study: 'Test Study',
        litCode: 'LIT-1',
        litName: 'LIT ADR 1',
        section: 'Section A',
        initialCondition: 'Initial Condition 1',
        loadCase: 'Load case 1'
      });
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
        cableName: 'ASTER570',
        numberOfConductors: 2,
        phaseNumber: 3
      });
      const result = buildMeasureExport(measureData, mockTranslocoService);
      expect(result).toMatchObject({
        name: 'MT 1',
        voltage: { value: '225 kV', unit: 'KV' },
        sectionType: 'common.section-type.phase',
        cable: 'ASTER570',
        cablesNumber: 2,
        phaseNumber: 3
      });
    });
  });

  describe('buildSpanExport', () => {
    it('should format the span name and geographic values', () => {
      const measureData = createTestMeasureData({
        span: [0, 1],
        longitude: 1.5,
        latitude: 2.5,
        azimuth: 90
      });
      const result = buildSpanExport(measureData, mockSection);
      expect(result).toEqual({
        name: '1 - 2',
        longitude: { value: 1.5, unit: '°' },
        latitude: { value: 2.5, unit: '°' },
        azimuth: { value: 90, unit: '°' }
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

    it('should map calculatedTemperature when outputs.cableTemperature is present', () => {
      const measureData = createTestMeasureData({
        outputs: {
          papoto: null,
          cableTemperature: { cableSolarFlux: 40, cableTemperature: 35, cableTemperatureUncertainty: 2 },
          parameter15C: null
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
        leftSupport: '0',
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
          parameter15C: null
        }
      });
      const result = buildParameterCalculationExport(measureData, mockLitData, mockTranslocoService);
      expect(result.methodName).toBe('common.papoto-label');
      expect(result.subMethodName).toBeNull();
      expect(result.leftSupport).toBe('0');
      expect(result.method.papoto).toBeDefined();
      expect(result.method.tangentialSights).toBeUndefined();
      expect(result.method.pep).toBeUndefined();
      expect(result.method.papoto?.calculatedLength).toEqual({ value: 100, unit: 'm' });
      expect(result.method.papoto?.calculatedElevation).toEqual({ value: 1, unit: 'm' });
      expect(result.method.papoto?.calculatedParameter).toEqual({
        parameter: { value: 500, unit: 'm', uncertainty: 0.5 },
        criterion: { value: 0.5, unit: '%', status: true }
      });
    });

    it('should populate only the tangentialSights method block for the tangente-aiming calculation method', () => {
      const measureData = createTestMeasureData({ calculationMethod: 'tangente-aiming' });
      const result = buildParameterCalculationExport(measureData, null, mockTranslocoService);
      expect(result.methodName).toBe('field-measuring.export-labels.calculation-method.tangente-aiming');
      expect(result.method.tangentialSights).toBeDefined();
      expect(result.method.papoto).toBeUndefined();
      expect(result.method.pep).toBeUndefined();
      expect(result.method.tangentialSights?.calculatedParameter).toBeUndefined();
    });

    it('should populate only the pep method block for the pep calculation method', () => {
      const measureData = createTestMeasureData({ calculationMethod: 'pep' });
      const result = buildParameterCalculationExport(measureData, null, mockTranslocoService);
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
          parameter15C: { parameter15C: 480, parameter15CMinusUncertainty: 470, parameter15CPlusUncertainty: 490 }
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
          }
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
