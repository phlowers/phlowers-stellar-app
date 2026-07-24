import { SkyCover } from '@shared/domain';

/** Option entry for select dropdowns with a string label and value. */
export interface SelectOption<T extends string = string> {
  /** Display label for the option. */
  label: string;
  /** Underlying value. */
  value: T;
}

/** Option entry whose label must be resolved through Transloco before display. */
export interface TranslatableSelectOption {
  /** Transloco translation key for the display label. */
  labelKey: string;
  /** Underlying value. */
  value: string;
}

/** Sky cover option source: either a plain (non-translatable) label or a translation key. */
export type SkyCoverOptionSource = SelectOption | TranslatableSelectOption;

/** Predefined span options for field measuring. */
export const SPAN_OPTIONS: SelectOption[] = [
  { label: '12-13', value: '12-13' },
  { label: '13-14', value: '13-14' },
  { label: '14-15', value: '14-15' }
];

/** Available wind direction option keys for field measuring. */
export const WIND_DIRECTION_OPTION_KEYS: TranslatableSelectOption[] = [
  { labelKey: 'field-measuring.shared.wind-direction.north', value: 'North' },
  { labelKey: 'field-measuring.shared.wind-direction.north-east', value: 'North-East' },
  { labelKey: 'field-measuring.shared.wind-direction.east', value: 'East' },
  { labelKey: 'field-measuring.shared.wind-direction.south-east', value: 'South-East' },
  { labelKey: 'field-measuring.shared.wind-direction.south', value: 'South' },
  { labelKey: 'field-measuring.shared.wind-direction.south-west', value: 'South-West' },
  { labelKey: 'field-measuring.shared.wind-direction.west', value: 'West' },
  { labelKey: 'field-measuring.shared.wind-direction.north-west', value: 'North-West' }
];

/** Time mode option keys (summer / winter). */
export const TIME_MODE_OPTION_KEYS: TranslatableSelectOption[] = [
  { labelKey: 'field-measuring.shared.time-mode.summer', value: 'summer' },
  { labelKey: 'field-measuring.shared.time-mode.winter', value: 'winter' }
];

/** Available wind speed unit options (km/h or m/s). */
export const WIND_SPEED_UNIT_OPTIONS: SelectOption[] = [
  { label: 'km/h', value: 'kmh' },
  { label: 'm/s', value: 'ms' }
];

/** Available sky cover option sources for field measuring (N0–N8 nebulosity scale). */
export const SKY_COVER_OPTION: SkyCoverOptionSource[] = [
  { label: 'N0', value: 'N0' },
  { labelKey: 'field-measuring.shared.sky-cover.n1', value: 'N1' },
  { labelKey: 'field-measuring.shared.sky-cover.n2', value: 'N2' },
  { label: 'N3', value: 'N3' },
  { label: 'N4', value: 'N4' },
  { labelKey: 'field-measuring.shared.sky-cover.n5', value: 'N5' },
  { labelKey: 'field-measuring.shared.sky-cover.n6', value: 'N6' },
  { label: 'N7', value: 'N7' },
  { labelKey: 'field-measuring.shared.sky-cover.n8', value: 'N8' }
];

/** Min/max bounds for the transit input (in Amperes). */
export const TRANSIT_BOUNDS = { min: 0, max: 4000 };

/** Min/max bounds and default for the measured solar beam input (in W/m²). Decimals are not allowed. */
export const MEASURED_SOLAR_FLUX_BOUNDS = { min: 0, max: 2000, default: 0 };

/** Default left support option keys for field measuring. */
export const LEFT_SUPPORT_OPTION_KEYS: TranslatableSelectOption[] = [
  { labelKey: 'field-measuring.shared.left-support.support-1', value: 'support1' },
  { labelKey: 'field-measuring.shared.left-support.support-2', value: 'support2' },
  { labelKey: 'field-measuring.shared.left-support.support-3', value: 'support3' }
];
