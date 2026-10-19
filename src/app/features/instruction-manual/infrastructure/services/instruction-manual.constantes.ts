import { environment } from '@src/environments/environment';
import { buildManualPdfFileName } from './instruction-manual.helpers';
import { ManualPdfInfo } from './instruction-manual.model';

/** Entry point of the static Sphinx site, served by Apache next to the app. */
export const ONLINE_MANUAL_URL = '/docs/index.html';
/**
 * Name of the PDF built by `make simplepdf`, whatever the language.
 * It carries the app name (Stellar, Celeste...) and the version so a new release never serves a cached older manual.
 */
export const MANUAL_PDF_FILE_NAME = buildManualPdfFileName(environment.appName, environment.version);

export const UNKNOWN_PDF_INFO: ManualPdfInfo = { sizeBytes: null, lastModified: null };
