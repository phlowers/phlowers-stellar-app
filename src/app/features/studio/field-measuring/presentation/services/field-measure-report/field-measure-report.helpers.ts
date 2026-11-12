/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// ─── PDF LAYOUT OVERVIEW ─────────────────────────────────────────────────────
//  A4 portrait (210 × 297 mm), paragraphs flowing over one or more pages:
//    drawHeader()                    → report title + date + separator (shared primitive)
//    drawStudyCartoucheSection()     → study & canton (shared primitive)
//    one two-column paragraph per tab of the form (kept on a single page):
//      terrain data · parameter calculation (active method only) · temperature · parameter at 15°C
// ─────────────────────────────────────────────────────────────────────────────

import jsPDF from 'jspdf';

import { TranslocoService } from '@jsverse/transloco';

import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import {
  buildSpanSupportOptions,
  getCalculatedSpanLength
} from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-common/tangent-aiming-common.helpers';
import {
  SKY_COVER_OPTION_SOURCES,
  WIND_DIRECTION_OPTION_KEYS
} from '@features/studio/field-measuring/presentation/constants';
import {
  buildTemperatureCalculationExport,
  buildZeroWindCalculationExport,
  formatExportTime,
  getSectionTypeKey
} from '@features/studio/field-measuring/presentation/field-measure-export.helpers';
import {
  formatGenerationDate,
  formatSpanLabel,
  readNumber,
  sanitizeFilename
} from '@features/studio/field-measuring/presentation/helpers';
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { Section, Study } from '@shared/domain';
import { PDF_UNITS } from '@shared/pdf/pdf-layout.constantes';
import { PdfBulletItem } from '@shared/pdf/pdf-report.interfaces';
import { buildStudyCartouche, drawTwoColumnBulletSection, formatValue } from '@shared/pdf/pdf-primitives.helpers';

import {
  CALCULATION_TYPE_VALUE_KEYS,
  DECIMALS,
  KMH_TO_MS,
  LABEL_KEYS,
  METHOD_VALUE_KEYS,
  SECTION_TITLE_KEYS,
  TANGENT_AIMING_REPORT_CONFIGS,
  UPDATE_MODE_VALUE_KEYS
} from './field-measure-report.constantes';
import {
  FieldMeasureReportData,
  FieldMeasureReportRow,
  FieldMeasureReportSection,
  TangentAimingReportConfig
} from './field-measure-report.interfaces';

/** Inputs of the report data builder. */
export interface FieldMeasureReportInput {
  measureData: FieldMeasure;
  section: Section | null;
  study: Study | null;
  litData: GetSectionOutput | null;
  translocoService: TranslocoService;
  /** Locale used to format dates, e.g. `fr-FR`. */
  locale: string;
  generatedAt: Date;
}

const item = (label: string, value: string, status?: boolean): PdfBulletItem => ({ label, value, status });

const numberItem = (label: string, value: number | null | undefined, unit: string, decimals: number): PdfBulletItem =>
  item(label, formatValue(value, unit, decimals));

const textItem = (label: string, value: string | number | null | undefined): PdfBulletItem =>
  item(label, value === null || value === undefined || value === '' ? '-' : String(value));

/** Resolves the displayed label of a stored select value, falling back to the raw value. */
const optionLabel = (
  options: { value: string; label?: string; labelKey?: string }[],
  value: string | null,
  transloco: TranslocoService
): string | null => {
  const option = options.find((candidate) => candidate.value === value);
  if (!option) {
    return value;
  }
  return option.labelKey ? transloco.translate(option.labelKey) : (option.label ?? value);
};

const isPhaseSection = (spanType: string | null): boolean => spanType?.toLowerCase() === 'phase';

/** Number of the left support of a tangent aiming form, which stores the support index. */
const tangentLeftSupportLabel = (measureData: FieldMeasure, section: Section | null, key: keyof FieldMeasure): string =>
  buildSpanSupportOptions(section?.supports ?? [], measureData.span).find((option) => option.value === measureData[key])
    ?.label ?? '-';

/** Builds the "Terrain data" paragraph rows (header of the measure included). */
export const buildTerrainDataRows = (
  measureData: FieldMeasure,
  section: Section | null,
  transloco: TranslocoService,
  locale: string
): FieldMeasureReportRow[] => {
  const t = (key: string): string => transloco.translate(key);
  const windSpeed =
    measureData.windSpeed !== null && measureData.windSpeedUnit === 'kmh'
      ? measureData.windSpeed * KMH_TO_MS
      : measureData.windSpeed;
  return [
    [textItem(t(LABEL_KEYS.measureName), measureData.name), null],
    [
      textItem(t(LABEL_KEYS.measureDate), measureData.date?.toLocaleDateString(locale)),
      textItem(t(LABEL_KEYS.measureTime), formatExportTime(measureData.time))
    ],
    [
      numberItem(
        t(LABEL_KEYS.ambientTemperature),
        measureData.ambientTemperature,
        PDF_UNITS.celsius,
        DECIMALS.ambientTemperature
      ),
      numberItem(t(LABEL_KEYS.windSpeed), windSpeed, PDF_UNITS.metersPerSecond, DECIMALS.windSpeed)
    ],
    [
      textItem(
        t(LABEL_KEYS.windDirection),
        optionLabel(WIND_DIRECTION_OPTION_KEYS, measureData.windDirection, transloco)
      ),
      textItem(t(LABEL_KEYS.skyCover), optionLabel(SKY_COVER_OPTION_SOURCES, measureData.skyCover, transloco))
    ],
    [textItem(t(LABEL_KEYS.link), measureData.link), textItem(t(LABEL_KEYS.cableName), measureData.cableName)],
    [
      textItem(t(LABEL_KEYS.voltage), measureData.voltage),
      textItem(t(LABEL_KEYS.cablesNumber), measureData.numberOfConductors)
    ],
    [
      textItem(t(LABEL_KEYS.sectionType), measureData.spanType ? t(getSectionTypeKey(measureData.spanType)) : null),
      isPhaseSection(measureData.spanType) ? textItem(t(LABEL_KEYS.phaseNumber), measureData.phaseNumber) : null
    ],
    [textItem(t(LABEL_KEYS.span), formatSpanLabel(section, measureData.span)), null],
    [
      numberItem(t(LABEL_KEYS.longitude), measureData.longitude, PDF_UNITS.degrees, DECIMALS.coordinate),
      numberItem(t(LABEL_KEYS.latitude), measureData.latitude, PDF_UNITS.degrees, DECIMALS.coordinate)
    ],
    [
      numberItem(t(LABEL_KEYS.altitude), measureData.altitude, PDF_UNITS.meters, DECIMALS.altitude),
      numberItem(t(LABEL_KEYS.azimuth), measureData.azimuth, PDF_UNITS.degrees, DECIMALS.azimuth)
    ]
  ];
};

/** Parameter, uncertainty and criterion items shared by every method: `result` is `null` until calculated. */
const buildResultItems = (
  result: { parameter: number; uncertainty: number; checkValidity: boolean } | null,
  transloco: TranslocoService
): { parameter: PdfBulletItem; uncertainty: PdfBulletItem; criterion: PdfBulletItem } => ({
  parameter: numberItem(
    transloco.translate(LABEL_KEYS.parameter),
    result?.parameter,
    PDF_UNITS.meters,
    DECIMALS.parameter
  ),
  uncertainty: numberItem(
    transloco.translate(LABEL_KEYS.uncertainty),
    result?.uncertainty,
    PDF_UNITS.meters,
    DECIMALS.parameter
  ),
  criterion: result
    ? item(
        transloco.translate(LABEL_KEYS.criterion),
        transloco.translate(result.checkValidity ? 'common.yes' : 'common.no'),
        result.checkValidity
      )
    : item(transloco.translate(LABEL_KEYS.criterion), '-')
});

/** Method and left support items opening every method block. */
const buildMethodRow = (
  methodLabel: string,
  leftSupport: string | null,
  transloco: TranslocoService
): FieldMeasureReportRow => [
  textItem(transloco.translate(LABEL_KEYS.method), methodLabel),
  textItem(transloco.translate(LABEL_KEYS.leftSupport), leftSupport)
];

const buildPapotoRows = (
  measureData: FieldMeasure,
  litData: GetSectionOutput | null,
  transloco: TranslocoService
): FieldMeasureReportRow[] => {
  const t = (key: string): string => transloco.translate(key);
  const { papoto } = measureData.outputs;
  const result = buildResultItems(papoto, transloco);
  const grad = (key: string, value: number | null): PdfBulletItem =>
    numberItem(key, value, PDF_UNITS.grad, DECIMALS.gradAngle);
  const meters = (key: string, value: number | null | undefined): PdfBulletItem =>
    numberItem(t(key), value, PDF_UNITS.meters, DECIMALS.length);
  const intermediate = (key: string, value: number | undefined): PdfBulletItem =>
    numberItem(t(key), value, PDF_UNITS.meters, DECIMALS.parameter);
  return [
    buildMethodRow(t(METHOD_VALUE_KEYS.papoto), measureData.leftSupport, transloco),
    [
      meters(LABEL_KEYS.measuredLength, measureData.spanLength),
      meters(
        LABEL_KEYS.calculatedLength,
        getCalculatedSpanLength(measureData.span, litData?.output_parameters.span_length)
      )
    ],
    [
      meters(LABEL_KEYS.measuredElevation, measureData.measuredElevationDifference),
      meters(
        LABEL_KEYS.calculatedElevation,
        getCalculatedSpanLength(measureData.span, litData?.output_parameters.elevation)
      )
    ],
    [grad('HG', measureData.HL), grad('VG', measureData.VL)],
    [grad('H1', measureData.H1), grad('V1', measureData.V1)],
    [grad('H2', measureData.H2), grad('V2', measureData.V2)],
    [grad('H3', measureData.H3), grad('V3', measureData.V3)],
    [grad('HD', measureData.HR), grad('VD', measureData.VR)],
    [result.parameter, result.uncertainty],
    [result.criterion, intermediate(LABEL_KEYS.parameter12, papoto?.parameter_1_2)],
    [null, intermediate(LABEL_KEYS.parameter23, papoto?.parameter_2_3)],
    [null, intermediate(LABEL_KEYS.parameter13, papoto?.parameter_1_3)]
  ];
};

const buildTangentAimingRows = (
  measureData: FieldMeasure,
  section: Section | null,
  litData: GetSectionOutput | null,
  config: TangentAimingReportConfig,
  methodLabel: string,
  transloco: TranslocoService
): FieldMeasureReportRow[] => {
  const t = (key: string): string => transloco.translate(key);
  const result = buildResultItems(measureData.outputs[config.output], transloco);
  const calculationType = measureData[config.calculationType] as FieldMeasure['calculationType'];
  const angle = (key: string, value: number | null): PdfBulletItem =>
    numberItem(t(key), value, PDF_UNITS.grad, DECIMALS.tangentAngle);
  // The parameter or the tangent angle is entered depending on the calculation type
  const typeInput =
    calculationType === 'parametre'
      ? numberItem(
          t(LABEL_KEYS.parameter),
          readNumber(measureData, config.parameter),
          PDF_UNITS.meters,
          DECIMALS.parameter
        )
      : angle(LABEL_KEYS.tangentAngle, readNumber(measureData, config.tangentAngle));
  const distance = numberItem(
    t(config.distanceLabelKey),
    readNumber(measureData, config.distance),
    PDF_UNITS.meters,
    DECIMALS.length
  );
  const rightAngle = angle(LABEL_KEYS.verticalAngleRight, readNumber(measureData, config.verticalAngleRight));
  const typeItem = textItem(t(LABEL_KEYS.calculationType), t(CALCULATION_TYPE_VALUE_KEYS[calculationType]));
  const distanceAndAngles: FieldMeasureReportRow[] = config.verticalAngleLeft
    ? [
        [distance, null],
        [angle(LABEL_KEYS.verticalAngleLeft, readNumber(measureData, config.verticalAngleLeft)), rightAngle]
      ]
    : [[distance, rightAngle]];
  return [
    buildMethodRow(methodLabel, tangentLeftSupportLabel(measureData, section, config.leftSupport), transloco),
    [
      numberItem(
        t(LABEL_KEYS.measuredLength),
        readNumber(measureData, config.spanLength),
        PDF_UNITS.meters,
        DECIMALS.length
      ),
      numberItem(
        t(LABEL_KEYS.calculatedLength),
        getCalculatedSpanLength(measureData.span, litData?.output_parameters.span_length),
        PDF_UNITS.meters,
        DECIMALS.length
      )
    ],
    ...distanceAndAngles,
    [typeItem, typeInput],
    [result.parameter, result.uncertainty],
    [result.criterion, null]
  ];
};

const buildPepRows = (measureData: FieldMeasure, transloco: TranslocoService): FieldMeasureReportRow[] => {
  const t = (key: string): string => transloco.translate(key);
  const meters = (label: string, value: number | null): PdfBulletItem =>
    numberItem(label, value, PDF_UNITS.meters, DECIMALS.length);
  const sights = [
    [measureData.xSight1, measureData.ySight1],
    [measureData.xSight2, measureData.ySight2],
    [measureData.xSight3, measureData.ySight3]
  ];
  // The PEP calculation is not available yet: no result to report
  const result = buildResultItems(null, transloco);
  return [
    buildMethodRow(t(METHOD_VALUE_KEYS.pep), measureData.leftSupport, transloco),
    [
      meters(t(LABEL_KEYS.sightsLength), measureData.lengthBetweenSightGD),
      meters(t(LABEL_KEYS.sightsElevation), measureData.elevationDifferenceBetweenSightGD)
    ],
    ...sights.map(([x, y], index): FieldMeasureReportRow => [
      meters(transloco.translate(LABEL_KEYS.sightX, { index: index + 1 }), x),
      meters(transloco.translate(LABEL_KEYS.sightY, { index: index + 1 }), y)
    ]),
    [result.parameter, result.uncertainty],
    [result.criterion, numberItem(t(LABEL_KEYS.parameter12), null, PDF_UNITS.meters, DECIMALS.parameter)],
    [null, numberItem(t(LABEL_KEYS.parameter23), null, PDF_UNITS.meters, DECIMALS.parameter)],
    [null, numberItem(t(LABEL_KEYS.parameter13), null, PDF_UNITS.meters, DECIMALS.parameter)]
  ];
};

/** Builds the "Parameter calculation" paragraph rows: only the method (and sub-method) retained by the measure. */
export const buildParameterCalculationRows = (
  measureData: FieldMeasure,
  section: Section | null,
  litData: GetSectionOutput | null,
  transloco: TranslocoService
): FieldMeasureReportRow[] => {
  const { calculationMethod } = measureData;
  switch (calculationMethod) {
    case 'papoto':
      return buildPapotoRows(measureData, litData, transloco);
    case 'pep':
      return buildPepRows(measureData, transloco);
    default:
      return buildTangentAimingRows(
        measureData,
        section,
        litData,
        TANGENT_AIMING_REPORT_CONFIGS[calculationMethod],
        transloco.translate(METHOD_VALUE_KEYS[calculationMethod]),
        transloco
      );
  }
};

/** Builds the "Temperature calculation" paragraph rows. */
export const buildTemperatureCalculationRows = (
  measureData: FieldMeasure,
  transloco: TranslocoService
): FieldMeasureReportRow[] => {
  const t = (key: string): string => transloco.translate(key);
  const temperature = buildTemperatureCalculationExport(measureData, transloco);
  const flux = (key: string, value: number | null | undefined): PdfBulletItem =>
    numberItem(t(key), value, PDF_UNITS.wattsPerSquareMeter, DECIMALS.electric);
  const cable = temperature.calculatedTemperature;
  return [
    [
      numberItem(t(LABEL_KEYS.transit), temperature.current.value, PDF_UNITS.ampere, DECIMALS.electric),
      numberItem(t(LABEL_KEYS.windIncidence), temperature.wind.incidence.value, PDF_UNITS.degrees, DECIMALS.electric)
    ],
    [
      flux(LABEL_KEYS.measuredSolarFlux, temperature.solarFlux.measured.value),
      flux(LABEL_KEYS.diffuseSolarFlux, temperature.solarFlux.diffuse.value)
    ],
    [null, flux(LABEL_KEYS.directSolarFlux, temperature.solarFlux.direct.value)],
    [null, flux(LABEL_KEYS.diffusePlusDirectSolarFlux, measureData.diffusedPlusDirectSolarFlux)],
    [
      numberItem(t(LABEL_KEYS.cableTemperature), cable?.cableTemperature.value, PDF_UNITS.celsius, DECIMALS.electric),
      numberItem(
        t(LABEL_KEYS.temperatureUncertainty),
        cable?.cableTemperature.uncertainty,
        PDF_UNITS.celsius,
        DECIMALS.electric
      )
    ],
    [null, flux(LABEL_KEYS.cableSolarFlux, cable?.cableSolarFlux.value)]
  ];
};

/** Builds the "Parameter at 15°C without wind" paragraph rows: the values of the retained update mode. */
export const buildParameter15CRows = (
  measureData: FieldMeasure,
  transloco: TranslocoService
): FieldMeasureReportRow[] => {
  const t = (key: string): string => transloco.translate(key);
  const zeroWind = buildZeroWindCalculationExport(measureData, transloco);
  const meters = (key: string, value: number | null): PdfBulletItem =>
    numberItem(t(key), value, PDF_UNITS.meters, DECIMALS.parameter);
  const celsius = (key: string, value: number | null): PdfBulletItem =>
    numberItem(t(key), value, PDF_UNITS.celsius, DECIMALS.electric);
  return [
    [textItem(t(LABEL_KEYS.updateMode), t(UPDATE_MODE_VALUE_KEYS[measureData.updateMode15C])), null],
    [
      meters(LABEL_KEYS.parameter, zeroWind.inputParameter.value),
      meters(LABEL_KEYS.uncertainty, zeroWind.inputParameter.uncertainty)
    ],
    [
      celsius(LABEL_KEYS.cableTemperature, zeroWind.inputTemperature.value),
      celsius(LABEL_KEYS.temperatureUncertainty, zeroWind.inputTemperature.uncertainty)
    ],
    [
      meters(LABEL_KEYS.parameter15C, zeroWind.zeroWindParameters.parameter),
      meters(LABEL_KEYS.parameter15CMinus, zeroWind.zeroWindParameters.minusParameter)
    ],
    [null, meters(LABEL_KEYS.parameter15CPlus, zeroWind.zeroWindParameters.plusParameter)]
  ];
};

/** Builds the report data from the saved field measure and its study context. */
export const buildFieldMeasureReportData = ({
  measureData,
  section,
  study,
  litData,
  translocoService,
  locale,
  generatedAt
}: FieldMeasureReportInput): FieldMeasureReportData => ({
  date: generatedAt.toLocaleDateString(locale),
  fileDate: formatGenerationDate(generatedAt, true),
  measureName: measureData.name,
  sectionName: section?.name ?? '',
  cartouche: buildStudyCartouche(study, section),
  sections: [
    {
      title: translocoService.translate(SECTION_TITLE_KEYS.terrainData),
      rows: buildTerrainDataRows(measureData, section, translocoService, locale)
    },
    {
      title: translocoService.translate(SECTION_TITLE_KEYS.parameterCalculation),
      rows: buildParameterCalculationRows(measureData, section, litData, translocoService)
    },
    {
      title: translocoService.translate(SECTION_TITLE_KEYS.temperatureCalculation),
      rows: buildTemperatureCalculationRows(measureData, translocoService)
    },
    {
      title: translocoService.translate(SECTION_TITLE_KEYS.parameter15C),
      rows: buildParameter15CRows(measureData, translocoService)
    }
  ]
});

/** Builds the report file name: "<title>_<measure name>_<canton name>_<generation date, hours and minutes>.pdf". */
export const buildFieldMeasureReportFilename = (reportTitle: string, data: FieldMeasureReportData): string =>
  [reportTitle, sanitizeFilename(data.measureName), sanitizeFilename(data.sectionName), data.fileDate].join('_') +
  '.pdf';

/** Splits the rows into the left and right bullet columns, empty cells leaving an empty line. */
export const splitRowsIntoColumns = (
  rows: FieldMeasureReportRow[]
): { left: PdfBulletItem[]; right: PdfBulletItem[] } => {
  const empty: PdfBulletItem = { label: '', value: '' };
  return {
    left: rows.map(([left]) => left ?? empty),
    right: rows.map(([, right]) => right ?? empty)
  };
};

/** Draws one report paragraph (title + two columns + separator) on a single page. Returns the next Y. */
export const drawFieldMeasureSection = (doc: jsPDF, section: FieldMeasureReportSection, startY: number): number => {
  const { left, right } = splitRowsIntoColumns(section.rows);
  return drawTwoColumnBulletSection(doc, section.title, left, right, startY);
};
