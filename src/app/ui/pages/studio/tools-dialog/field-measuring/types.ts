export interface TerrainMeasureData {
  line: string;
  voltage: number;
  spanType: string;
  phaseNumber: number;
  numberOfConductors: number;
  span: string;
  longitude: number;
  latitude: number;
  altitude: number;
  azimuth: number;
  date: Date;
  time: string;
  season: 'summer' | 'winter';
  ambientTemperature: number | null;
  windSpeed: number | null;
  windSpeedUnit: 'kmh' | 'ms';
  windDirection: string;
  skyCover: string;
  // Parameter calculation fields
  calculationMethod: 'papoto' | 'visees-tangentes' | 'pep';
  leftSupport: string;
  spanLength: number | null;
  measuredElevationDifference: number | null;
  HG: number | null;
  H1: number | null;
  H2: number | null;
  H3: number | null;
  HD: number | null;
  VG: number | null;
  V1: number | null;
  V2: number | null;
  V3: number | null;
  VD: number | null;
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
  cableName: string;
  transit: string;
  windIncidence: number | null;
  windIncidenceMode: 'auto' | 'perpendicular';
  diffuseSolarFlux: number | null;
  directSolarFlux: number | null;
  diffuseDirectSolarFlux: number | null;
  measuredSolarFlux: number | null;
  // Parameter at 15°C without wind fields
  updateMode15C: 'auto' | 'manual';
  parameterFapolo: number | null;
  parameterUncertaintyFapolo: number | null;
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
