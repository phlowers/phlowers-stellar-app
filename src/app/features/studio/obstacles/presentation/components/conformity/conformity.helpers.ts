import { Support } from '@shared/domain/models/support.model';
import { CABLE_TRACK_HIDDEN_RESULT_KEYS } from './conformity.constantes';
import { ResultRow } from './conformity.model';

/** Hides the compliance border rows, which are not displayed for cable-track charts. */
export function getVisibleConformityCommonRows(
  rows: readonly ResultRow[],
  conformityType: string | null | undefined
): ResultRow[] {
  if (conformityType !== 'cable_track') return [...rows];
  return rows.filter(
    (row) => !CABLE_TRACK_HIDDEN_RESULT_KEYS.some((key) => key === row.overhangKey || key === row.lateralKey)
  );
}

/**
 * Width (m) of the overhang conformity zone: 2 times the arm length of the obstacle's support.
 * Returns `undefined` when the arm length is unknown or zero, so the engine keeps its default width.
 */
export function computeOverhangZoneWidth(supports: readonly Support[], supportUuid: string): number | undefined {
  const armLength = supports.find((s) => s.uuid === supportUuid)?.armLength;
  if (!armLength) return undefined;
  return 2 * Math.abs(armLength);
}
