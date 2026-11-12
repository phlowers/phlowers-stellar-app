/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FieldMeasure } from '../domain/types';

/** A numeric (or other) value paired with its unit of measure. */
export interface ValueUnit<T = number | null> {
  value: T;
  unit: string;
}

/** A `ValueUnit` that also carries a measurement uncertainty. */
export interface UncertainValueUnit<T = number | null> extends ValueUnit<T> {
  uncertainty: number | null;
}

/** Root export file structure — always a single-entry `groundMeasurement` array. */
export interface GroundMeasurementExportFile {
  groundMeasurement: GroundMeasurementExport[];
}

/** One exported ground measurement entry, covering the 4 active tabs of the field measuring tool. */
export interface GroundMeasurementExport {
  general: GeneralExport;
  measure: MeasureExport;
  span: SpanExport;
  temperatureCalculation: TemperatureCalculationExport;
  parameterCalculation: ParameterCalculationExport;
  zeroWindCalculation: ZeroWindCalculationExport | undefined;
}

/** Study/section context metadata (formerly `metaData`). */
export interface GeneralExport {
  author: string | null;
  date: string | null;
  study: string | null;
  litCode: string | null;
  litName: string | null;
  section: string | null;
  initialCondition: string | null;
  loadCase: string | null;
}

/** Field measure identification and electrical/mechanical context (formerly `measureData`). */
export interface MeasureExport {
  name: string;
  date: string | null;
  time: string | null;
  season: string | null;
  voltage: ValueUnit<string | null>;
  sectionType: string | null;
  cable: string | null;
  cablesNumber: number | null;
  phaseNumber: number | null;
}

/** Geographic/mechanical span context (formerly `spanData`). */
export interface SpanExport {
  name: string;
  longitude: ValueUnit;
  latitude: ValueUnit;
  azimuth: ValueUnit;
  altitude: ValueUnit;
}

/** Temperature calculation tab data, including environment inputs and computed cable temperature. */
export interface TemperatureCalculationExport {
  ambientTemperature: ValueUnit;
  wind: {
    speed: ValueUnit;
    direction: string | null;
    incidence: ValueUnit;
  };
  solarFlux: {
    measured: ValueUnit;
    cloudiness: string | null;
    diffuse: ValueUnit;
    direct: ValueUnit;
  };
  current: ValueUnit;
  calculatedTemperature:
    | {
        cableTemperature: UncertainValueUnit;
        cableSolarFlux: ValueUnit;
      }
    | undefined;
}

/** Validity criterion of a calculated parameter: threshold in %, and whether the result respects it. */
export interface CriterionExport {
  threshold: number;
  unit: '%';
  status: boolean;
}

/** Calculated parameter block shared by all parameter calculation methods; `undefined` when not computed. */
export type CalculatedParameterExport =
  | {
      parameter: UncertainValueUnit;
      criterion: CriterionExport;
    }
  | undefined;

/** Raw inputs and computed outputs for the PAPOTO parameter calculation method. */
export interface PapotoMethodExport {
  measuredLength: ValueUnit;
  calculatedLength: ValueUnit;
  measuredElevation: ValueUnit;
  calculatedElevation: ValueUnit;
  horizontalAngles: {
    value: { HG: number | null; H1: number | null; H2: number | null; H3: number | null; HD: number | null };
    unit: '°';
  };
  verticalAngles: {
    value: { VG: number | null; V1: number | null; V2: number | null; V3: number | null; VD: number | null };
    unit: '°';
  };
  intermediateParameters: { value: { p12: number | null; p23: number | null; p13: number | null }; unit: 'm' };
  calculatedParameter: CalculatedParameterExport;
}

/** Inputs and results of the tangential sights parameter calculation method (support, exterior or interior). */
export interface TangentialSightsMethodExport {
  measuredLength: ValueUnit;
  calculatedLength: ValueUnit;
  leftSupportMeasures: {
    verticalDistance: ValueUnit;
    verticalAngle: ValueUnit;
    horizontalDistance: ValueUnit;
  };
  rightSupportMeasures: {
    verticalAngle: ValueUnit;
  };
  calculationType: { type: 'PARAMETRE' | 'ANGLE_TANGENT'; value: number | null };
  calculatedParameter: CalculatedParameterExport;
}

/** Raw inputs for the PEP parameter calculation method (placeholder, not implemented). */
export interface PepMethodExport {
  sightsDeltaLength: ValueUnit;
  sightsDeltaElevation: ValueUnit;
  horizontalDistances: { value: { X1: number | null; X2: number | null; X3: number | null }; unit: 'm' };
  verticalDistances: { value: { Y1: number | null; Y2: number | null; Y3: number | null }; unit: 'm' };
  intermediateParameters: { value: { p12: number | null; p23: number | null; p13: number | null }; unit: 'm' };
  calculatedParameter: CalculatedParameterExport;
}

/** Sub-method of the tangential sights method. */
export type TangentialSightsSubMethodName = 'SUPPORT' | 'EXTERIEUR' | 'INTERIEUR';

/** Calculation methods of the field measure that are tangential sights sub-methods. */
export type TangentialSightsCalculationMethod = Extract<
  FieldMeasure['calculationMethod'],
  'tangente-aiming' | 'tangente-aiming-exterior' | 'tangente-aiming-interior'
>;

/** Parameter calculation tab data — only the key matching the active `methodName` is populated in `method`. */
export interface ParameterCalculationExport {
  methodName: 'PAPOTO' | 'VISEES_TANGENTES' | 'PEP';
  subMethodName: TangentialSightsSubMethodName | null;
  leftSupport: string | null;
  method: {
    papoto?: PapotoMethodExport;
    tangentialSights?: TangentialSightsMethodExport;
    pep?: PepMethodExport;
  };
}

/** Parameter at 15°C without wind ("zero wind") tab data, in auto or manual mode. */
export interface ZeroWindCalculationExport {
  mode: 'AUTO' | 'MANUELLE';
  inputParameter: UncertainValueUnit;
  inputTemperature: UncertainValueUnit;
  zeroWindParameters: {
    parameter: number | null;
    minusParameter: number | null;
    plusParameter: number | null;
    unit: 'm';
  };
}
