import { Support } from '@shared/domain/models/support.model';

/**
 * Width (m) of the overhang conformity zone: 2 times the arm length of the obstacle's support.
 * Returns `undefined` when the arm length is unknown or zero, so the engine keeps its default width.
 */
export function computeOverhangZoneWidth(supports: readonly Support[], supportUuid: string): number | undefined {
  const armLength = supports.find((s) => s.uuid === supportUuid)?.armLength;
  if (!armLength) return undefined;
  return 2 * Math.abs(armLength);
}
