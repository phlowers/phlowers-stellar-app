/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Complete data model for a field measurement session, including inputs, settings, and computed outputs. */
export interface FieldMeasure {
  uuid: string;
  name: string;
  link: string | null;
  voltage: string | null;
  spanType: string | null;
  phaseNumber: number | null;
  numberOfConductors: number | null;
  span: number[] | null;
  longitude: number | null;
  latitude: number | null;
  altitude: number | null;
  azimuth: number | null;
  date: Date | null;
  time: Date | null;
  season: 'summer' | 'winter';
  ambientTemperature: number | null;
  windSpeed: number | null;
  windSpeedUnit: 'kmh' | 'ms';
  windDirection: string | null;
  skyCover: string | null;
  // Parameter calculation fields
  calculationMethod: 'papoto' | 'tangente-aiming' | 'pep';
  // Papoto fields
  leftSupport: string | null;
  spanLength: number | null;
  measuredElevationDifference: number | null;
  HL: number | null;
  H1: number | null;
  H2: number | null;
  H3: number | null;
  HR: number | null;
  VL: number | null;
  V1: number | null;
  V2: number | null;
  V3: number | null;
  VR: number | null;
  // Visées tangentes fields
  cableHAccDistance: number | null;
  cableVerticalAccAngle: number | null;
  calculationType: 'parametre' | 'tangente';
  cableTangentAngle: number | null;
  // PEP fields
  lengthBetweenSightGD: number | null;
  elevationDifferenceBetweenSightGD: number | null;
  xSight1: number | null;
  xSight2: number | null;
  xSight3: number | null;
  ySight1: number | null;
  ySight2: number | null;
  ySight3: number | null;
  // Temperature calculation fields
  cableName: string | null;
  transit: number | null;
  windIncidence: number | null;
  windIncidenceMode: 'auto' | 'perpendicular';
  diffuseSolarFlux: number | null;
  directSolarFlux: number | null;
  diffuseDirectSolarFlux: number | null;
  diffusedSolarFlux: number | null;
  measuredDiffusedPlusDirectSolarFlux: number | null;
  measuredDiffusedSolarFlux: number | null;
  diffusedPlusDirectSolarFlux: number | null;
  // Parameter at 15°C without wind fields
  updateMode15C: 'auto' | 'manual';
  parameterPapoto: number | null;
  parameterUncertaintyPapoto: number | null;
  cableTemperatureCalibration: number | null;
  cableTemperatureCalibrationUncertainty: number | null;
  manualParameterCalculation15CWithoutWind: ManualParameterCalculation15CWithoutWind | null;
  outputs: FieldMeasureOutputs;
}

/** Aggregated output results of a field measurement calculation. */
export interface FieldMeasureOutputs {
  /** PAPOTO calculation result, if computed. */
  papoto: PapotoResult | null;
  /** Cable temperature calculation result, if computed. */
  cableTemperature: TemperatureCalculationResult | null;
  /** Parameter at 15°C calculation result, if computed. */
  parameter15C: Parameter15CResult | null;
}

/** Result of the parameter at 15°C without wind calculation including uncertainty bounds. */
export interface Parameter15CResult {
  parameter15CMinusUncertainty: number;
  parameter15C: number;
  parameter15CPlusUncertainty: number;
}

/** Result of the cable temperature calculation from environmental conditions. */
export interface TemperatureCalculationResult {
  cableSolarFlux: number;
  cableTemperature: number;
  cableTemperatureUncertainty: number;
}

/** Result of the PAPOTO parameter calculation with validity check. */
export interface PapotoResult {
  parameter: number;
  parameter_1_2: number;
  parameter_2_3: number;
  parameter_1_3: number;
  checkValidity: boolean;
  uncertainty: number;
}

/** Manual input values for the 15°C without wind parameter calculation. */
export interface ManualParameterCalculation15CWithoutWind {
  parameterPapoto: number | null;
  parameterUncertaintyPapoto: number | null;
  cableTemperatureCalibration: number | null;
  cableTemperatureCalibrationUncertainty: number | null;
}
