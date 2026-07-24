import { Section } from '@shared/domain';
import { FieldMeasure, FieldMeasureOutputs } from '../domain/types';
import { v4 as uuidv4 } from 'uuid';
import { findMiddleSpan } from '@shared/helpers/findMiddleSpan';
import { TranslocoService } from '@jsverse/transloco';
import {
  SelectOption,
  WIND_DIRECTION_OPTION_KEYS,
  TIME_MODE_OPTION_KEYS,
  SKY_COVER_OPTION_SOURCES,
  LEFT_SUPPORT_OPTION_KEYS
} from './constants';

/**
 * Builds the wind direction select options with labels translated through Transloco.
 * @param translocoService - Service used to resolve the translated labels
 * @returns Wind direction `SelectOption[]` with translated labels
 */
export const buildWindDirectionOptions = (translocoService: TranslocoService): SelectOption[] =>
  WIND_DIRECTION_OPTION_KEYS.map((option) => ({
    value: option.value,
    label: translocoService.translate(option.labelKey)
  }));

/**
 * Builds the time mode (summer / winter) select options with labels translated through Transloco.
 * @param translocoService - Service used to resolve the translated labels
 * @returns Time mode `SelectOption[]` with translated labels
 */
export const buildTimeModeOptions = (translocoService: TranslocoService): SelectOption[] =>
  TIME_MODE_OPTION_KEYS.map((option) => ({
    value: option.value,
    label: translocoService.translate(option.labelKey)
  }));

/**
 * Builds the sky cover select options, translating only the entries that carry a translation key.
 * @param translocoService - Service used to resolve the translated labels
 * @returns Sky cover `SelectOption[]` with translated labels
 */
export const buildSkyCoverOptions = (translocoService: TranslocoService): SelectOption[] =>
  SKY_COVER_OPTION_SOURCES.map((option) =>
    'labelKey' in option
      ? { value: option.value, label: translocoService.translate(option.labelKey) }
      : { value: option.value, label: option.label }
  );

/**
 * Builds the left support select options with labels translated through Transloco.
 * @param translocoService - Service used to resolve the translated labels
 * @returns Left support `SelectOption[]` with translated labels
 */
export const buildLeftSupportOptions = (translocoService: TranslocoService): SelectOption[] =>
  LEFT_SUPPORT_OPTION_KEYS.map((option) => ({
    value: option.value,
    label: translocoService.translate(option.labelKey)
  }));

/**
 * Determines if the current date is in Daylight Saving Time (DST)
 * Compares current timezone offset with standard time offset
 * @param date - The date to check (defaults to current date)
 * @returns true if in DST (summer), false otherwise (winter)
 */
function isDaylightSavingTime(date: Date = new Date()): boolean {
  const january = new Date(date.getFullYear(), 0, 1);
  const july = new Date(date.getFullYear(), 6, 1);
  const stdTimezoneOffset = Math.max(january.getTimezoneOffset(), july.getTimezoneOffset());
  return date.getTimezoneOffset() < stdTimezoneOffset;
}

/**
 * Creates the initial field measure data for a new measurement session.
 * @param section - The current section, used to pre-populate cable/link metadata.
 * @param name - Name of the new measure
 * @param startSupport - Start support index for span detection
 * @param endSupport - End support index for span detection
 * @returns A new `FieldMeasure` with generated UUID and defaults
 */
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
    measuredDiffusedPlusDirectSolarFlux: MEASURED_SOLAR_FLUX_BOUNDS.default,
    measuredDiffusedSolarFlux: null,
    diffusedPlusDirectSolarFlux: null,
    updateMode15C: 'auto',
    parameterPapoto: null,
    parameterUncertaintyPapoto: null,
    cableTemperatureCalibration: null,
    cableTemperatureCalibrationUncertainty: null,
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

/**
 * Creates a test `FieldMeasure` with predefined mock section data.
 * @param overrides - Optional partial overrides to apply
 * @returns A `FieldMeasure` suitable for testing
 */
export const createTestMeasureData = (overrides?: Partial<FieldMeasure>): FieldMeasure => {
  const mockSection: Partial<Section> = {
    link_name: 'Line 225kV Rougemontier - Tourbe #1',
    voltage_idr: '123 kV',
    type: 'phase',
    electric_phase_number: 3,
    cables_amount: 3,
    cable_name: 'ASTER570'
  };

  return {
    ...createInitialMeasureData(mockSection as Section, '', 11, 12),
    ...overrides
  };
};

/** Default empty outputs for a new field measure. */
export const initialFieldMeasureOutputs: FieldMeasureOutputs = {
  papoto: null,
  cableTemperature: null,
  parameter15C: null
};
