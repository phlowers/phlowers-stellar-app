import { describe, expect, it } from 'vitest';
import { Support } from '@shared/domain/models/support.model';
import { computeOverhangZoneWidth } from './conformity.helpers';

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
