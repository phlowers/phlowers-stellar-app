function getCSSVariable(variableName: string): string {
  if (typeof document !== 'undefined') {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(`--${variableName}`)
      .trim();
  }
  return '';
}

export function getColorPalette(
  paletteName: string,
  keys: (string | number)[] = [
    0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950
  ]
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
