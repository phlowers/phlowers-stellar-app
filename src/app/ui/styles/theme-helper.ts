/**
 * Retrieves a CSS custom property value from the document root.
 * @param variableName - The variable name without the `--` prefix.
 * @returns The trimmed CSS variable value, or an empty string if unavailable.
 */
function getCSSVariable(variableName: string): string {
  if (typeof document !== 'undefined') {
    return getComputedStyle(document.documentElement).getPropertyValue(`--${variableName}`).trim();
  }
  return '';
}

/**
 * Builds a color palette object by reading CSS custom properties for the given palette name.
 * @param paletteName - Base name of the CSS variable palette (e.g. 'primary').
 * @param keys - Shade keys to look up (e.g. 0, 50, 100, ... 950).
 * @returns Record mapping shade key strings to their resolved CSS color values.
 */
export function getColorPalette(
  paletteName: string,
  keys: (string | number)[] = [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
) {
  const colors: Record<string, string> = {};

  keys.forEach((key) => {
    const cssVarName = `${paletteName}-${key}`;
    const color = getCSSVariable(cssVarName);
    if (color) {
      colors[key.toString()] = color;
    }
  });

  return colors;
}
