/** Returns the maximum finite value of an array, or null when empty/absent. */
export function maxOf(values: number[] | undefined): number | null {
  if (!values || values.length === 0) return null;
  const max = Math.max(...values);
  return Number.isFinite(max) ? max : null;
}
