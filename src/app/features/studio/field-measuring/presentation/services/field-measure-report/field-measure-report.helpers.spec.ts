/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { vi } from 'vitest';
import type jsPDF from 'jspdf';

import { TranslocoService } from '@jsverse/transloco';

import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { createTestMeasureData } from '@features/studio/field-measuring/presentation/helpers';
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { Section, Study } from '@shared/domain';

import { LABEL_KEYS } from './field-measure-report.constantes';
import {
  buildCartoucheData,
  buildFieldMeasureReportData,
  buildFieldMeasureReportFilename,
  buildParameter15CRows,
  buildParameterCalculationRows,
  buildTemperatureCalculationRows,
  buildTerrainDataRows,
  drawFieldMeasureSection,
  formatFileDate,
  splitRowsIntoColumns
} from './field-measure-report.helpers';
import { FieldMeasureReportRow } from './field-measure-report.interfaces';

// Returns the key, with the interpolation params when any, so tests assert on keys rather than on a language
const translocoService = {
  translate: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key)
} as unknown as TranslocoService;

const section = {
  name: 'Section A',
  comment: 'Section comment',
  supports: [{ number: '11' }, { number: '12' }],
  initial_conditions: [{ uuid: 'ic-1', name: 'IC 1' }],
  selected_initial_condition_uuid: 'ic-1',
  charges: [{ uuid: 'ch-1', name: 'Load 1', description: 'Load description' }],
  selected_charge_uuid: 'ch-1'
} as unknown as Section;

const study = { author_email: 'author@example.test', title: 'Study 1', description: 'Study description' } as Study;

const litData = {
  output_parameters: { span_length: [250.456, 0], elevation: [12.345, 0] }
} as unknown as GetSectionOutput;

const papotoResult = {
  parameter: 1234.4,
  uncertainty: 5.4,
  parameter_1_2: 1200.1,
  parameter_2_3: 1210.2,
  parameter_1_3: 1220.3,
  checkValidity: true
};

const tangentResult = { parameter: 900.6, uncertainty: 3.2, criterion: 1, checkValidity: false };

const measure = (overrides: Partial<FieldMeasure> = {}): FieldMeasure =>
  createTestMeasureData({ name: 'Measure 1', span: [0, 1], ...overrides });

const labels = (rows: FieldMeasureReportRow[], column: 0 | 1): (string | undefined)[] =>
  rows.map((row) => row[column]?.label);

const findItem = (rows: FieldMeasureReportRow[], label: string) => rows.flat().find((cell) => cell?.label === label);

describe('field-measure-report helpers', () => {
  describe('buildTerrainDataRows', () => {
    it('should list the measure data in the report order, with the phase number for a phase section', () => {
      const rows = buildTerrainDataRows(
        measure({ spanType: 'phase', phaseNumber: 2 }),
        section,
        translocoService,
        'fr-FR'
      );

      expect(labels(rows, 0)).toEqual([
        LABEL_KEYS.measureName,
        LABEL_KEYS.measureDate,
        LABEL_KEYS.ambientTemperature,
        LABEL_KEYS.windDirection,
        LABEL_KEYS.link,
        LABEL_KEYS.voltage,
        LABEL_KEYS.sectionType,
        LABEL_KEYS.span,
        LABEL_KEYS.longitude,
        LABEL_KEYS.altitude
      ]);
      expect(findItem(rows, LABEL_KEYS.phaseNumber)?.value).toBe('2');
      expect(findItem(rows, LABEL_KEYS.span)?.value).toBe('11 - 12');
    });

    it('should omit the phase number when the section is not a phase', () => {
      const rows = buildTerrainDataRows(measure({ spanType: 'guard' }), section, translocoService, 'fr-FR');

      expect(findItem(rows, LABEL_KEYS.phaseNumber)).toBeUndefined();
      expect(findItem(rows, LABEL_KEYS.sectionType)?.value).toBe('common.section-type.guard');
    });

    it('should convert a km/h wind speed to m/s with one decimal and format the other quantities', () => {
      const rows = buildTerrainDataRows(
        measure({
          windSpeed: 36,
          windSpeedUnit: 'kmh',
          ambientTemperature: 20.4,
          longitude: 1.23456789,
          latitude: 45,
          altitude: 100,
          azimuth: 123.4
        }),
        section,
        translocoService,
        'fr-FR'
      );

      expect(findItem(rows, LABEL_KEYS.windSpeed)?.value).toBe('10.0 m/s');
      expect(findItem(rows, LABEL_KEYS.ambientTemperature)?.value).toBe('20 °C');
      expect(findItem(rows, LABEL_KEYS.longitude)?.value).toBe('1.2345679 °');
      expect(findItem(rows, LABEL_KEYS.latitude)?.value).toBe('45.0000000 °');
      expect(findItem(rows, LABEL_KEYS.altitude)?.value).toBe('100.00 m');
      expect(findItem(rows, LABEL_KEYS.azimuth)?.value).toBe('123 °');
    });

    it('should keep a m/s wind speed unchanged and show a dash for missing values', () => {
      const rows = buildTerrainDataRows(
        measure({ windSpeed: 4, windSpeedUnit: 'ms', windDirection: null, skyCover: null, date: null, time: null }),
        null,
        translocoService,
        'fr-FR'
      );

      expect(findItem(rows, LABEL_KEYS.windSpeed)?.value).toBe('4.0 m/s');
      expect(findItem(rows, LABEL_KEYS.windDirection)?.value).toBe('-');
      expect(findItem(rows, LABEL_KEYS.skyCover)?.value).toBe('-');
      expect(findItem(rows, LABEL_KEYS.measureDate)?.value).toBe('-');
      expect(findItem(rows, LABEL_KEYS.measureTime)?.value).toBe('-');
      expect(findItem(rows, LABEL_KEYS.span)?.value).toBe('1 - 2');
    });

    it('should translate the stored wind direction and sky cover', () => {
      const rows = buildTerrainDataRows(
        measure({ windDirection: 'North-East', skyCover: 'N1' as FieldMeasure['skyCover'] }),
        section,
        translocoService,
        'fr-FR'
      );

      expect(findItem(rows, LABEL_KEYS.windDirection)?.value).toBe('field-measuring.shared.wind-direction.north-east');
      expect(findItem(rows, LABEL_KEYS.skyCover)?.value).toBe('field-measuring.shared.sky-cover.n1');
    });

    it('should keep the raw value of a sky cover without translation key and of an unknown wind direction', () => {
      const rows = buildTerrainDataRows(
        measure({ windDirection: 'Unknown', skyCover: 'N0' as FieldMeasure['skyCover'] }),
        section,
        translocoService,
        'fr-FR'
      );

      expect(findItem(rows, LABEL_KEYS.windDirection)?.value).toBe('Unknown');
      expect(findItem(rows, LABEL_KEYS.skyCover)?.value).toBe('N0');
    });
  });

  describe('buildParameterCalculationRows', () => {
    it('should report the PAPOTO method with angles in grades, calculated values and the criterion status', () => {
      const rows = buildParameterCalculationRows(
        measure({
          calculationMethod: 'papoto',
          leftSupport: '11',
          spanLength: 250,
          measuredElevationDifference: 12,
          HL: 1,
          VL: 2,
          outputs: { ...measure().outputs, papoto: papotoResult }
        }),
        section,
        litData,
        translocoService
      );

      expect(rows).toHaveLength(12);
      expect(findItem(rows, LABEL_KEYS.method)?.value).toBe('common.papoto-label');
      expect(findItem(rows, LABEL_KEYS.leftSupport)?.value).toBe('11');
      expect(findItem(rows, LABEL_KEYS.measuredLength)?.value).toBe('250.00 m');
      expect(findItem(rows, LABEL_KEYS.calculatedLength)?.value).toBe('250.46 m');
      expect(findItem(rows, LABEL_KEYS.calculatedElevation)?.value).toBe('12.35 m');
      expect(findItem(rows, 'HG')?.value).toBe('1.000 gr');
      expect(findItem(rows, 'VG')?.value).toBe('2.000 gr');
      expect(findItem(rows, LABEL_KEYS.parameter)?.value).toBe('1234 m');
      expect(findItem(rows, LABEL_KEYS.uncertainty)?.value).toBe('5 m');
      expect(findItem(rows, LABEL_KEYS.parameter12)?.value).toBe('1200 m');
      expect(findItem(rows, LABEL_KEYS.parameter13)?.value).toBe('1220 m');
      expect(findItem(rows, LABEL_KEYS.criterion)).toMatchObject({ value: 'common.yes', status: true });
    });

    it('should show dashes and no status icon while PAPOTO is not calculated and no litData is available', () => {
      const rows = buildParameterCalculationRows(
        measure({ calculationMethod: 'papoto' }),
        null,
        null,
        translocoService
      );

      expect(findItem(rows, LABEL_KEYS.calculatedLength)?.value).toBe('-');
      expect(findItem(rows, LABEL_KEYS.parameter)?.value).toBe('-');
      expect(findItem(rows, LABEL_KEYS.criterion)).toMatchObject({ value: '-', status: undefined });
    });

    it('should report a failed criterion with a negative status', () => {
      const rows = buildParameterCalculationRows(
        measure({
          calculationMethod: 'papoto',
          outputs: { ...measure().outputs, papoto: { ...papotoResult, checkValidity: false } }
        }),
        section,
        litData,
        translocoService
      );

      expect(findItem(rows, LABEL_KEYS.criterion)).toMatchObject({ value: 'common.no', status: false });
    });

    it('should report the tangent aiming (support) method with the tangent angle and no left angle', () => {
      const rows = buildParameterCalculationRows(
        measure({
          calculationMethod: 'tangente-aiming',
          calculationType: 'tangente',
          tangentLeftSupport: '1',
          tangentSpanLength: 250,
          cableHAccDistance: 3,
          cableVerticalAccAngle: 10,
          cableTangentAngle: 5,
          cableParameter: 800,
          outputs: { ...measure().outputs, tangentAimingSupport: tangentResult }
        }),
        section,
        litData,
        translocoService
      );

      expect(findItem(rows, LABEL_KEYS.method)?.value).toBe(
        'field-measuring.calculus-setting.tangent-aiming-radio-label'
      );
      expect(findItem(rows, LABEL_KEYS.leftSupport)?.value).toBe('12');
      expect(findItem(rows, LABEL_KEYS.verticalDistanceLeft)?.value).toBe('3.00 m');
      expect(findItem(rows, LABEL_KEYS.verticalAngleLeft)).toBeUndefined();
      expect(findItem(rows, LABEL_KEYS.verticalAngleRight)?.value).toBe('10 gr');
      expect(findItem(rows, LABEL_KEYS.calculationType)?.value).toBe('common.tangent-angle-label');
      expect(findItem(rows, LABEL_KEYS.tangentAngle)?.value).toBe('5 gr');
      expect(findItem(rows, LABEL_KEYS.parameter)?.value).toBe('901 m');
      expect(findItem(rows, LABEL_KEYS.criterion)).toMatchObject({ value: 'common.no', status: false });
    });

    it('should report the entered parameter instead of the tangent angle for the "parameter" calculation type', () => {
      const rows = buildParameterCalculationRows(
        measure({
          calculationMethod: 'tangente-aiming',
          calculationType: 'parametre',
          cableParameter: 800,
          cableTangentAngle: 5
        }),
        section,
        litData,
        translocoService
      );

      expect(findItem(rows, LABEL_KEYS.tangentAngle)).toBeUndefined();
      const typeRow = rows.find((row) => row[0]?.label === LABEL_KEYS.calculationType);
      expect(typeRow?.[0]?.value).toBe('common.parameter-label');
      expect(typeRow?.[1]).toMatchObject({ label: LABEL_KEYS.parameter, value: '800 m' });
    });

    it.each([
      [
        'tangente-aiming-exterior',
        'exteriorLeftSupport',
        'exteriorVerticalAccAngleLeft',
        'exteriorVerticalAccAngleRight'
      ],
      [
        'tangente-aiming-interior',
        'interiorLeftSupport',
        'interiorVerticalAccAngleLeft',
        'interiorVerticalAccAngleRight'
      ]
    ] as const)(
      'should report the %s method with horizontal distance and both vertical angles',
      (method, left, angleLeft, angleRight) => {
        const rows = buildParameterCalculationRows(
          measure({
            calculationMethod: method,
            [left]: '0',
            [angleLeft]: 7,
            [angleRight]: 8,
            [`${method === 'tangente-aiming-exterior' ? 'exterior' : 'interior'}HAccDistance`]: 4.5
          } as Partial<FieldMeasure>),
          section,
          litData,
          translocoService
        );

        expect(findItem(rows, LABEL_KEYS.leftSupport)?.value).toBe('11');
        expect(findItem(rows, LABEL_KEYS.horizontalDistanceLeft)?.value).toBe('4.50 m');
        expect(findItem(rows, LABEL_KEYS.verticalAngleLeft)?.value).toBe('7 gr');
        expect(findItem(rows, LABEL_KEYS.verticalAngleRight)?.value).toBe('8 gr');
        expect(findItem(rows, LABEL_KEYS.calculationType)).toBeDefined();
      }
    );

    it('should show a dash for the left support of a tangent aiming form that has none', () => {
      const rows = buildParameterCalculationRows(
        measure({ calculationMethod: 'tangente-aiming', tangentLeftSupport: null }),
        section,
        litData,
        translocoService
      );

      expect(findItem(rows, LABEL_KEYS.leftSupport)?.value).toBe('-');
    });

    it('should report the PEP method with its sights and no result', () => {
      const rows = buildParameterCalculationRows(
        measure({
          calculationMethod: 'pep',
          leftSupport: '11',
          lengthBetweenSightGD: 100,
          elevationDifferenceBetweenSightGD: 2,
          xSight2: 3,
          ySight2: 4
        }),
        section,
        litData,
        translocoService
      );

      expect(findItem(rows, LABEL_KEYS.method)?.value).toBe('common.pep-label');
      expect(findItem(rows, LABEL_KEYS.sightsLength)?.value).toBe('100.00 m');
      expect(findItem(rows, LABEL_KEYS.sightsElevation)?.value).toBe('2.00 m');
      expect(findItem(rows, `${LABEL_KEYS.sightX}:{"index":2}`)?.value).toBe('3.00 m');
      expect(findItem(rows, `${LABEL_KEYS.sightY}:{"index":2}`)?.value).toBe('4.00 m');
      expect(findItem(rows, `${LABEL_KEYS.sightX}:{"index":3}`)).toBeDefined();
      expect(findItem(rows, LABEL_KEYS.parameter)?.value).toBe('-');
      expect(findItem(rows, LABEL_KEYS.criterion)).toMatchObject({ value: '-', status: undefined });
      expect(findItem(rows, LABEL_KEYS.parameter23)?.value).toBe('-');
    });

    it.each([
      ['papoto', 'common.papoto-label'],
      ['tangente-aiming', 'field-measuring.calculus-setting.tangent-aiming-radio-label'],
      ['tangente-aiming-exterior', 'field-measuring.calculus-setting.tangent-aiming-exterior-radio-label'],
      ['tangente-aiming-interior', 'field-measuring.calculus-setting.tangent-aiming-interior-radio-label'],
      ['pep', 'common.pep-label']
    ] as const)(
      'should report only the saved %s method, ignoring the data of the other methods',
      (method, methodKey) => {
        const rows = buildParameterCalculationRows(
          measure({
            calculationMethod: method,
            HL: 1,
            cableHAccDistance: 2,
            exteriorHAccDistance: 3,
            interiorHAccDistance: 4,
            xSight1: 5,
            outputs: {
              ...measure().outputs,
              papoto: papotoResult,
              tangentAimingSupport: tangentResult,
              tangentAimingExterior: tangentResult,
              tangentAimingInterior: tangentResult
            }
          }),
          section,
          litData,
          translocoService
        );

        const methodItems = rows.flat().filter((cell) => cell?.label === LABEL_KEYS.method);
        expect(methodItems).toHaveLength(1);
        expect(methodItems[0]?.value).toBe(methodKey);
        const hasPapotoData = findItem(rows, 'HG') !== undefined;
        const hasPepData = findItem(rows, LABEL_KEYS.sightsLength) !== undefined;
        const hasVerticalDistance = findItem(rows, LABEL_KEYS.verticalDistanceLeft) !== undefined;
        const hasHorizontalDistance = findItem(rows, LABEL_KEYS.horizontalDistanceLeft) !== undefined;
        expect([hasPapotoData, hasPepData, hasVerticalDistance, hasHorizontalDistance]).toEqual([
          method === 'papoto',
          method === 'pep',
          method === 'tangente-aiming',
          method === 'tangente-aiming-exterior' || method === 'tangente-aiming-interior'
        ]);
      }
    );

    it('should only report the active method', () => {
      const rows = buildParameterCalculationRows(
        measure({ calculationMethod: 'pep' }),
        section,
        litData,
        translocoService
      );

      expect(findItem(rows, 'HG')).toBeUndefined();
      expect(findItem(rows, LABEL_KEYS.calculationType)).toBeUndefined();
    });
  });

  describe('buildTemperatureCalculationRows', () => {
    it('should report the inputs and the calculated cable temperature', () => {
      const rows = buildTemperatureCalculationRows(
        measure({
          transit: 500,
          windIncidence: 45,
          windIncidenceMode: 'auto',
          measuredDiffusedPlusDirectSolarFlux: 800,
          diffusedSolarFlux: 100,
          directSolarFlux: 600,
          diffusedPlusDirectSolarFlux: 700,
          outputs: {
            ...measure().outputs,
            cableTemperature: { cableTemperature: 40.4, cableTemperatureUncertainty: 2.2, cableSolarFlux: 300 }
          }
        }),
        translocoService
      );

      expect(findItem(rows, LABEL_KEYS.transit)?.value).toBe('500 A');
      expect(findItem(rows, LABEL_KEYS.windIncidence)?.value).toBe('45 °');
      expect(findItem(rows, LABEL_KEYS.measuredSolarFlux)?.value).toBe('800 W/m²');
      expect(findItem(rows, LABEL_KEYS.diffuseSolarFlux)?.value).toBe('100 W/m²');
      expect(findItem(rows, LABEL_KEYS.directSolarFlux)?.value).toBe('600 W/m²');
      expect(findItem(rows, LABEL_KEYS.diffusePlusDirectSolarFlux)?.value).toBe('700 W/m²');
      expect(findItem(rows, LABEL_KEYS.cableTemperature)?.value).toBe('40 °C');
      expect(findItem(rows, LABEL_KEYS.temperatureUncertainty)?.value).toBe('2 °C');
      expect(findItem(rows, LABEL_KEYS.cableSolarFlux)?.value).toBe('300 W/m²');
    });

    it('should use 90° for a perpendicular wind and dashes without calculated temperature', () => {
      const rows = buildTemperatureCalculationRows(
        measure({ windIncidenceMode: 'perpendicular', windIncidence: 10 }),
        translocoService
      );

      expect(findItem(rows, LABEL_KEYS.windIncidence)?.value).toBe('90 °');
      expect(findItem(rows, LABEL_KEYS.cableTemperature)?.value).toBe('-');
      expect(findItem(rows, LABEL_KEYS.cableSolarFlux)?.value).toBe('-');
    });
  });

  describe('buildParameter15CRows', () => {
    const parameter15C = {
      parameter15C: 1000.4,
      parameter15CMinusUncertainty: 990.4,
      parameter15CPlusUncertainty: 1010.4
    };

    it('should report the calculated inputs and results in auto mode', () => {
      const rows = buildParameter15CRows(
        measure({
          updateMode15C: 'auto',
          outputs: {
            ...measure().outputs,
            papoto: papotoResult,
            cableTemperature: { cableTemperature: 30.2, cableTemperatureUncertainty: 1.1, cableSolarFlux: 1 },
            parameter15C
          }
        }),
        translocoService
      );

      expect(findItem(rows, LABEL_KEYS.updateMode)?.value).toBe('common.auto-label');
      expect(findItem(rows, LABEL_KEYS.parameter)?.value).toBe('1234 m');
      expect(findItem(rows, LABEL_KEYS.cableTemperature)?.value).toBe('30 °C');
      expect(findItem(rows, LABEL_KEYS.parameter15C)?.value).toBe('1000 m');
      expect(findItem(rows, LABEL_KEYS.parameter15CMinus)?.value).toBe('990 m');
      expect(findItem(rows, LABEL_KEYS.parameter15CPlus)?.value).toBe('1010 m');
    });

    it('should report only the entered values in manual mode', () => {
      const rows = buildParameter15CRows(
        measure({
          updateMode15C: 'manual',
          manualParameterCalculation15CWithoutWind: {
            parameterPapoto: 1500,
            parameterUncertaintyPapoto: 10,
            cableTemperatureCalibration: 25,
            cableTemperatureCalibrationUncertainty: 2
          },
          outputs: { ...measure().outputs, papoto: papotoResult }
        }),
        translocoService
      );

      expect(findItem(rows, LABEL_KEYS.updateMode)?.value).toBe(
        'field-measuring.parameter-calculation-15.manual-option'
      );
      expect(findItem(rows, LABEL_KEYS.parameter)?.value).toBe('1500 m');
      expect(findItem(rows, LABEL_KEYS.uncertainty)?.value).toBe('10 m');
      expect(findItem(rows, LABEL_KEYS.cableTemperature)?.value).toBe('25 °C');
      expect(findItem(rows, LABEL_KEYS.temperatureUncertainty)?.value).toBe('2 °C');
      expect(findItem(rows, LABEL_KEYS.parameter15C)?.value).toBe('-');
    });
  });

  describe('buildCartoucheData', () => {
    it('should resolve the selected initial condition and load case', () => {
      expect(buildCartoucheData(section, study)).toEqual({
        author: 'author@example.test',
        studyTitle: 'Study 1',
        studyDescription: 'Study description',
        cantonName: 'Section A',
        comment: 'Section comment',
        icName: 'IC 1',
        chargeName: 'Load 1',
        chargeDescription: 'Load description'
      });
    });

    it('should fall back to dashes and empty texts without study and section', () => {
      expect(buildCartoucheData(null, null)).toEqual({
        author: '-',
        studyTitle: '-',
        studyDescription: '',
        cantonName: '-',
        comment: '',
        icName: '-',
        chargeName: '-',
        chargeDescription: ''
      });
    });
  });

  describe('file name', () => {
    it('should format the generation date with hours and minutes', () => {
      expect(formatFileDate(new Date(2026, 10, 6, 9, 5))).toBe('2026-11-06 09-05');
    });

    it('should build the file name from the title, measure, canton and generation date, sanitized', () => {
      const data = buildFieldMeasureReportData({
        measureData: measure({ name: 'Measure/1' }),
        section,
        study,
        litData,
        translocoService,
        locale: 'fr-FR',
        generatedAt: new Date(2026, 10, 6, 14, 39)
      });

      expect(buildFieldMeasureReportFilename('Rapport Mesure de terrain', data)).toBe(
        'Rapport Mesure de terrain_Measure-1_Section A_2026-11-06 14-39.pdf'
      );
    });
  });

  describe('buildFieldMeasureReportData', () => {
    it('should build one paragraph per tab of the form, in order', () => {
      const data = buildFieldMeasureReportData({
        measureData: measure(),
        section,
        study,
        litData,
        translocoService,
        locale: 'fr-FR',
        generatedAt: new Date(2026, 10, 6, 14, 39)
      });

      expect(data.sections.map((paragraph) => paragraph.title)).toEqual([
        'field-measuring.report.terrain-data-title',
        'field-measuring.tabs.parameter-calculation',
        'field-measuring.tabs.temperature-calculation',
        'field-measuring.tabs.parameter-15c'
      ]);
      expect(data.date).toBe(new Date(2026, 10, 6).toLocaleDateString('fr-FR'));
      expect(data.measureName).toBe('Measure 1');
      expect(data.sectionName).toBe('Section A');
    });

    it('should tolerate a missing section', () => {
      const data = buildFieldMeasureReportData({
        measureData: measure(),
        section: null,
        study: null,
        litData: null,
        translocoService,
        locale: 'en-US',
        generatedAt: new Date(2026, 10, 6)
      });

      expect(data.sectionName).toBe('');
      expect(data.cartouche.cantonName).toBe('-');
    });
  });

  describe('drawing', () => {
    it('should split rows into columns, empty cells becoming empty items', () => {
      const rows: FieldMeasureReportRow[] = [
        [{ label: 'A', value: '1' }, null],
        [null, { label: 'B', value: '2' }]
      ];

      expect(splitRowsIntoColumns(rows)).toEqual({
        left: [
          { label: 'A', value: '1' },
          { label: '', value: '' }
        ],
        right: [
          { label: '', value: '' },
          { label: 'B', value: '2' }
        ]
      });
    });

    it('should draw the paragraph title and its items and return a lower Y', () => {
      const doc = {
        setFont: vi.fn(),
        setFontSize: vi.fn(),
        setLineWidth: vi.fn(),
        setDrawColor: vi.fn(),
        text: vi.fn(),
        line: vi.fn(),
        getTextWidth: vi.fn().mockReturnValue(10),
        addPage: vi.fn()
      } as unknown as jsPDF;

      const nextY = drawFieldMeasureSection(
        doc,
        { title: 'Title', rows: [[{ label: 'A', value: '1', status: true }, null]] },
        40
      );

      const texts = (doc.text as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((call) => call[0]);
      expect(texts).toContain('Title');
      expect(texts).toContain('1');
      expect(doc.line).toHaveBeenCalled();
      expect(nextY).toBeGreaterThan(40);
    });
  });
});
