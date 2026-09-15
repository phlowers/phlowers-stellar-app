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
import { formatSpanLabel } from './helpers';
import {
  PAPOTO_VALIDITY_CRITERION_PERCENT,
  PARAMETER_CALCULATION_METHOD_EXPORT_LABELS,
  UPDATE_MODE_15C_EXPORT_LABELS,
  WIND_SPEED_UNIT_EXPORT_LABELS
} from './constants';
import {
  GeneralExport,
  GroundMeasurementExport,
  MeasureExport,
  ParameterCalculationExport,
  PapotoMethodExport,
  PepMethodExport,
  SpanExport,
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
export const formatExportDate = (date: Date | null): string | null => {
  if (!date) {
    return null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
 * Builds the `general` export block (study/section context, formerly `metaData`).
 * @param section - The current section (or `null`)
 * @param study - The current study (or `null`)
 * @returns The `general` export block
 */
export const buildGeneralExport = (section: Section | null, study: Study | null): GeneralExport => ({
  author: study?.author_email ?? null,
  date: study?.updated_at_offline ?? null,
  study: study?.title ?? null,
  litCode: section?.lit_idr ?? null,
  litName: section?.lit_adr ?? null,
  section: section?.name ?? null,
  initialCondition:
    section?.initial_conditions.find((ic) => ic.uuid === section.selected_initial_condition_uuid)?.name ?? null,
  loadCase: section?.charges.find((charge) => charge.uuid === section.selected_charge_uuid)?.name ?? null
});

/**
 * Builds the `measure` export block (formerly `measureData`).
 * @param measureData - The field measure to export
 * @param translocoService - The Transloco service used to translate the section type in the active language
 * @returns The `measure` export block
 */
export const buildMeasureExport = (measureData: FieldMeasure, translocoService: TranslocoService): MeasureExport => ({
  name: measureData.name,
  date: formatExportDate(measureData.date),
  time: formatExportTime(measureData.time),
  voltage: createValueUnit(measureData.voltage, 'KV'),
  sectionType: measureData.spanType
    ? translocoService.translate(
        'common.section-type.' + (measureData.spanType.toLowerCase() === 'garde' ? 'guard' : measureData.spanType)
      )
    : null,
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
  azimuth: createValueUnit(measureData.azimuth, '°')
});

/**
 * Builds the `temperatureCalculation` export block.
 * @param measureData - The field measure to export
 * @returns The `temperatureCalculation` export block
 */
export const buildTemperatureCalculationExport = (measureData: FieldMeasure): TemperatureCalculationExport => {
  const { outputs } = measureData;
  return {
    ambientTemperature: createValueUnit(measureData.ambientTemperature, '°C'),
    wind: {
      speed: createValueUnit(measureData.windSpeed, WIND_SPEED_UNIT_EXPORT_LABELS[measureData.windSpeedUnit]),
      direction: measureData.windDirection,
      incidence: createValueUnit(measureData.windIncidence, '°')
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
          criterion: { value: PAPOTO_VALIDITY_CRITERION_PERCENT, unit: '%', status: papoto.checkValidity }
        }
      : undefined
  };
};

/** Builds the tangential sights (Visées tangentes) method export block from raw inputs (method not implemented). */
const buildTangentialSightsMethodExport = (measureData: FieldMeasure): TangentialSightsMethodExport => ({
  measuredLength: createValueUnit(null, 'm'),
  calculatedLength: createValueUnit(null, 'm'),
  leftSupportMeasures: {
    verticalDistance: createValueUnit(null, 'm'),
    verticalAngle: createValueUnit(measureData.cableVerticalAccAngle, '°'),
    horizontalDistance: createValueUnit(measureData.cableHAccDistance, 'm')
  },
  rightSupportMeasures: {
    verticalAngle: createValueUnit(measureData.cableTangentAngle, '°')
  },
  calculationType: {
    type: measureData.calculationType === 'tangente' ? 'ANGLE_TANGENT' : 'PARAMETRE',
    value: null
  },
  calculatedParameter: undefined
});

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
 * @returns The `parameterCalculation` export block
 */
export const buildParameterCalculationExport = (
  measureData: FieldMeasure,
  litData: GetSectionOutput | null
): ParameterCalculationExport => {
  const method: ParameterCalculationExport['method'] = {};
  switch (measureData.calculationMethod) {
    case 'papoto':
      method.papoto = buildPapotoMethodExport(measureData, litData);
      break;
    case 'tangente-aiming':
      method.tangentialSights = buildTangentialSightsMethodExport(measureData);
      break;
    case 'pep':
      method.pep = buildPepMethodExport(measureData);
      break;
  }
  return {
    methodName: PARAMETER_CALCULATION_METHOD_EXPORT_LABELS[measureData.calculationMethod],
    subMethodName: null,
    leftSupport: measureData.leftSupport,
    method
  };
};

/**
 * Builds the `zeroWindCalculation` export block (parameter at 15°C without wind), in auto or manual mode.
 * @param measureData - The field measure to export
 * @returns The `zeroWindCalculation` export block
 */
export const buildZeroWindCalculationExport = (measureData: FieldMeasure): ZeroWindCalculationExport => {
  const isManual = measureData.updateMode15C === 'manual';
  const manualData = measureData.manualParameterCalculation15CWithoutWind;
  const { outputs } = measureData;
  const inputParameter: UncertainValueUnit = isManual
    ? createUncertainValueUnit(manualData?.parameterPapoto ?? null, 'm', manualData?.parameterUncertaintyPapoto ?? null)
    : createUncertainValueUnit(outputs.papoto?.parameter ?? null, 'm', outputs.papoto?.uncertainty ?? null);
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
    mode: UPDATE_MODE_15C_EXPORT_LABELS[measureData.updateMode15C],
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
  temperatureCalculation: buildTemperatureCalculationExport(measureData),
  parameterCalculation: buildParameterCalculationExport(measureData, litData),
  zeroWindCalculation: buildZeroWindCalculationExport(measureData)
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
