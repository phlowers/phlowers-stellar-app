function getCSSVariable(variableName: string): string {
  if (typeof document !== 'undefined') {
    return getComputedStyle(document.documentElement).getPropertyValue(`--${variableName}`).trim();
  }
  return '';
}

/**
 * Retrieves a color palette by reading CSS custom properties from the document root.
 * Each key in the returned record corresponds to a shade (e.g. `'50'`, `'500'`, `'900'`).
 * @category Styles
 * @param paletteName - The base name of the CSS custom property palette (e.g. `'primary'`).
 * @param keys - The shade keys to read. Defaults to a standard set from 0 to 950.
 * @returns A record mapping shade keys to their resolved CSS color values.
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
