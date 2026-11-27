// Replaces the characters that are illegal in a file name on common filesystems
export function sanitizeFilenamePart(value: string): string {
  return value.replace(/[/\\:*?"<>|]/g, '-');
}

/**
 * Formats a date as `YYYY-MM-DD` (or `YYYY-MM-DD HH-mm` with `withTime`) in local time, for use in a file name.
 * @param date - The date to format
 * @param withTime - Appends the hours and minutes (`-` separated, usable in a file name)
 * @returns The formatted date segment
 */
export const formatGenerationDate = (date: Date, withTime = false): string => {
  const pad = (value: number): string => String(value).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return withTime ? `${day} ${pad(date.getHours())}-${pad(date.getMinutes())}` : day;
};
