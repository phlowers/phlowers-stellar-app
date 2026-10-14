/**
 * Offline readiness of the application, driven by the Workbox service worker lifecycle.
 *
 * `deferred-network` / `storage-insufficient` are only used while no version is installed yet: once the app is
 * ready offline, a refused update keeps `ready-offline` and is exposed through `lastRefusal`.
 */
export type AppUpdateState =
  | 'unsupported'
  | 'not-installed'
  | 'installing'
  | 'ready-offline'
  | 'update-waiting'
  | 'deferred-network'
  | 'storage-insufficient';

/** Identity of the code running in this page (baked into the bundle at build time). */
export interface RunningVersion {
  version: string;
  gitHash: string;
  /** Read from `/version.json`, only when it describes this same build; null otherwise. */
  buildDateUtc: string | null;
}

/** `dist/version.json` as written by `scripts/set-env-variables.py`. */
export interface VersionFile {
  git_hash?: string;
  version?: string;
  build_datetime_utc?: string;
}

export interface UpdateCheckDecision {
  allowed: boolean;
  /** Refusal reason, or null when allowed. */
  reason: 'deferred-network' | 'storage-insufficient' | null;
}

/** The five states shown to the user (top bar indicator, admin page). */
export type OfflineStatusKind = 'ready' | 'preparing' | 'waiting-network' | 'storage-insufficient' | 'not-prepared';

/** Network and storage measurements shown on the admin page. */
export interface UpdateDiagnostics {
  downlinkMbps: number | null;
  thresholdMbps: number;
  usageBytes: number | null;
  quotaBytes: number | null;
}
