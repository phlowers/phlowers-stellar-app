import { Section, Support } from '@shared/domain';
import { Localization, Task, TaskInputs } from '@services/worker_python/tasks/types';
import { FieldMeasure, FieldMeasureOutputs } from '../domain/types';
import { v4 as uuidv4 } from 'uuid';
import { findMiddleSpan } from '@shared/helpers/findMiddleSpan';
import { formatSupportNumber } from '@shared/helpers/formatSupportNumber';
import { TranslocoService } from '@jsverse/transloco';
import {
  SelectOption,
  TranslatableSelectOption,
  WIND_DIRECTION_OPTION_KEYS,
  TIME_MODE_OPTION_KEYS,
  SKY_COVER_OPTION_SOURCES,
  LEFT_SUPPORT_OPTION_KEYS,
  MEASURED_SOLAR_FLUX_BOUNDS
} from './constants';

/**
 * Builds select options from translatable option keys, resolving each label through Transloco.
 * @param options - The translatable option keys to build from
 * @param translocoService - Service used to resolve the translated labels
 * @returns `SelectOption[]` with translated labels
 */
export const buildTranslatableSelectOptions = (
  options: TranslatableSelectOption[],
  translocoService: TranslocoService
): SelectOption[] =>
  options.map((option) => ({
    value: option.value,
    label: translocoService.translate(option.labelKey)
  }));

/**
 * Builds the wind direction select options with labels translated through Transloco.
 * @param translocoService - Service used to resolve the translated labels
 * @returns Wind direction `SelectOption[]` with translated labels
 */
export const buildWindDirectionOptions = (translocoService: TranslocoService): SelectOption[] =>
  buildTranslatableSelectOptions(WIND_DIRECTION_OPTION_KEYS, translocoService);

/**
 * Builds the time mode (summer / winter) select options with labels translated through Transloco.
 * @param translocoService - Service used to resolve the translated labels
 * @returns Time mode `SelectOption[]` with translated labels
 */
export const buildTimeModeOptions = (translocoService: TranslocoService): SelectOption[] =>
  buildTranslatableSelectOptions(TIME_MODE_OPTION_KEYS, translocoService);

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
  buildTranslatableSelectOptions(LEFT_SUPPORT_OPTION_KEYS, translocoService);

/**
 * Formats the display label of a support — its formatted `number`, or its 1-based index when it has none.
 * @param supports - The section supports
 * @param index - The support index
 * @returns The support label
 */
const formatSupportLabel = (supports: Support[], index: number): string => {
  const supportNumber = supports[index]?.number;
  return supportNumber ? formatSupportNumber(supportNumber) : String(index + 1);
};

/**
 * Formats the display label for a span, given its support indices — e.g. "12 - 13".
 * Falls back to a 1-based index when a support has no `number` (mirrors the header's span dropdown).
 * @param section - The current section, used to resolve support numbers
 * @param span - The `[leftIndex, rightIndex]` support indices of the span (or `null`)
 * @returns The formatted span label, or an empty string when `span` is not a valid pair
 */
export const formatSpanLabel = (section: Section | null, span: number[] | null): string => {
  if (span?.length !== 2) {
    return '';
  }
  const supports = section?.supports ?? [];
  const [leftIndex, rightIndex] = span;
  return `${formatSupportLabel(supports, leftIndex)} - ${formatSupportLabel(supports, rightIndex)}`;
};

/**
 * Normalizes an azimuth (degrees) into the `]-180, 180]` range accepted by the field measure form.
 * @param azimuth - The azimuth in degrees
 * @returns The normalized azimuth
 */
const normalizeAzimuth = (azimuth: number): number => {
  const positive = ((azimuth % 360) + 360) % 360;
  return positive > 180 ? positive - 360 : positive;
};

/**
 * Builds the `computeLocalization` task inputs from the section start point and span geometry
 * (same computation as the "view section data" supports table).
 * @param section - The current section
 * @returns The task inputs, or `null` when the section has no start localization or incomplete span geometry
 */
export const buildSectionLocalizationPayload = (
  section: Section | null
): TaskInputs[Task.computeLocalization] | null => {
  const supports = section?.supports ?? [];
  const lastIndex = supports.length - 1;
  if (
    !section ||
    supports.length === 0 ||
    section.start_latitude == null ||
    section.start_longitude == null ||
    section.start_azimuth == null ||
    supports.slice(0, -1).some((support) => support.spanLength == null || support.spanAngle == null)
  ) {
    return null;
  }
  return {
    startLatitude: section.start_latitude,
    startLongitude: section.start_longitude,
    startAzimuth: section.start_azimuth,
    spanLength: supports.map((support, i) => (i === lastIndex ? Number.NaN : support.spanLength!)),
    lineAngle: supports.map((support, i) => (i === lastIndex ? 0 : support.spanAngle!))
  };
};

/**
 * Picks the localization of the reference support of a span from the computed section localization.
 * Uses the span's left support when no support of the span matches `referenceSupport`.
 * @param localization - The computed section localization (one entry per support)
 * @param section - The current section, used to resolve support labels
 * @param span - The `[leftIndex, rightIndex]` support indices of the span (or `null`)
 * @param referenceSupport - The stored support index, or a legacy support label (or `null`)
 * @returns The support localization, or `null` when it is not available
 */
export const getSpanLocalization = (
  localization: Localization,
  section: Section | null,
  span: number[] | null,
  referenceSupport: string | null
): { longitude: number; latitude: number; azimuth: number } | null => {
  if (span?.length !== 2) {
    return null;
  }
  const supports = section?.supports ?? [];
  const referenceIndex =
    span.find((index) => String(index) === referenceSupport) ??
    span.find((index) => formatSupportLabel(supports, index) === referenceSupport) ??
    span[0];
  const longitude = localization.longitude[referenceIndex];
  const latitude = localization.latitude[referenceIndex];
  const azimuth = localization.azimuth[referenceIndex];
  if (![longitude, latitude, azimuth].every(Number.isFinite)) {
    return null;
  }
  return { longitude, latitude, azimuth: normalizeAzimuth(azimuth) };
};

/**
 * Sanitizes a field measure name for use as a downloaded file name, stripping characters unsafe for file systems.
 * @param name - The raw measure name
 * @returns A sanitized, filename-safe string (falls back to `field-measure` when empty after sanitizing)
 */
const sanitizeFilename = (name: string): string =>
  name
    .trim()
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '') || 'field-measure';

/**
 * Formats a generation date as `YYYY-MM-DD` in local time.
 * @param date - The generation date
 * @returns The formatted date segment
 */
const formatGenerationDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Builds the download filename (without extension) for a field measure JSON export.
 * Format: "Export Mesure de terrain_<measure name>_<section name>_<generation date>".
 * @param measureData - The field measure to export
 * @param sectionName - The name of the section the measure belongs to (or `null`)
 * @param generationDate - The date the export is generated (defaults to now)
 * @returns A sanitized filename
 */
export const buildFieldMeasureExportFilename = (
  measureData: FieldMeasure,
  sectionName: string | null,
  generationDate: Date = new Date()
): string =>
  [
    'Export Mesure de terrain',
    sanitizeFilename(measureData.name),
    sanitizeFilename(sectionName || ''),
    formatGenerationDate(generationDate)
  ].join('_');

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
    link: section?.link_adr || null,
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
    link_adr: 'Line 225kV Rougemontier - Tourbe #1',
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
