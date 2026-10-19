// Same slug rule as `app_name_slug` in docs-sphinx/source/conf.py
function slugifyAppName(appName: string): string {
  return appName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

// Name of the PDF on the server, same as `simplepdf_file_name` in docs-sphinx/source/conf.py. It has no version
// so that an app installed before a release still finds the PDF the server publishes
export function buildManualPdfServedName(appName: string): string {
  return `${slugifyAppName(appName)}_documentation.pdf`;
}

// Name proposed to the user when saving the PDF
export function buildManualPdfDownloadName(appName: string, version: string): string {
  return `${slugifyAppName(appName)}_documentation_${version}.pdf`;
}
