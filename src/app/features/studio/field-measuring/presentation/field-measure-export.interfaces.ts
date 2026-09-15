/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

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

/** Calculated parameter block shared by PAPOTO and PEP methods (uses `criterion`, in %). */
export type PapotoCalculatedParameterExport =
  | {
      parameter: UncertainValueUnit;
      criterion: { value: number; unit: '%'; status: boolean };
    }
  | undefined;

/** Calculated parameter block for the PEP method — same shape as PAPOTO's. */
export type PepCalculatedParameterExport =
  | {
      parameter: UncertainValueUnit;
      criterion: { value: number; unit: '%'; status: boolean };
    }
  | undefined;

/** Calculated parameter block for the tangential sights method (uses `rating`, in meters — not `criterion`). */
export type TangentialSightsCalculatedParameterExport =
  | {
      parameter: UncertainValueUnit;
      rating: { value: number; unit: 'm'; status: boolean };
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
  calculatedParameter: PapotoCalculatedParameterExport;
}

/** Raw inputs for the tangential sights parameter calculation method (placeholder, not implemented). */
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
  calculatedParameter: TangentialSightsCalculatedParameterExport;
}

/** Raw inputs for the PEP parameter calculation method (placeholder, not implemented). */
export interface PepMethodExport {
  sightsDeltaLength: ValueUnit;
  sightsDeltaElevation: ValueUnit;
  horizontalDistances: { value: { X1: number | null; X2: number | null; X3: number | null }; unit: 'm' };
  verticalDistances: { value: { Y1: number | null; Y2: number | null; Y3: number | null }; unit: 'm' };
  intermediateParameters: { value: { p12: number | null; p23: number | null; p13: number | null }; unit: 'm' };
  calculatedParameter: PepCalculatedParameterExport;
}

/** Parameter calculation tab data — only the key matching the active `methodName` is populated in `method`. */
export interface ParameterCalculationExport {
  methodName: 'PAPOTO' | 'VISEES_TANGENTES' | 'PEP';
  subMethodName: null;
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
