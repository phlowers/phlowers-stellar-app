import { describe, expect, it } from 'vitest';
import { Support } from '@shared/domain/models/support.model';
import {
  computeOverhangZoneWidth,
  getEffectiveWindPressure,
  getElectricTensionLabel,
  getVisibleConformityCommonRows
} from './conformity.helpers';
import { ResultRow } from './conformity.model';

const supports = [
  { uuid: 'a', armLength: 2.5 },
  { uuid: 'b', armLength: -3 },
  { uuid: 'c', armLength: 0 },
  { uuid: 'd', armLength: null }
] as Support[];

describe('computeOverhangZoneWidth', () => {
  it('returns 2 times the arm length of the support', () => {
    expect(computeOverhangZoneWidth(supports, 'a')).toBe(5);
  });

  it('uses the absolute arm length', () => {
    expect(computeOverhangZoneWidth(supports, 'b')).toBe(6);
  });

  it.each(['c', 'd', 'unknown'])('returns undefined for support %s', (uuid) => {
    expect(computeOverhangZoneWidth(supports, uuid)).toBeUndefined();
  });
});

describe('getVisibleConformityCommonRows', () => {
  const rows: ResultRow[] = [
    { label: 'Cable altitude', overhangKey: 'overhangCableAltitude', lateralKey: 'lateralCableAltitude', unit: 'm' },
    { label: 'Compliance altitude', overhangKey: 'overhangComplianceAltitude', lateralKey: null, unit: 'm' },
    {
      label: 'Compliance line axis distance',
      overhangKey: null,
      lateralKey: 'lateralComplianceLineAxisDistance',
      unit: 'm'
    }
  ];

  it('hides compliance border rows for cable-track charts', () => {
    expect(getVisibleConformityCommonRows(rows, 'cable_track')).toEqual([rows[0]]);
  });

  describe('getEffectiveWindPressure', () => {
    const windZones = [
      { label: 'Zone 1', normal: 100, red_zone: 250 },
      { label: 'Zone 2', normal: 150, red_zone: 300 }
    ];

    it('uses the normal pressure when the red zone is disabled', () => {
      expect(getEffectiveWindPressure(windZones, 'Zone 1', false)).toBe(100);
    });

    it('uses the red-zone pressure when enabled', () => {
      expect(getEffectiveWindPressure(windZones, 'Zone 2', true)).toBe(300);
    });

    it('returns null when the selected wind zone is unavailable', () => {
      expect(getEffectiveWindPressure(windZones, 'missing', false)).toBeNull();
      expect(getEffectiveWindPressure(windZones, null, false)).toBeNull();
    });
  });

  it('hides only the compliance line axis distance row for overhang charts', () => {
    expect(getVisibleConformityCommonRows(rows, 'overhang')).toEqual([rows[0], rows[1]]);
  });

  it.each(['vegetation', 'unknown', null, undefined])('keeps every row for %s charts', (conformityType) => {
    expect(getVisibleConformityCommonRows(rows, conformityType)).toEqual(rows);
  });
});

describe('getElectricTensionLabel', () => {
  it('returns the voltage or a dash', () => {
    expect(getElectricTensionLabel('400 KV')).toBe('400 KV');
    expect(getElectricTensionLabel(undefined)).toBe('-');
    expect(getElectricTensionLabel(null)).toBe('-');
  });
});
