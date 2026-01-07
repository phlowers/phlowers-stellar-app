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
  time: string | null;
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
  cableTemperature15C: number | null;
  cableTemperatureUncertainty15C: number | null;
}

export interface CalculationResults {
  parameter: number | null;
  parameterUncertainty: number | null;
  parameter12: number | null;
  parameter23: number | null;
  parameter13: number | null;
  criteria05: boolean | null;
  sideDGreaterThan2m: number | null;
  sideDValid: boolean | null;
  validMeasurement: boolean | null;
  cableTemperature: number | null;
  cableTemperatureUncertainty: number | null;
  cableSolarFlux: number | null;
  parameter15CMinusUncertainty: number | null;
  parameter15C: number | null;
  parameter15CPlusUncertainty: number | null;
}
