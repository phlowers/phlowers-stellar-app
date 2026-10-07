export interface AppVersion {
  /** Commit SHA: the only identity used to compare versions and name caches (same commit => no update). */
  git_hash: string;
  /** Display only: differs between two builds of the same commit. */
  build_datetime_utc: string;
  version: string;
}

export type UpdateLogLevel = 'info' | 'warn' | 'error';

/** One step of an install/update run, emitted by the Service Worker. */
export interface UpdateLogEntry {
  runId: string;
  level: UpdateLogLevel;
  step: string;
  /** Milliseconds since the run started. */
  elapsedMs: number;
  details?: Record<string, unknown>;
}

/** SW -> page message carrying one `UpdateLogEntry`. */
export interface UpdateLogMessage {
  message: 'log';
  entry: UpdateLogEntry;
}

export interface UpdateLogger {
  readonly runId: string;
  info(step: string, details?: Record<string, unknown>): void;
  warn(step: string, details?: Record<string, unknown>): void;
  error(step: string, details?: Record<string, unknown>): void;
}

export interface CacheControlState {
  active: string;
  previous: string | null;
}

/** Outcome of `precacheVersion`: `alreadyActive` means there is nothing to download nor activate. */
export interface PrecacheResult {
  cacheName: string;
  alreadyActive: boolean;
}

export type UpdateRunType = 'update' | 'install';

/** The single install/update run currently executing in the SW. */
export interface ActiveRun {
  runId: string;
  log: UpdateLogger;
  type: UpdateRunType;
  startedAt: number;
  filesTotal: number;
  filesDone: number;
  promise: Promise<AssetManifest>;
}

/** Files-based progress of the running install/update. */
export type UpdateRunProgress = Pick<ActiveRun, 'runId' | 'type' | 'filesTotal' | 'filesDone'>;

/**
 * SW -> page progress of the running install/update. `run: null` (reply to a `keepalive`)
 * means the SW has no run in progress, e.g. it was stopped and restarted by the browser.
 */
export interface UpdateProgressMessage {
  message: 'progress';
  run: UpdateRunProgress | null;
}

export interface ServiceWorkerStatus {
  run: (UpdateRunProgress & { elapsedMs: number }) | null;
  control: CacheControlState | null;
  caches: string[];
}

/** SW -> page reply to a `status` request. */
export interface ServiceWorkerStatusMessage {
  message: 'status';
  status: ServiceWorkerStatus;
}

export interface AssetManifest {
  app_version: AppVersion;
  /**
   * Application code assets to precache (HTML/JS/CSS/i18n/WASM/wheels).
   * Never includes catalog data files (CSV/JSON under `/data/`) — those are
   * described by `data_hashes` and updated independently of the app version.
   */
  files: string[];
  data_hashes?: Record<string, string>;
}
