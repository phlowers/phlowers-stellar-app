import { describe, expect, it } from 'vitest';
import { Support } from '@shared/domain/models/support.model';
import { computeOverhangZoneWidth, getVisibleConformityCommonRows } from './conformity.helpers';
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

  it('hides only the compliance line axis distance row for overhang charts', () => {
    expect(getVisibleConformityCommonRows(rows, 'overhang')).toEqual([rows[0], rows[1]]);
  });

  it.each(['vegetation', 'unknown', null, undefined])('keeps every row for %s charts', (conformityType) => {
    expect(getVisibleConformityCommonRows(rows, conformityType)).toEqual(rows);
  });
});
