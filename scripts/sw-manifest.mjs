// Locates the precache manifest that workbox-build injects in place of `self.__WB_MANIFEST`.

/**
 * @param {string} code - content of a built service-worker.js
 * @returns {{ start: number, end: number, manifest: Array<{ url: string, revision: string, integrity?: string, sizeBytes?: number }> }}
 *   `start`/`end` delimit the JSON array in `code` (end exclusive), so it can be replaced.
 */
export function extractManifestSpan(code) {
  // workbox-build serializes each entry with sorted keys.
  const start = code.search(/\[\{"(?:integrity|revision|sizeBytes|url)":/);
  if (start < 0) {
    throw new Error('No injected manifest found in service-worker.js');
  }
  let depth = 0;
  let inString = false;
  for (let index = start; index < code.length; index++) {
    const char = code[index];
    if (inString) {
      if (char === '\\') index++;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '[' || char === '{') depth++;
    else if ((char === ']' || char === '}') && --depth === 0) {
      return { start, end: index + 1, manifest: JSON.parse(code.slice(start, index + 1)) };
    }
  }
  throw new Error('Unterminated injected manifest');
}
