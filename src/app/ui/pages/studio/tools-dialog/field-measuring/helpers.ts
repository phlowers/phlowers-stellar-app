import { Section } from '@core/domain';
import { FieldMeasure, FieldMeasureOutputs } from './types';
import { v4 as uuidv4 } from 'uuid';
import { findMiddleSpan } from '@ui/shared/helpers/findMiddleSpan';

/**
 * Determines if the current date is in Daylight Saving Time (DST)
 * Compares current timezone offset with standard time offset
 * @param date - The date to check (defaults to current date)
 * @returns true if in DST (summer), false otherwise (winter)
 */
function isDaylightSavingTime(date: Date = new Date()): boolean {
  const january = new Date(date.getFullYear(), 0, 1);
  const july = new Date(date.getFullYear(), 6, 1);
  const stdTimezoneOffset = Math.max(
    january.getTimezoneOffset(),
    july.getTimezoneOffset()
  );
  return date.getTimezoneOffset() < stdTimezoneOffset;
}

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
  const now = new Date();

  return {
    uuid: uuidv4(),
    name: name || '',
    span,
    longitude: null,
    latitude: null,
    altitude: null,
    azimuth: null,
    date: now,
    time: now,
    season: isDaylightSavingTime(now) ? 'summer' : 'winter',
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
    manualParameterCalculation15CWithoutWind: null,
    link: section?.link_name || null,
    voltage: section?.voltage_idr || null,
    spanType: section?.type || null,
    phaseNumber: section?.electric_phase_number || null,
    numberOfConductors: section?.cables_amount || null,
    cableName: section?.cable_name || null,
    outputs: initialFieldMeasureOutputs
  };
};

// Mocked measureData for tests
export const createTestMeasureData = (
  overrides?: Partial<FieldMeasure>
): FieldMeasure => {
  const mockSection: Partial<Section> = {
    link_name: 'Line 225kV Rougemontier - Tourbe #1',
    voltage_idr: '123 kV',
    type: 'Phase',
    electric_phase_number: 3,
    cables_amount: 3,
    cable_name: 'ASTER570'
  };

  return {
    ...createInitialMeasureData(mockSection as Section, '', 11, 12),
    ...overrides
  };
};

export const initialFieldMeasureOutputs: FieldMeasureOutputs = {
  papoto: null,
  cableTemperature: null,
  parameter15C: null
};
