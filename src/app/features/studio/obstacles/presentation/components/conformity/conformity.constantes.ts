import { ResultRow } from './conformity.model';

export const CONFORMITY_BOUNDS = {
  repartitionTemperature: { step: 0.01, min: 0, max: 250 },
  lateralDistanceTemperature: { step: 0.01, min: 0, max: 250 }
} as const;

export const ALTITUDE_TYPE_LABELS: Record<string, string> = {
  absolute: $localize`Absolute (NGF)`,
  relative: $localize`Relative to support`,
  relative_cable: $localize`Relative to cable attachment`
};

export const LATERAL_DISTANCE_TYPE_LABELS: Record<string, string> = {
  SPAN_AXIS: $localize`Span axis`
};

export const CONFORMITY_COMMON_ROWS: ResultRow[] = [
  {
    label: $localize`Cable altitude`,
    overhangKey: 'overhangCableAltitude',
    lateralKey: 'lateralCableAltitude',
    unit: 'm'
  },
  {
    label: $localize`Cable line axis distance`,
    overhangKey: 'overhangCableLineAxisDistance',
    lateralKey: 'lateralCableLineAxisDistance',
    unit: 'm'
  },
  {
    label: $localize`Distance to comply`,
    overhangKey: 'overhangDistanceToComply',
    lateralKey: 'lateralDistanceToComply',
    unit: 'm'
  },
  { label: $localize`Compliance altitude`, overhangKey: 'overhangComplianceAltitude', lateralKey: null, unit: 'm' },
  {
    label: $localize`Compliance line axis distance`,
    overhangKey: null,
    lateralKey: 'lateralComplianceLineAxisDistance',
    unit: 'm'
  }
];

export const CONFORMITY_CABLE_TRACK_ROWS: ResultRow[] = [
  { label: $localize`Temperature`, overhangKey: 'overhangTemperature', lateralKey: 'lateralTemperature', unit: '°C' },
  {
    label: $localize`Wind pressure`,
    overhangKey: 'overhangWindPressure',
    lateralKey: 'lateralWindPressure',
    unit: 'Pa'
  },
  {
    label: $localize`Minimal distance`,
    overhangKey: 'overhangMinimalDistance',
    lateralKey: 'lateralMinimalDistance',
    unit: 'm'
  }
];
