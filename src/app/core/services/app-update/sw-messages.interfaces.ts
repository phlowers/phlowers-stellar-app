import type { BackgroundDownloadReason } from './network-rule.interfaces';

export type SwLogLevel = 'info' | 'warn' | 'error';

/** Technical log relayed by the service worker to the page, which forwards it to `LoggerService`. */
export interface SwLogMessage {
  type: 'SW_LOG';
  level: SwLogLevel;
  message: string;
}

export type InstallRefusalReason = Exclude<BackgroundDownloadReason, 'allowed'> | 'storage-insufficient';

/** Sent to the pages when an installation is refused before any download (or after a quota error). */
export interface SwInstallRefusedMessage {
  type: 'SW_INSTALL_REFUSED';
  reason: InstallRefusalReason;
  downlinkMbps: number | null;
  requiredBytes: number | null;
  freeBytes: number | null;
}

export type SwOutgoingMessage = SwLogMessage | SwInstallRefusedMessage;

/**
 * Page -> service worker: download the versioned catalog URLs (`/data/<file>?v=<sha>`) into the catalog cache,
 * one at a time. Subject to the network rule unless `force` (no catalog in IndexedDB yet). When a
 * `MessagePort` is transferred, the `PrefetchCatalogsResult` is posted back on it.
 */
export interface PrefetchCatalogsMessage {
  type: 'PREFETCH_CATALOGS';
  urls: string[];
  force: boolean;
}

export interface PrefetchCatalogsResult {
  /** Why nothing was downloaded, or null when the prefetch ran. */
  refused: InstallRefusalReason | null;
  /** Absolute URLs now in the catalog cache (downloaded or already present). */
  cached: string[];
  /** Absolute URLs that could not be downloaded (network error, redirect, non-OK). */
  failed: string[];
}
