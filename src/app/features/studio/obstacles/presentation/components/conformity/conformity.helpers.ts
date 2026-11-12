import { Support } from '@shared/domain/models/support.model';
import { HIDDEN_RESULT_KEYS_BY_CONFORMITY_TYPE } from './conformity.constantes';
import { ResultRow } from './conformity.model';

/** Hides the rows not displayed for the chart type (compliance border rows for cable-track and overhang). */
export function getVisibleConformityCommonRows(
  rows: readonly ResultRow[],
  conformityType: string | null | undefined
): ResultRow[] {
  const hiddenKeys = conformityType ? HIDDEN_RESULT_KEYS_BY_CONFORMITY_TYPE[conformityType] : undefined;
  if (!hiddenKeys) return [...rows];
  return rows.filter((row) => !hiddenKeys.some((key) => key === row.overhangKey || key === row.lateralKey));
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
