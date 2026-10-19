// Same slug rule as `app_name_slug` in docs-sphinx/source/conf.py, which names the generated PDF
export function buildManualPdfFileName(appName: string, version: string): string {
  const appNameSlug = appName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  return `${appNameSlug}_documentation_${version}.pdf`;
}
