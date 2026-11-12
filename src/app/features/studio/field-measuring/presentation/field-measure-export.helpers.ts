/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Section, Study } from '@shared/domain';
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { TranslocoService } from '@jsverse/transloco';
import { FieldMeasure } from '../domain/types';
import {
  formatGenerationDate,
  formatLeftSupportLabel,
  formatSpanLabel,
  getActiveParameterOutput,
  readNumber
} from './helpers';
import { getCalculatedSpanLength } from './components/calculus-setting/tangent-aiming-common/tangent-aiming-common.helpers';
import { TANGENT_AIMING_REPORT_CONFIGS } from './services/field-measure-report/field-measure-report.constantes';
import {
  PAPOTO_VALIDITY_CRITERION_PERCENT,
  PARAMETER_CALCULATION_METHOD_TRANSLATION_KEYS,
  SEASON_EXPORT_KEYS,
  TANGENT_AIMING_VALIDITY_CRITERION_PERCENT,
  TANGENTIAL_SIGHTS_METHOD_NAME_EXPORT_VALUE,
  TANGENTIAL_SIGHTS_SUB_METHOD_NAME_EXPORT_VALUES,
  UPDATE_MODE_15C_EXPORT_KEYS,
  WIND_SPEED_UNIT_EXPORT_KEYS,
  CALCULATION_TYPE_EXPORT_KEYS
} from './constants';
import {
  GeneralExport,
  GroundMeasurementExport,
  MeasureExport,
  ParameterCalculationExport,
  PapotoMethodExport,
  PepMethodExport,
  SpanExport,
  TangentialSightsCalculationMethod,
  TangentialSightsMethodExport,
  TemperatureCalculationExport,
  UncertainValueUnit,
  ValueUnit,
  ZeroWindCalculationExport
} from './field-measure-export.interfaces';

/** Builds a `ValueUnit`, factoring out the repeated `{ value, unit }` literal. Preserves the `unit` literal type. */
const createValueUnit = <T, U extends string>(value: T, unit: U): ValueUnit<T> & { unit: U } => ({ value, unit });

/**
 * Builds an `UncertainValueUnit`, factoring out the repeated `{ value, unit, uncertainty }` literal.
 * Preserves the `unit` literal type.
 */
const createUncertainValueUnit = <T, U extends string>(
  value: T,
  unit: U,
  uncertainty: number | null
): UncertainValueUnit<T> & { unit: U } => ({
  value,
  unit,
  uncertainty
});

/**
 * Formats a date as `YYYY-MM-DD` in local time.
 * @param date - The date to format (or `null`)
 * @returns The formatted date, or `null` when `date` is `null`
 */
export const formatExportDate = (date: Date | null): string | null => (date ? formatGenerationDate(date) : null);

/**
 * Formats a time as `HH:mm` in local time.
 * @param time - The time to format (or `null`)
 * @returns The formatted time, or `null` when `time` is `null`
 */
export const formatExportTime = (time: Date | null): string | null => {
  if (!time) {
    return null;
  }
  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Formats an ISO date-time string as `YYYY-MM-DDTHH:mm:ss.SSS±HH:MM` in local time with its offset.
 * @param value - The ISO date-time string to format (or `null`/empty)
 * @returns The formatted date-time, or `null` when `value` is missing or invalid
 */
export const formatExportDateTimeWithOffset = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const pad = (n: number, length = 2): string => String(n).padStart(length, '0');
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const timePart = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
  return `${datePart}T${timePart}${sign}${pad(Math.floor(absOffset / 60))}:${pad(absOffset % 60)}`;
};

/**
 * Formats the time of a date as `HH:mm:ss.SSS±HH:MM` in local time with its offset (time part of
 * `formatExportDateTimeWithOffset`, so the general and measure dates share the same convention).
 * @param time - The time to format (or `null`)
 * @returns The formatted time, or `null` when `time` is `null` or invalid
 */
export const formatExportTimeWithOffset = (time: Date | null): string | null =>
  formatExportDateTimeWithOffset(time?.toISOString())?.split('T')[1] ?? null;

/**
 * Builds the `general` export block (study/section context, formerly `metaData`).
 * @param section - The current section (or `null`)
 * @param study - The current study (or `null`)
 * @returns The `general` export block
 */
export const buildGeneralExport = (section: Section | null, study: Study | null): GeneralExport => ({
  author: study?.author_email ?? null,
  date: formatExportDateTimeWithOffset(study?.updated_at_offline),
  study: study?.title ?? null,
  litCode: section?.lit_idr ?? null,
  litName: section?.lit_adr ?? null,
  section: section?.name ?? null,
  initialCondition:
    section?.initial_conditions.find((ic) => ic.uuid === section.selected_initial_condition_uuid)?.name ?? null,
  loadCase: section?.charges.find((charge) => charge.uuid === section.selected_charge_uuid)?.name ?? null
});

/** Transloco key of a section type; the legacy French span type 'garde' maps to the 'guard' key. */
export const getSectionTypeKey = (spanType: string): string => {
  const keySuffix = spanType.toLowerCase() === 'garde' ? 'guard' : spanType;
  return `common.section-type.${keySuffix}`;
};

/**
 * Builds the `measure` export block (formerly `measureData`).
 * @param measureData - The field measure to export
 * @param translocoService - The Transloco service used to translate the section type in the active language
 * @returns The `measure` export block
 */
export const buildMeasureExport = (measureData: FieldMeasure, translocoService: TranslocoService): MeasureExport => ({
  name: measureData.name,
  date: formatExportDate(measureData.date),
  time: formatExportTimeWithOffset(measureData.time),
  season: measureData.season ? translocoService.translate(SEASON_EXPORT_KEYS[measureData.season]) : null,
  voltage: createValueUnit(measureData.voltage, 'KV'),
  sectionType: measureData.spanType ? translocoService.translate(getSectionTypeKey(measureData.spanType)) : null,
  cable: measureData.cableName,
  cablesNumber: measureData.numberOfConductors,
  phaseNumber: measureData.phaseNumber
});

/**
 * Builds the `span` export block (formerly `spanData`).
 * @param measureData - The field measure to export
 * @param section - The current section (or `null`)
 * @returns The `span` export block
 */
export const buildSpanExport = (measureData: FieldMeasure, section: Section | null): SpanExport => ({
  name: formatSpanLabel(section, measureData.span),
  longitude: createValueUnit(measureData.longitude, '°'),
  latitude: createValueUnit(measureData.latitude, '°'),
  azimuth: createValueUnit(measureData.azimuth, '°'),
  altitude: createValueUnit(measureData.altitude, 'm')
});

/**
 * Builds the `temperatureCalculation` export block.
 * @param measureData - The field measure to export
 * @param translocoService - The Transloco service used to translate export labels
 * @returns The `temperatureCalculation` export block
 */
export const buildTemperatureCalculationExport = (
  measureData: FieldMeasure,
  translocoService: TranslocoService
): TemperatureCalculationExport => {
  const { outputs } = measureData;
  return {
    ambientTemperature: createValueUnit(measureData.ambientTemperature, '°C'),
    wind: {
      speed: createValueUnit(
        measureData.windSpeed,
        translocoService.translate(WIND_SPEED_UNIT_EXPORT_KEYS[measureData.windSpeedUnit])
      ),
      direction: measureData.windDirection,
      incidence: createValueUnit(
        measureData.windIncidenceMode === 'perpendicular' ? 90 : measureData.windIncidence,
        '°'
      )
    },
    solarFlux: {
      measured: createValueUnit(measureData.measuredDiffusedPlusDirectSolarFlux, 'W/m²'),
      cloudiness: measureData.skyCover,
      diffuse: createValueUnit(measureData.diffusedSolarFlux, 'W/m²'),
      direct: createValueUnit(measureData.directSolarFlux, 'W/m²')
    },
    current: createValueUnit(measureData.transit, 'A'),
    calculatedTemperature: outputs.cableTemperature
      ? {
          cableTemperature: createUncertainValueUnit(
            outputs.cableTemperature.cableTemperature,
            '°C',
            outputs.cableTemperature.cableTemperatureUncertainty
          ),
          cableSolarFlux: createValueUnit(outputs.cableTemperature.cableSolarFlux, 'W/m²')
        }
      : undefined
  };
};

/** Builds the PAPOTO method export block, including computed length/elevation from `litData`. */
const buildPapotoMethodExport = (measureData: FieldMeasure, litData: GetSectionOutput | null): PapotoMethodExport => {
  const leftIndex = measureData.span?.[0] ?? null;
  const calculatedLength = leftIndex !== null ? (litData?.output_parameters.span_length[leftIndex] ?? null) : null;
  const calculatedElevation = leftIndex !== null ? (litData?.output_parameters.elevation[leftIndex] ?? null) : null;
  const { papoto } = measureData.outputs;
  return {
    measuredLength: createValueUnit(measureData.spanLength, 'm'),
    calculatedLength: createValueUnit(calculatedLength, 'm'),
    measuredElevation: createValueUnit(measureData.measuredElevationDifference, 'm'),
    calculatedElevation: createValueUnit(calculatedElevation, 'm'),
    horizontalAngles: createValueUnit(
      { HG: measureData.HL, H1: measureData.H1, H2: measureData.H2, H3: measureData.H3, HD: measureData.HR },
      '°'
    ),
    verticalAngles: createValueUnit(
      { VG: measureData.VL, V1: measureData.V1, V2: measureData.V2, V3: measureData.V3, VD: measureData.VR },
      '°'
    ),
    intermediateParameters: createValueUnit(
      {
        p12: papoto?.parameter_1_2 ?? null,
        p23: papoto?.parameter_2_3 ?? null,
        p13: papoto?.parameter_1_3 ?? null
      },
      'm'
    ),
    calculatedParameter: papoto
      ? {
          parameter: createUncertainValueUnit(papoto.parameter, 'm', papoto.uncertainty),
          criterion: { threshold: PAPOTO_VALIDITY_CRITERION_PERCENT, unit: '%', status: papoto.checkValidity }
        }
      : undefined
  };
};

/** Builds the tangential sights (Visées tangentes) method export block for the support, exterior or interior form. */
const buildTangentialSightsMethodExport = (
  measureData: FieldMeasure,
  litData: GetSectionOutput | null,
  translocoService: TranslocoService,
  method: TangentialSightsCalculationMethod
): TangentialSightsMethodExport => {
  const config = TANGENT_AIMING_REPORT_CONFIGS[method];
  const isTangentAngle = measureData[config.calculationType] === 'tangente';
  const isSupport = method === 'tangente-aiming';
  const distance = createValueUnit(readNumber(measureData, config.distance), 'm');
  const result = measureData.outputs[config.output];
  return {
    measuredLength: createValueUnit(readNumber(measureData, config.spanLength), 'm'),
    calculatedLength: createValueUnit(
      getCalculatedSpanLength(measureData.span, litData?.output_parameters.span_length),
      'm'
    ),
    // The support form has no left vertical angle, and its distance is the vertical one; the others have the horizontal one.
    leftSupportMeasures: {
      verticalDistance: isSupport ? distance : createValueUnit(null, 'm'),
      verticalAngle: createValueUnit(
        config.verticalAngleLeft ? readNumber(measureData, config.verticalAngleLeft) : null,
        '°'
      ),
      horizontalDistance: isSupport ? createValueUnit(null, 'm') : distance
    },
    rightSupportMeasures: {
      verticalAngle: createValueUnit(readNumber(measureData, config.verticalAngleRight), '°')
    },
    calculationType: {
      type: translocoService.translate(
        isTangentAngle ? CALCULATION_TYPE_EXPORT_KEYS.tangente : CALCULATION_TYPE_EXPORT_KEYS.other
      ),
      value: readNumber(measureData, isTangentAngle ? config.tangentAngle : config.parameter)
    },
    calculatedParameter: result
      ? {
          parameter: createUncertainValueUnit(result.parameter, 'm', result.uncertainty),
          criterion: {
            threshold: TANGENT_AIMING_VALIDITY_CRITERION_PERCENT,
            unit: '%',
            status: result.checkValidity
          }
        }
      : undefined
  };
};

/** Builds the PEP method export block from raw inputs (method not implemented). */
const buildPepMethodExport = (measureData: FieldMeasure): PepMethodExport => ({
  sightsDeltaLength: createValueUnit(measureData.lengthBetweenSightGD, 'm'),
  sightsDeltaElevation: createValueUnit(measureData.elevationDifferenceBetweenSightGD, 'm'),
  horizontalDistances: createValueUnit(
    { X1: measureData.xSight1, X2: measureData.xSight2, X3: measureData.xSight3 },
    'm'
  ),
  verticalDistances: createValueUnit(
    { Y1: measureData.ySight1, Y2: measureData.ySight2, Y3: measureData.ySight3 },
    'm'
  ),
  intermediateParameters: createValueUnit({ p12: null, p23: null, p13: null }, 'm'),
  calculatedParameter: undefined
});

/**
 * Builds the `parameterCalculation` export block. Only the key matching the active `calculationMethod`
 * is populated in `method`; the other methods are left undefined.
 * @param measureData - The field measure to export
 * @param litData - The current section geometry/output parameters (or `null`)
 * @param translocoService - The Transloco service used to translate export labels
 * @returns The `parameterCalculation` export block
 */
export const buildParameterCalculationExport = (
  measureData: FieldMeasure,
  litData: GetSectionOutput | null,
  translocoService: TranslocoService
): ParameterCalculationExport => {
  const { calculationMethod } = measureData;
  if (calculationMethod === 'papoto') {
    return {
      methodName: translocoService.translate(PARAMETER_CALCULATION_METHOD_TRANSLATION_KEYS.papoto),
      subMethodName: null,
      leftSupport: formatLeftSupportLabel(measureData.leftSupport),
      method: { papoto: buildPapotoMethodExport(measureData, litData) }
    };
  }
  if (calculationMethod === 'pep') {
    return {
      methodName: translocoService.translate(PARAMETER_CALCULATION_METHOD_TRANSLATION_KEYS.pep),
      subMethodName: null,
      leftSupport: measureData.leftSupport,
      method: { pep: buildPepMethodExport(measureData) }
    };
  }
  return {
    methodName: TANGENTIAL_SIGHTS_METHOD_NAME_EXPORT_VALUE,
    subMethodName: TANGENTIAL_SIGHTS_SUB_METHOD_NAME_EXPORT_VALUES[calculationMethod],
    leftSupport: formatLeftSupportLabel(
      measureData[TANGENT_AIMING_REPORT_CONFIGS[calculationMethod].leftSupport] as string | null
    ),
    method: {
      tangentialSights: buildTangentialSightsMethodExport(measureData, litData, translocoService, calculationMethod)
    }
  };
};

/**
 * Builds the `zeroWindCalculation` export block (parameter at 15°C without wind), in auto or manual mode.
 * @param measureData - The field measure to export
 * @param translocoService - The Transloco service used to translate export labels
 * @returns The `zeroWindCalculation` export block
 */
export const buildZeroWindCalculationExport = (
  measureData: FieldMeasure,
  translocoService: TranslocoService
): ZeroWindCalculationExport => {
  const isManual = measureData.updateMode15C === 'manual';
  const manualData = measureData.manualParameterCalculation15CWithoutWind;
  const { outputs } = measureData;
  const activeParameterOutput = getActiveParameterOutput(measureData);
  const inputParameter: UncertainValueUnit = isManual
    ? createUncertainValueUnit(manualData?.parameterPapoto ?? null, 'm', manualData?.parameterUncertaintyPapoto ?? null)
    : createUncertainValueUnit(
        activeParameterOutput?.parameter ?? null,
        'm',
        activeParameterOutput?.uncertainty ?? null
      );
  const inputTemperature: UncertainValueUnit = isManual
    ? createUncertainValueUnit(
        manualData?.cableTemperatureCalibration ?? null,
        '°C',
        manualData?.cableTemperatureCalibrationUncertainty ?? null
      )
    : createUncertainValueUnit(
        outputs.cableTemperature?.cableTemperature ?? null,
        '°C',
        outputs.cableTemperature?.cableTemperatureUncertainty ?? null
      );
  const parameter15C = outputs.parameter15C;
  return {
    mode: translocoService.translate(UPDATE_MODE_15C_EXPORT_KEYS[measureData.updateMode15C]),
    inputParameter,
    inputTemperature,
    zeroWindParameters: {
      parameter: parameter15C?.parameter15C ?? null,
      minusParameter: parameter15C?.parameter15CMinusUncertainty ?? null,
      plusParameter: parameter15C?.parameter15CPlusUncertainty ?? null,
      unit: 'm'
    }
  };
};

/**
 * Builds a single `groundMeasurement` export entry from the current field measure, section, study and lit data.
 * @param measureData - The field measure to export
 * @param section - The current section (or `null`)
 * @param study - The current study (or `null`)
 * @param litData - The current section geometry/output parameters (or `null`)
 * @param translocoService - The Transloco service used to translate the section type in the active language
 * @returns The full `GroundMeasurementExport` entry
 */
export const buildGroundMeasurementExport = (
  measureData: FieldMeasure,
  section: Section | null,
  study: Study | null,
  litData: GetSectionOutput | null,
  translocoService: TranslocoService
): GroundMeasurementExport => ({
  general: buildGeneralExport(section, study),
  measure: buildMeasureExport(measureData, translocoService),
  span: buildSpanExport(measureData, section),
  temperatureCalculation: buildTemperatureCalculationExport(measureData, translocoService),
  parameterCalculation: buildParameterCalculationExport(measureData, litData, translocoService),
  zeroWindCalculation: buildZeroWindCalculationExport(measureData, translocoService)
});

/**
 * Serializes the field measure export contract (`{ groundMeasurement: [...] }`) to a pretty-printed JSON string.
 * @param measureData - The field measure to export
 * @param section - The current section (or `null`)
 * @param study - The current study (or `null`)
 * @param litData - The current section geometry/output parameters (or `null`)
 * @param translocoService - The Transloco service used to translate the section type in the active language
 * @returns The JSON string representation of the export
 */
export const buildFieldMeasureExportJson = (
  measureData: FieldMeasure,
  section: Section | null,
  study: Study | null,
  litData: GetSectionOutput | null,
  translocoService: TranslocoService
): string =>
  JSON.stringify(
    { groundMeasurement: [buildGroundMeasurementExport(measureData, section, study, litData, translocoService)] },
    null,
    2
  );
