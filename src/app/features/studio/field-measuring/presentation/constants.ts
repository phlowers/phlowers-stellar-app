import { SkyCover } from '@shared/domain';

/** Option entry for select dropdowns with a string label and value. */
export interface SelectOption<T extends string = string> {
  /** Display label for the option. */
  label: string;
  /** Underlying value. */
  value: T;
}

/** Predefined span options for field measuring. */
export const SPAN_OPTIONS: SelectOption[] = [
  { label: '12-13', value: '12-13' },
  { label: '13-14', value: '13-14' },
  { label: '14-15', value: '14-15' }
];

/** Available wind direction options for field measuring. */
export const WIND_DIRECTION_OPTIONS: SelectOption[] = [
  { label: $localize`North`, value: 'North' },
  { label: $localize`North-East`, value: 'North-East' },
  { label: $localize`East`, value: 'East' },
  { label: $localize`South-East`, value: 'South-East' },
  { label: $localize`South`, value: 'South' },
  { label: $localize`South-West`, value: 'South-West' },
  { label: $localize`West`, value: 'West' },
  { label: $localize`North-West`, value: 'North-West' }
];

/** Time mode options (summer / winter). */
export const TIME_MODE_OPTIONS: SelectOption[] = [
  { label: $localize`Summer`, value: 'summer' },
  { label: $localize`Winter`, value: 'winter' }
];

/** Available wind speed unit options (km/h or m/s). */
export const WIND_SPEED_UNIT_OPTIONS: SelectOption[] = [
  { label: 'km/h', value: 'kmh' },
  { label: 'm/s', value: 'ms' }
];

/** Available sky cover options for field measuring (N0–N8 nebulosity scale). */
export const SKY_COVER_OPTIONS: SelectOption<SkyCover>[] = [
  { label: `N0`, value: SkyCover.N0 },
  { label: $localize`N1 - Sunny`, value: SkyCover.N1 },
  { label: $localize`N2 - partly cloudy`, value: SkyCover.N2 },
  { label: `N3`, value: SkyCover.N3 },
  { label: `N4`, value: SkyCover.N4 },
  { label: $localize`N5 - Cloudy`, value: SkyCover.N5 },
  { label: $localize`N6 - Covered sky`, value: SkyCover.N6 },
  { label: `N7`, value: SkyCover.N7 },
  { label: $localize`N8 - covered - smoky`, value: SkyCover.N8 }
];

/** Min/max bounds for the transit input (in Amperes). */
export const TRANSIT_BOUNDS = { min: 0, max: 4000 };

/** Min/max bounds and default for the measured solar beam input (in W/m²). Decimals are not allowed. */
export const MEASURED_SOLAR_FLUX_BOUNDS = { min: 0, max: 2000, default: 0 };

/** Default left support options for field measuring. */
export const LEFT_SUPPORT_OPTIONS: SelectOption[] = [
  { label: $localize`Support 1`, value: 'support1' },
  { label: $localize`Support 2`, value: 'support2' },
  { label: $localize`Support 3`, value: 'support3' }
];
