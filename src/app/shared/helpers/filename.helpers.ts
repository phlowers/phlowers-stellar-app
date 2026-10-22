// Replaces the characters that are illegal in a file name on common filesystems
export function sanitizeFilenamePart(value: string): string {
  return value.replace(/[/\\:*?"<>|]/g, '-');
}
