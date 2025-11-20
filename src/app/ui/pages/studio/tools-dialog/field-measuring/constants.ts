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
  { label: 'North', value: 'North' },
  { label: 'North-East', value: 'North-East' },
  { label: 'East', value: 'East' },
  { label: 'South-East', value: 'South-East' },
  { label: 'South', value: 'South' },
  { label: 'South-West', value: 'South-West' },
  { label: 'West', value: 'West' },
  { label: 'North-West', value: 'North-West' }
];

export const SKY_COVER_OPTIONS: SelectOption[] = [
  { label: '0 (clear)', value: '0 (clear)' },
  { label: '4 (partly cloudy)', value: '4 (partly cloudy)' },
  { label: '8 (cloudy)', value: '8 (cloudy)' }
];

export const LEFT_SUPPORT_OPTIONS: SelectOption[] = [
  { label: 'Support 1', value: 'support1' },
  { label: 'Support 2', value: 'support2' },
  { label: 'Support 3', value: 'support3' }
];

export const CABLE_OPTIONS: SelectOption[] = [
  { label: 'ASTER570', value: 'ASTER570' },
  { label: 'ASTER490', value: 'ASTER490' },
  { label: 'ASTER380', value: 'ASTER380' }
];
