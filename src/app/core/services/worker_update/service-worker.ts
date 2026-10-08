import type {
  ActiveRun,
  AppVersion,
  AssetManifest,
  CacheControlState,
  PrecacheResult,
  ServiceWorkerStatus,
  ServiceWorkerStatusMessage,
  UpdateLogEntry,
  UpdateLogger,
  UpdateLogLevel,
  UpdateLogMessage,
  UpdateProgressMessage,
  UpdateRunProgress,
  UpdateRunType
} from './service-worker.interfaces';

/**
 * Pre-migration single-cache name. Recognized as the active version's cache
 * until the first successful install/update under the new versioned scheme
 * activates a real version cache and captures it as `previous`.
 */
const LEGACY_CACHE_NAME = 'app-assets';
/** Small cache holding only the activation pointer (see `CacheControlState`). */
const CONTROL_CACHE_NAME = 'app-assets-control';
const CONTROL_KEY = '/control';
const APP_VERSION_CACHE_KEY = '/app_version';
const NAVIGATE_TIMEOUT_MS = 13000;
/** A `progress` log line is emitted each time this share of the files has been cached. */
const PROGRESS_STEP_PERCENT = 10;
/** Number of files fetched at the same time during a precache. */
const PRECACHE_CONCURRENCY = 5;
/** A file attempt fails when no byte (headers or body chunk) arrives for this long; it is not retried. */
const FILE_STALL_TIMEOUT_MS = 30000;
/** Attempts per file (first try included) on network errors and 5xx. */
const MAX_FILE_ATTEMPTS = 4;
/** Delay before the first retry; doubles at each further retry. */
const RETRY_BASE_DELAY_MS = 1000;
/** Manifest attempts on network errors and 5xx: 3 x 13 s + 1 s + 2 s = 42 s, below the 45 s page watchdog. */
const MAX_MANIFEST_ATTEMPTS = 3;
/** Angular hashed output names (`chunk-4JLWSDW7.js`): the hash is content-based, so a file with that name is the same in any version. */
const HASHED_ASSET_PATTERN = /-[A-Z0-9]{8}\.(?:js|css)$/;
/** Web Lock held for a whole install/update: `activeRun` only covers one SW instance, not an old and a new one. */
const PRECACHE_LOCK_NAME = 'app-assets-precache';
/** Commit SHA identifying a version; mirrors `GIT_HASH_PATTERN` of the build scripts (the SW cannot import shared code). */
const GIT_HASH_PATTERN = /^[0-9a-f]{7,40}$/;

/** The single install/update run in progress; concurrent requests join it. */
let activeRun: ActiveRun | null = null;
/** Makes run ids unique within one SW instance; the id is only a log correlation key. */
let runCounter = 0;

/** A precache failure that knows whether trying the same file again can help. */
class PrecacheFileError extends Error {
  readonly retryable: boolean;
  readonly status?: number;
  constructor(message: string, retryable: boolean, status?: number) {
    super(message);
    this.retryable = retryable;
    this.status = status;
  }
}

/** Posts a message to every open page; best-effort so that it can never break an update. */
async function broadcastToClients(message: unknown): Promise<void> {
  try {
    const clients = await (self as unknown as ServiceWorkerGlobalScope).clients.matchAll({
      includeUncontrolled: true,
      type: 'window'
    });
    for (const client of clients) {
      client.postMessage(message);
    }
  } catch {
    // Best-effort only.
  }
}

/** Files progress of one run. */
function snapshotRun(run: ActiveRun): UpdateRunProgress {
  return { runId: run.runId, type: run.type, filesTotal: run.filesTotal, filesDone: run.filesDone };
}

/** Files progress of the running run, or `null` when none is in progress. */
function getRunProgress(): UpdateRunProgress | null {
  return activeRun && snapshotRun(activeRun);
}

/**
 * Creates the logger of one install/update run: writes `[UPDATE <runId>]` lines to
 * the SW console and relays each entry to the pages (see `UpdateService`).
 * The run id is local to the SW (it cannot import shared helpers at runtime).
 */
function createUpdateLogger(): UpdateLogger {
  const runId = `${Date.now().toString(36)}-${(++runCounter).toString(36)}`;
  const startedAt = Date.now();
  const emit = (level: UpdateLogLevel, step: string, details?: Record<string, unknown>) => {
    const entry: UpdateLogEntry = { runId, level, step, elapsedMs: Date.now() - startedAt, details };
    const line = `[UPDATE ${runId}] ${step} +${entry.elapsedMs}ms`;
    if (level === 'info') {
      console.log(line, details ?? '');
    } else {
      console[level](line, details ?? '');
    }
    const logMessage: UpdateLogMessage = { message: 'log', entry };
    void broadcastToClients(logMessage);
  };
  return {
    runId,
    info: (step, details) => emit('info', step, details),
    warn: (step, details) => emit('warn', step, details),
    error: (step, details) => emit('error', step, details)
  };
}

/**
 * Returns a callback to call once per cached file; logs `progress` every `PROGRESS_STEP_PERCENT`
 * and sends the pages a `progress` message each time the whole percentage changes.
 */
function createProgressTracker(total: number, log: UpdateLogger): (fileBytes: number) => void {
  let completed = 0;
  let bytes = 0;
  let nextPercent = PROGRESS_STEP_PERCENT;
  let lastBroadcastPercent = -1;
  const publish = () => {
    if (activeRun?.runId !== log.runId) {
      return;
    }
    activeRun.filesTotal = total;
    activeRun.filesDone = completed;
    const percent = Math.floor((completed * 100) / total);
    if (percent !== lastBroadcastPercent) {
      lastBroadcastPercent = percent;
      const progressMessage: UpdateProgressMessage = { message: 'progress', run: getRunProgress() };
      void broadcastToClients(progressMessage);
    }
  };
  publish();
  return (fileBytes) => {
    completed++;
    bytes += fileBytes;
    publish();
    const percent = Math.floor((completed * 100) / total);
    if (percent < nextPercent) {
      return;
    }
    nextPercent = (Math.floor(percent / PROGRESS_STEP_PERCENT) + 1) * PROGRESS_STEP_PERCENT;
    log.info('progress', { percent, files: completed, total, bytes });
  };
}

/**
 * Fetch with an AbortController timeout.
 * Aborts the request after `timeoutMs` milliseconds so the SW can fall back to cache faster.
 */
function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = NAVIGATE_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * Fetches and parses the latest asset manifest (`assets_list.json`). Headers and body are bounded
 * by `NAVIGATE_TIMEOUT_MS`: a hanging manifest would otherwise freeze the run at 0% while the SW
 * still answers keepalives. A redirect (expired OIDC session) is reported, never followed.
 * Network errors and 5xx are retried (`MAX_MANIFEST_ATTEMPTS`); auth errors, redirects and timeouts are not.
 */
async function fetchLatestManifest(log: UpdateLogger): Promise<AssetManifest> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchManifestOnce();
    } catch (error) {
      if (!(error instanceof PrecacheFileError) || !error.retryable || attempt >= MAX_MANIFEST_ATTEMPTS) {
        throw error;
      }
      const delayMs = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      log.warn('manifest-retry', { error: error.message, status: error.status, attempt, delayMs });
      await sleep(delayMs, new AbortController().signal);
    }
  }
}

async function fetchManifestOnce(): Promise<AssetManifest> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NAVIGATE_TIMEOUT_MS);
  try {
    const response = await fetch('/assets_list.json', {
      cache: 'no-store',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'cache-control': 'no-cache',
        pragma: 'no-cache'
      }
    });
    if (isRedirectResponse(response) || response.status === 401 || response.status === 403) {
      throw new Error(`Manifest fetch failed: authentication required (HTTP ${response.status})`);
    }
    if (!response.ok) {
      const message = `Manifest fetch failed with status ${response.status}`;
      throw response.status >= 500 ? new PrecacheFileError(message, true, response.status) : new Error(message);
    }
    return (await response.json()) as AssetManifest;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Manifest fetch timed out after ${NAVIGATE_TIMEOUT_MS / 1000}s`);
    }
    if (error instanceof TypeError) {
      throw new PrecacheFileError(error.message, true);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Returns true when a response is a redirect that the browser must be allowed
 * to follow (e.g. Apache's 302 to the AuthProvider OIDC login). Navigation requests
 * are fetched with `redirect: 'manual'`, so a redirect surfaces here as an
 * `opaqueredirect` response (status 0). Such responses MUST be passed through
 * untouched so the browser performs the navigation instead of the SW
 * swallowing it and serving the cached shell.
 */
function isRedirectResponse(response: Response): boolean {
  return response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400);
}

/**
 * True for a raw 401/403 straight from Apache/mod_auth_openidc (not converted
 * to a redirect), which must never be shown to the user as-is.
 */
function isAuthErrorResponse(response: Response | undefined): response is Response {
  return !!response && (response.status === 401 || response.status === 403);
}

/** Resolves after `ms`, or as soon as `signal` aborts. */
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });
}

/** Re-exposes the body so `onChunk` runs for every chunk read by `cache.put()`. */
function watchBody(response: Response, onChunk: () => void): Response {
  if (!response.body) {
    return response;
  }
  const reader = response.body.getReader();
  const body = new ReadableStream<Uint8Array>({
    async pull(streamController) {
      const { done, value } = await reader.read();
      onChunk();
      if (done) {
        streamController.close();
      } else {
        streamController.enqueue(value);
      }
    },
    cancel: (reason) => reader.cancel(reason)
  });
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
}

/**
 * One attempt to download `assetPath` and write it to `cache`. Fails when the
 * server stays silent for `FILE_STALL_TIMEOUT_MS` (headers or body), which also
 * covers a connection that stalls while the content is being read.
 * @returns The approximate size in bytes (`content-length` is absent for chunked responses).
 */
async function fetchAndStoreFile(cache: Cache, assetPath: string, parentSignal: AbortSignal): Promise<number> {
  const attemptController = new AbortController();
  let timedOut = false;
  let stallTimer: ReturnType<typeof setTimeout> | undefined;
  const armStallTimer = () => {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      timedOut = true;
      attemptController.abort();
    }, FILE_STALL_TIMEOUT_MS);
  };
  const onParentAbort = () => attemptController.abort();
  parentSignal.addEventListener('abort', onParentAbort, { once: true });
  armStallTimer();
  try {
    // `manual`: an expired OIDC session answers with a redirect to the login page, which must
    // not be followed (its HTML body would be cached as the asset).
    const response = await fetch(assetPath, {
      cache: 'no-store',
      redirect: 'manual',
      signal: attemptController.signal
    });
    armStallTimer();
    if (isRedirectResponse(response)) {
      throw new PrecacheFileError(
        `Precache failed for ${assetPath}: authentication required (redirected to login)`,
        false,
        response.status
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new PrecacheFileError(
        `Precache failed for ${assetPath}: HTTP ${response.status} (authentication required)`,
        false,
        response.status
      );
    }
    if (!response.ok) {
      throw new PrecacheFileError(
        `Precache failed for ${assetPath}: HTTP ${response.status}`,
        response.status >= 500,
        response.status
      );
    }
    if (parentSignal.aborted) {
      // Another file failed while this fetch was in flight — skip the write.
      throw new DOMException('Precache aborted', 'AbortError');
    }
    await cache.put(assetPath, watchBody(response, armStallTimer));
    return Number(response.headers?.get('content-length')) || 0;
  } catch (error) {
    if (timedOut) {
      throw new PrecacheFileError(
        `Precache timed out for ${assetPath}: no data received for ${FILE_STALL_TIMEOUT_MS / 1000}s`,
        false
      );
    }
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      throw new PrecacheFileError(`Precache failed for ${assetPath}: storage quota exceeded`, false);
    }
    throw error;
  } finally {
    clearTimeout(stallTimer);
    parentSignal.removeEventListener('abort', onParentAbort);
  }
}

/**
 * Caches one manifest file, retrying network errors and 5xx with an increasing
 * delay. Auth errors, other 4xx and stalls are final. A final failure aborts
 * `controller` so the other files stop too.
 */
async function cacheOneFile(
  cache: Cache,
  file: string,
  cachedPaths: Set<string>,
  controller: AbortController,
  log: UpdateLogger,
  recordProgress: (fileBytes: number) => void
): Promise<void> {
  // Validated inline, in the same function that performs the fetch below:
  // `assets_list.json` is untrusted network data, so a poisoned/compromised
  // response must not be able to make the SW request/cache a cross-origin
  // resource (client-side request forgery). `assetPath` — never the raw
  // `file` argument — is what is passed to `fetch()`/`cache.put()`.
  let assetPath = '';
  if (file.startsWith('/') && !file.startsWith('//') && !file.includes('\\')) {
    try {
      const url = new URL(file, self.location.origin);
      if (url.origin === self.location.origin) {
        assetPath = url.pathname + url.search;
      }
    } catch {
      assetPath = '';
    }
  }
  if (!assetPath) {
    controller.abort();
    log.error('file-rejected', { file });
    throw new Error(`Precache rejected for ${file}: invalid or cross-origin asset path`);
  }
  if (cachedPaths.has(assetPath)) {
    recordProgress(0);
    return;
  }

  const fileStartedAt = Date.now();
  for (let attempt = 1; ; attempt++) {
    try {
      recordProgress(await fetchAndStoreFile(cache, assetPath, controller.signal));
      return;
    } catch (error) {
      if (controller.signal.aborted) {
        // Aborted because another file already failed; that failure is what fails the precache.
        return;
      }
      const retryable = error instanceof PrecacheFileError ? error.retryable : true;
      const details = {
        path: assetPath,
        status: error instanceof PrecacheFileError ? error.status : undefined,
        error: error instanceof Error ? error.message : String(error),
        attempt,
        durationMs: Date.now() - fileStartedAt
      };
      if (!retryable || attempt >= MAX_FILE_ATTEMPTS) {
        controller.abort();
        log.error('file-failed', details);
        throw error;
      }
      const delayMs = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      log.warn('file-retry', { ...details, delayMs });
      await sleep(delayMs, controller.signal);
      if (controller.signal.aborted) {
        return;
      }
    }
  }
}

/**
 * Fetches and caches each file individually, `PRECACHE_CONCURRENCY` at a time. A
 * file that still fails after its retries (e.g. a 502 during a rolling redeploy)
 * aborts the whole install/update — missing or broken assets must never be
 * silently skipped. Compared to `Cache.addAll()` (all-or-nothing, throws a
 * generic `Failed to execute 'addAll' on 'Cache'` error), this identifies
 * exactly which file failed and why.
 *
 * Resume: when `cache` holds a partial earlier attempt (no `/app_version` marker, e.g.
 * the SW was killed mid-download), the files already written are not downloaded again.
 *
 * A shared `AbortController` cancels the other in-flight fetches as soon as
 * one file fails, and any fetch that resolves afterwards is skipped instead
 * of being written to `cache` — otherwise a rejection would still let those
 * in-flight operations complete in the background, leaving the cache
 * partially populated despite the reported failure.
 */
async function cacheFiles(cache: Cache, files: string[], log: UpdateLogger): Promise<void> {
  if (files.length === 0) {
    return;
  }
  const controller = new AbortController();
  const recordProgress = createProgressTracker(files.length, log);
  const cachedPaths = new Set<string>();
  if (!(await cache.match(APP_VERSION_CACHE_KEY))) {
    for (const request of await cache.keys()) {
      const url = new URL(request.url);
      cachedPaths.add(url.pathname + url.search);
    }
    if (cachedPaths.size > 0) {
      log.info('precache-resume', { alreadyCached: cachedPaths.size, total: files.length });
    }
  }

  const queue = [...files];
  const worker = async () => {
    for (let file = queue.shift(); file !== undefined && !controller.signal.aborted; file = queue.shift()) {
      await cacheOneFile(cache, file, cachedPaths, controller, log, recordProgress);
    }
  };
  await Promise.all(Array.from({ length: Math.min(PRECACHE_CONCURRENCY, files.length) }, worker));
}

/**
 * Performs a full application installation by fetching the asset
 * manifest, precaching it into its own immutable version cache, and
 * activating it. Notifies all controlled clients upon completion.
 * @returns The installed asset manifest.
 */
export async function installApp(log: UpdateLogger = createUpdateLogger()) {
  return withPrecacheLock(log, () => installLatestManifest(log));
}

/**
 * Runs `task` while holding `PRECACHE_LOCK_NAME`, so two SW instances never write into the same
 * cache nor delete a cache another one is filling. Runs unlocked where Web Locks are unavailable.
 */
async function withPrecacheLock<T>(log: UpdateLogger, task: () => Promise<T>): Promise<T> {
  const locks = (self as unknown as ServiceWorkerGlobalScope).navigator?.locks;
  if (!locks) {
    return task();
  }
  const waitStartedAt = Date.now();
  return locks.request(PRECACHE_LOCK_NAME, () => {
    log.info('lock-acquired', { waitedMs: Date.now() - waitStartedAt });
    return task();
  });
}

async function installLatestManifest(log: UpdateLogger): Promise<AssetManifest> {
  const manifestStartedAt = Date.now();
  log.info('manifest-fetch-start');
  let manifest: AssetManifest;
  try {
    manifest = await fetchLatestManifest(log);
  } catch (error) {
    log.error('manifest-failed', {
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - manifestStartedAt
    });
    throw error;
  }
  log.info('manifest-loaded', {
    version: manifest.app_version?.version,
    gitHash: manifest.app_version?.git_hash,
    buildTime: manifest.app_version?.build_datetime_utc,
    files: manifest.files?.length ?? 0,
    durationMs: Date.now() - manifestStartedAt
  });
  const { cacheName, alreadyActive } = await precacheVersion(manifest, log);
  if (!alreadyActive) {
    await activateVersion(cacheName, log);
  }
  return manifest;
}

/**
 * Updates the cached application assets to the latest manifest.
 * @remarks
 * Precaches the new version into its own immutable, uniquely named cache
 * (leaving the currently active version fully intact), then atomically
 * switches the active pointer. The previous version is retained for
 * rollback instead of being deleted, so a crash/interruption at any point
 * before activation never leaves the app without a complete offline
 * version. The IndexedDB database is preserved.
 * @returns The updated asset manifest.
 */
export async function updateApp(log: UpdateLogger = createUpdateLogger()) {
  // Same steps as a fresh install: the version caches are immutable and uniquely named, so
  // precaching the new manifest never touches the active one until `activateVersion` switches it.
  return installApp(log);
}

const NO_CACHE_INIT: RequestInit = {
  method: 'GET',
  headers: {
    pragma: 'no-cache',
    'cache-control': 'no-cache'
  }
};

/** Deterministic cache name for one version: rebuilding the same commit reuses the same cache. */
function cacheNameForVersion(appVersion: AppVersion): string {
  return `app-assets-v-${appVersion.git_hash}`;
}

/** Reads the activation pointer, or `null` if none has ever been written. */
async function readControlState(): Promise<CacheControlState | null> {
  const controlCache = await caches.open(CONTROL_CACHE_NAME);
  const response = await controlCache.match(CONTROL_KEY);
  if (!response) {
    return null;
  }
  try {
    return (await response.json()) as CacheControlState;
  } catch {
    return null;
  }
}

/** Overwrites the activation pointer in a single cache write. */
async function writeControlState(state: CacheControlState): Promise<void> {
  const controlCache = await caches.open(CONTROL_CACHE_NAME);
  await controlCache.put(
    CONTROL_KEY,
    new Response(JSON.stringify(state), { headers: { 'content-type': 'application/json' } })
  );
}

/** True when `cacheName` exists and holds the `/app_version` marker, written only once every file is stored. */
async function isCompleteVersionCache(cacheName: string): Promise<boolean> {
  if (!(await caches.has(cacheName))) {
    return false;
  }
  return (await (await caches.open(cacheName)).match(APP_VERSION_CACHE_KEY)) !== undefined;
}

/**
 * Downloads and fully precaches one application version into its own
 * immutable, uniquely named cache. Does NOT activate it — the caller
 * decides when (and if) to switch the active pointer via
 * `activateVersion()`. A manifest with no files, no valid `git_hash` or missing
 * `/index.html` is refused outright. A cache that is already complete is never
 * written again: it is reused as is (or reported already active). An incomplete
 * active cache is refused (a deleted one is reinstalled), and an incomplete previous
 * cache is rebuilt from scratch.
 * A partially precached version (a file failed) is deleted so it never lingers
 * half-written.
 */
async function precacheVersion(manifest: AssetManifest, log: UpdateLogger): Promise<PrecacheResult> {
  const files = [...new Set(manifest.files || [])];
  if (files.length === 0 || !files.includes('/index.html')) {
    log.error('manifest-invalid', { files: files.length });
    throw new Error(
      'Application manifest is empty or missing /index.html — refusing to precache an incomplete version'
    );
  }
  if (!GIT_HASH_PATTERN.test(manifest.app_version?.git_hash ?? '')) {
    log.error('manifest-invalid', { reason: 'invalid git_hash', gitHash: manifest.app_version?.git_hash });
    throw new Error('Application manifest has no valid git_hash — refusing to precache an unidentifiable version');
  }
  const cacheName = cacheNameForVersion(manifest.app_version);
  const control = await readControlState();
  const complete = await isCompleteVersionCache(cacheName);
  if (control?.active === cacheName) {
    if (complete) {
      // Typically installed by another tab or SW instance while this page still ran the old code.
      log.info('already-active', { cacheName });
      return { cacheName, alreadyActive: true };
    }
    if (await caches.has(cacheName)) {
      log.error('precache-refused-active', { cacheName });
      throw new Error(`Refusing to precache into the active cache ${cacheName}`);
    }
    log.warn('active-cache-missing-reinstalled', { cacheName });
  }
  if (complete) {
    log.info('precache-skipped-complete', { cacheName });
    return { cacheName, alreadyActive: false };
  }
  if (cacheName === control?.previous && (await caches.has(cacheName))) {
    // A previous version is always complete once activated: a missing marker means it is corrupted.
    log.warn('previous-incomplete-rebuilt', { cacheName });
    await caches.delete(cacheName);
  }
  const cache = await caches.open(cacheName);
  const startedAt = Date.now();
  log.info('precache-start', { cacheName, files: files.length });
  try {
    await cacheFiles(cache, files, log);
    await cache.put(
      APP_VERSION_CACHE_KEY,
      new Response(JSON.stringify(manifest.app_version), {
        headers: { 'content-type': 'application/json' }
      })
    );
  } catch (error) {
    await caches.delete(cacheName);
    log.error('precache-failed', { cacheName, durationMs: Date.now() - startedAt });
    throw error;
  }
  log.info('precache-done', { cacheName, files: files.length, durationMs: Date.now() - startedAt });
  return { cacheName, alreadyActive: false };
}

/**
 * Atomically switches the active application version to `cacheName`
 * (already fully precached by `precacheVersion()`). The previously active
 * version — or the pre-migration legacy cache on first activation — is kept
 * as `previous` for rollback; anything older is deleted best-effort.
 * Cleanup failures must never invalidate the activation itself, which has
 * already happened (the pointer write below) by the time cleanup runs.
 */
async function activateVersion(cacheName: string, log: UpdateLogger): Promise<void> {
  const previousState = await readControlState();
  let previousActive = previousState?.active ?? null;
  if (!previousActive && (await caches.has(LEGACY_CACHE_NAME))) {
    previousActive = LEGACY_CACHE_NAME;
  }
  log.info('activate-start', { cacheName, previous: previousActive });
  if (previousActive === cacheName) {
    log.warn('activate-same-cache', { cacheName });
  }

  await writeControlState({ active: cacheName, previous: previousActive });
  log.info('activated', { active: cacheName, previous: previousActive });

  try {
    const deleted: string[] = [];
    const allCacheNames = await caches.keys();
    for (const name of allCacheNames) {
      if (name === cacheName || name === previousActive || name === CONTROL_CACHE_NAME) {
        continue;
      }
      if (name.startsWith('app-assets')) {
        await caches.delete(name);
        deleted.push(name);
      }
    }
    log.info('cleanup', { deleted });
  } catch (error) {
    // Best-effort cleanup only — must never undo the activation above.
    log.warn('cleanup-failed', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Resolves the single complete application cache to read from: the active
 * version, falling back to the previous version, then to the pre-migration
 * legacy cache. Returns `null` when nothing has ever been installed yet
 * (first launch, before `installApp()` runs). Never mixes assets from two
 * different versions within one request.
 */
async function resolveActiveCache(): Promise<Cache | null> {
  const state = await readControlState();
  if (state?.active && (await caches.has(state.active))) {
    return caches.open(state.active);
  }
  if (state?.previous && (await caches.has(state.previous))) {
    return caches.open(state.previous);
  }
  if (await caches.has(LEGACY_CACHE_NAME)) {
    return caches.open(LEGACY_CACHE_NAME);
  }
  return null;
}

/**
 * Looks a hashed build asset up in the `previous` version cache. A page still running the old
 * version (another tab not yet reloaded) lazy-loads chunks that the new version no longer ships.
 * Only content-hashed names are taken: they are identical in every version that has them.
 */
async function matchHashedAssetInPreviousCache(request: Request): Promise<Response | undefined> {
  if (!HASHED_ASSET_PATTERN.test(new URL(request.url).pathname)) {
    return undefined;
  }
  const state = await readControlState();
  if (!state?.previous || !(await caches.has(state.previous))) {
    return undefined;
  }
  return (await caches.open(state.previous)).match(request);
}

/**
 * Returns true for URL paths that must be bypassed completely by the SW
 * (no cache read, no cache write). These are OIDC/Apache routes and the
 * version/asset manifests which the main thread must always receive fresh
 * from the server.
 *
 * `/version.json` MUST be bypassed even though it is listed in
 * `manifest.files` (and therefore precached): without this bypass it is
 * served stale from the SW cache-first branch until the user performs a
 * hard-reload (which bypasses the SW entirely), because it is only
 * refreshed when `updateApp()`/`installApp()` runs.
 *
 * `/docs` (and everything under it) MUST be bypassed too: it is a separate
 * static Sphinx site served by Apache from the same origin, not an Angular
 * route. Without this bypass, the generic `navigate` branch below always
 * discards its real response and serves the cached SPA shell instead
 * (`cachedShell` wins over the network body), so the Angular router then
 * renders its own "not found" page for a URL it doesn't know.
 *
 * `/data/` (catalog CSV/JSON) MUST be bypassed too: catalogs are excluded
 * from the asset manifest and the import pipeline verifies each download
 * independently with SHA-256 before promotion, so
 * branch below serves no purpose and its blanket `.catch(() => Response.error())`
 * silently hides the real failure (e.g. an OIDC-redirect network error, the
 * same class already documented above for navigation requests).
 */
function shouldBypassSW(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    return (
      path.startsWith('/auth/') ||
      path === '/assets_list.json' ||
      path === '/version.json' ||
      path === '/docs' ||
      path.startsWith('/docs/') ||
      path.startsWith('/data/')
    );
  } catch {
    return false;
  }
}

/**
 * Handle fetch events from the Service Worker.
 *
 * @remarks
 * Serves cached responses when available. Routes home page requests to
 * the cached index.html, proxies backend requests directly, and falls
 * back to network for uncached assets.
 *
 * @param event - The FetchEvent from the Service Worker
 */
export function handleFetch(event: FetchEvent): void {
  const url = event.request.url;
  const scope = (self as unknown as ServiceWorkerGlobalScope).registration?.scope;

  // Full bypass: /auth/* (OIDC), /assets_list.json, /version.json and /docs/*
  // must never be intercepted.
  // Plain return WITHOUT respondWith: the browser handles the request natively.
  // `respondWith(fetch(request))` is NOT equivalent — OIDC endpoints answer
  // with cross-origin redirects to the AuthProvider, and a SW-relayed fetch of a
  // redirected navigation rejects ("Failed to fetch"), blanking the page
  // (incident 2026-08-10, evening: /auth/relogin navigation died in the SW).
  if (shouldBypassSW(url)) {
    return;
  }

  if (url === scope || event.request.mode === 'navigate') {
    // Navigations (home + SPA deep links): the network is queried FIRST but
    // only so Apache can redirect when the OIDC session expires — its 200
    // body is NEVER served nor cached when an installed shell exists.
    // Serving/caching the fresh index.html here would silently switch the
    // app to a newly deployed version, bypassing the user-confirmed update
    // flow: the shell must only change through installApp()/updateApp().
    event.respondWith(
      (async () => {
        const cache = await resolveActiveCache();
        const indexUrl = scope + 'index.html';
        const cachedShell = cache ? await cache.match(indexUrl) : undefined;
        try {
          const networkResponse = await fetchWithTimeout(
            event.request.clone(),
            {
              redirect: 'manual',
              cache: 'no-store'
            },
            NAVIGATE_TIMEOUT_MS
          );
          // Preserve Apache/AuthProvider redirects (OIDC login flow): let the browser follow.
          if (networkResponse && isRedirectResponse(networkResponse)) {
            return networkResponse;
          }
          // Session is valid (200) or server errored (401/403/5xx): always
          // serve the INSTALLED shell so the running version never changes
          // without user confirmation.
          if (cachedShell) {
            return cachedShell;
          }
          // No installed shell yet (first launch before install): serve the
          // network copy WITHOUT caching it — installApp() owns the cache.
          if (networkResponse?.ok) {
            return networkResponse;
          }
          // No cached shell (e.g. right after clearing site data): force reauth
          // via /auth/relogin instead of leaking Apache's raw 401/403 body.
          if (isAuthErrorResponse(networkResponse)) {
            return Response.redirect(scope + 'auth/relogin', 302);
          }
          return networkResponse ?? Response.error();
        } catch {
          return cachedShell ?? Response.error();
        }
      })()
    );
  } else if (url.includes('celesteback')) {
    // redirect to the backend
    event.respondWith(fetch(event.request.clone()));
  } else {
    // All other requests (including precached js/css/html assets): CACHE-FIRST.
    // Code assets must always come from the installed cache so the app never
    // mixes bundles from two deployed versions nor upgrades silently; the
    // network is only a fallback for genuinely uncached resources.
    event.respondWith(
      (async () => {
        // Resolved to a single version cache (never the global caches.match()
        // search across every cache name) so a stale `previous`/legacy cache
        // can never leak an asset from a different version into this response.
        const cache = await resolveActiveCache();
        const response = cache ? await cache.match(event.request) : undefined;
        if (response) {
          return response;
        }
        const previousVersionResponse = await matchHashedAssetInPreviousCache(event.request);
        if (previousVersionResponse) {
          return previousVersionResponse;
        }
        const fetchRequest = event.request.clone();
        // Bounded: an unbounded fetch here can hang behind an OIDC refresh
        // pile-up on the server (headers-only timeout; body streaming of
        // large files is unaffected once headers arrive).
        return fetchWithTimeout(fetchRequest, NO_CACHE_INIT, NAVIGATE_TIMEOUT_MS).catch(() => {
          return Response.error();
        });
      })()
    );
  }
}

(self as unknown as ServiceWorkerGlobalScope).addEventListener('fetch', handleFetch);

(self as unknown as ServiceWorkerGlobalScope).addEventListener('install', () => {
  void (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
});

/**
 * Starts the install/update run. Only one run executes at a time: callers must
 * check `activeRun` first and join it instead of starting a second download.
 */
function startRun(type: UpdateRunType): ActiveRun {
  const log = createUpdateLogger();
  log.info('request-received', { type });
  const promise = (async () => {
    try {
      const manifest = await (type === 'update' ? updateApp(log) : installApp(log));
      log.info('done', { type });
      if (type === 'update') {
        // Awaited while the run is still active: a later `keepalive` reply (`run: null`) can then never overtake it.
        await broadcastToClients(completionMessage(type, manifest));
      }
      return manifest;
    } catch (e: unknown) {
      log.error('failed', { type, error: e instanceof Error ? e.message : String(e) });
      throw e;
    } finally {
      if (activeRun?.runId === log.runId) {
        activeRun = null;
      }
    }
  })();
  activeRun = { runId: log.runId, log, type, startedAt: Date.now(), filesTotal: 0, filesDone: 0, promise };
  return activeRun;
}

function completionMessage(type: UpdateRunType, manifest: AssetManifest) {
  return {
    message: `${type}_complete`,
    latest_version: manifest.app_version,
    data_hashes: manifest.data_hashes || {}
  };
}

/**
 * Runs (or joins) the install/update. `update_complete` is broadcast to every page by `startRun`
 * (other tabs must reload too); `install_complete` and failures go to the requesting pages only.
 */
async function handleRunRequest(event: ExtendableMessageEvent, type: UpdateRunType): Promise<void> {
  const joinedRun = activeRun;
  joinedRun?.log.info('request-joined', { type });
  const run = joinedRun ?? startRun(type);
  try {
    const manifest = await run.promise;
    if (run.type === 'install') {
      event.source?.postMessage(completionMessage(run.type, manifest));
    }
  } catch (e: unknown) {
    event.source?.postMessage({ message: 'error', error: e instanceof Error ? e.message : String(e) });
  }
}

/** Answers a `status` request with the running update, the activation pointer and the cache names. */
async function handleStatusRequest(event: ExtendableMessageEvent): Promise<void> {
  const status: ServiceWorkerStatus = {
    run: activeRun && { ...snapshotRun(activeRun), elapsedMs: Date.now() - activeRun.startedAt },
    control: await readControlState(),
    caches: await caches.keys()
  };
  const statusMessage: ServiceWorkerStatusMessage = { message: 'status', status };
  event.source?.postMessage(statusMessage);
}

/**
 * Handle messages sent to the Service Worker.
 *
 * @remarks
 * - 'update' / 'install': delegates to `updateApp` / `installApp` and posts the result back
 *   to the message source. A request received while a run is executing joins it.
 * - 'keepalive': sent by the page during a run; answered with a `progress` message (`run: null` when
 *   no run is in progress) and extends the SW lifetime until the run ends.
 * - 'status': replies with the state of the running update and of the caches.
 *
 * Every handler is passed to `event.waitUntil()` so the browser does not stop the SW mid-download.
 *
 * @param event - The ExtendableMessageEvent containing the command
 */
export function handleMessage(event: ExtendableMessageEvent): Promise<void> {
  const type = event.data?.type;
  let task: Promise<void>;
  switch (type) {
    case 'update':
    case 'install':
      task = handleRunRequest(event, type);
      break;
    case 'status':
      task = handleStatusRequest(event);
      break;
    case 'keepalive': {
      const progressMessage: UpdateProgressMessage = { message: 'progress', run: getRunProgress() };
      event.source?.postMessage(progressMessage);
      task = activeRun ? activeRun.promise.then(noop, noop) : Promise.resolve();
      break;
    }
    default:
      console.warn(`SERVICE WORKER: Unknown message type: ${type}`);
      return Promise.resolve();
  }
  event.waitUntil(task);
  return task;
}

function noop(): void {
  // Intentionally empty: used to wait for a promise without caring about its outcome.
}

/**
 * Handle the activate event.
 *
 * V2 behaviour: only claim clients. No auto-install or auto-update.
 * The first-launch install is triggered by `UpdateService.checkForUpdateOnce()`
 * from the Angular `APP_INITIALIZER`.
 */
async function handleActivate() {
  await (self as unknown as ServiceWorkerGlobalScope).clients.claim();
}

(self as unknown as ServiceWorkerGlobalScope).addEventListener('activate', (event) => {
  event.waitUntil(
    handleActivate().catch((err) => {
      console.error('SERVICE WORKER: Activation failed', err);
    })
  );
});

(self as unknown as ServiceWorkerGlobalScope).addEventListener('message', handleMessage);
