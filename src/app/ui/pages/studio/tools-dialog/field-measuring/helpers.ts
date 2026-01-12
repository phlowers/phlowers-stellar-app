import { Section } from '@core/data/database/interfaces/section';
import { FieldMeasure } from './types';
import { v4 as uuidv4 } from 'uuid';
import { findMiddleSpan } from '@src/app/ui/shared/helpers/findMiddleSpan';

export const createInitialMeasureData = (
  section: Section | null,
  name: string,
  startSupport: number | null,
  endSupport: number | null
): FieldMeasure => {
  let span: number[] | null = null;
  if (startSupport !== null && endSupport !== null) {
    span = findMiddleSpan(startSupport, endSupport);
  }
  return {
    uuid: uuidv4(),
    name: name || '',
    span,
    longitude: null,
    latitude: null,
    altitude: null,
    azimuth: null,
    date: null,
    time: null,
    season: 'summer',
    ambientTemperature: null,
    windSpeed: null,
    windSpeedUnit: 'kmh',
    windDirection: null,
    skyCover: null,
    calculationMethod: 'papoto',
    leftSupport: null,
    spanLength: null,
    measuredElevationDifference: null,
    HL: null,
    H1: null,
    H2: null,
    H3: null,
    HR: null,
    VL: null,
    V1: null,
    V2: null,
    V3: null,
    VR: null,
    cableHAccDistance: null,
    cableVerticalAccAngle: null,
    calculationType: 'parametre',
    cableTangentAngle: null,
    lengthBetweenSightGD: null,
    elevationDifferenceBetweenSightGD: null,
    xSight1: null,
    xSight2: null,
    xSight3: null,
    ySight1: null,
    ySight2: null,
    ySight3: null,
    transit: null,
    windIncidence: null,
    windIncidenceMode: 'auto',
    diffuseSolarFlux: 123,
    directSolarFlux: null,
    diffuseDirectSolarFlux: 246,
    diffusedSolarFlux: null,
    measuredDiffusedPlusDirectSolarFlux: null,
    measuredDiffusedSolarFlux: null,
    diffusedPlusDirectSolarFlux: null,
    updateMode15C: 'auto',
    parameterPapoto: null,
    parameterUncertaintyPapoto: null,
    cableTemperature15C: null,
    cableTemperatureUncertainty15C: null,
    link: section?.link_name || null,
    voltage: section?.voltage_idr || null,
    spanType: section?.type || null,
    phaseNumber: section?.electric_phase_number || null,
    numberOfConductors: section?.cables_amount || null,
    cableName: section?.cable_name || null
  };
};
