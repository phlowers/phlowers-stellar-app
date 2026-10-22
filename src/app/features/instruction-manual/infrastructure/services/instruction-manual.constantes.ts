import { environment } from '@src/environments/environment';
import { buildManualPdfDownloadName, buildManualPdfServedName } from './instruction-manual.helpers';
import { ManualPdfInfo } from './instruction-manual.model';

/** Entry point of the static Sphinx site, served by Apache next to the app. */
export const ONLINE_MANUAL_URL = '/docs/index.html';
/**
 * Name of the PDF built by `make simplepdf`, whatever the language.
 * It carries the app name (Stellar, Celeste...) but no version: an app installed before a release keeps its old
 * bundle until the user accepts the update, so a versioned URL would point to a PDF the server no longer publishes.
 * The server revalidates the file so a new release never serves a cached older manual.
 */
export const MANUAL_PDF_URL_FILE_NAME = buildManualPdfServedName(environment.appName);
/** Name proposed to the user when saving the PDF, with the app name and version. */
export const MANUAL_PDF_DOWNLOAD_FILE_NAME = buildManualPdfDownloadName(environment.appName, environment.version);

export const UNKNOWN_PDF_INFO: ManualPdfInfo = { sizeBytes: null, lastModified: null };
