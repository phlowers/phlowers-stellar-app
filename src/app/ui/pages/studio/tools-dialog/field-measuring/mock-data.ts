import { CalculationResults } from './types';

export const leftSupportOption = [
  { label: '12', value: '12' },
  { label: '13', value: '13' },
  { label: '14', value: '14' },
  { label: '15', value: '15' }
];

export const INITIAL_CALCULATION_RESULTS: CalculationResults = {
  parameter: null,
  parameterUncertainty: null,
  parameter12: null,
  parameter23: null,
  parameter13: null,
  criteria05: null,
  sideDGreaterThan2m: null,
  sideDValid: null,
  validMeasurement: null,
  cableTemperature: null,
  cableTemperatureUncertainty: null,
  cableSolarFlux: null,
  parameter15CMinusUncertainty: null,
  parameter15C: null,
  parameter15CPlusUncertainty: null
};
