export interface SelectOption {
  label: string;
  value: string;
}

export const SPAN_OPTIONS: SelectOption[] = [
  { label: '12-13', value: '12-13' },
  { label: '13-14', value: '13-14' },
  { label: '14-15', value: '14-15' }
];

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

export const TIME_MODE_OPTIONS: SelectOption[] = [
  { label: $localize`Summer`, value: 'summer' },
  { label: $localize`Winter`, value: 'winter' }
];

export const WIND_SPEED_UNIT_OPTIONS: SelectOption[] = [
  { label: 'km/h', value: 'kmh' },
  { label: 'm/s', value: 'ms' }
];

export const SKY_COVER_OPTIONS: SelectOption[] = [
  { label: `N0`, value: 'N0' },
  { label: $localize`N1 - Sunny`, value: 'N1' },
  { label: $localize`N2 - partly cloudy`, value: 'N2' },
  { label: `N3`, value: 'N3' },
  { label: `N4`, value: 'N4' },
  { label: $localize`N5 - Cloudy`, value: 'N5' },
  { label: $localize`N6 - Covered sky`, value: 'N6' },
  { label: `N7`, value: 'N7' },
  { label: $localize`N8 - covered - smoky`, value: 'N8' }
];

export const LEFT_SUPPORT_OPTIONS: SelectOption[] = [
  { label: $localize`Support 1`, value: 'support1' },
  { label: $localize`Support 2`, value: 'support2' },
  { label: $localize`Support 3`, value: 'support3' }
];

export const CABLE_OPTIONS: SelectOption[] = [
  { label: 'ASTER570', value: 'ASTER570' },
  { label: 'ASTER490', value: 'ASTER490' },
  { label: 'ASTER380', value: 'ASTER380' }
];
