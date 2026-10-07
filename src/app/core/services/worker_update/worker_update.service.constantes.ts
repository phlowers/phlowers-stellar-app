/** Prefix of every page-side update log line; `[UPDATE` also matches the SW-relayed `[UPDATE <runId>]` lines. */
export const UPDATE_PAGE_LOG_PREFIX = '[UPDATE page]';

/** Interval of the `keepalive` messages sent to the SW while an update runs (browsers stop an idle SW after ~30 s). */
export const UPDATE_KEEPALIVE_INTERVAL_MS = 10000;

/** `navigator.serviceWorker.ready` never settles when the registration failed; give up after this long. */
export const UPDATE_SW_READY_TIMEOUT_MS = 10000;

/**
 * The update is declared interrupted when the SW sends nothing (log, progress, answer) for this long.
 * Must stay above the SW per-file stall timeout (30 s) so the SW reports its own error first.
 */
export const UPDATE_WATCHDOG_TIMEOUT_MS = 45000;

/**
 * The update is declared interrupted when the SW keeps answering but no file is cached for this long.
 * Must stay above the worst case of one file in the SW: 4 attempts x 30 s stall + 7 s of retry delays.
 */
export const UPDATE_NO_PROGRESS_TIMEOUT_MS = 180000;

/** Commit SHA identifying an application version (mirrors the build scripts and the SW). */
export const GIT_HASH_PATTERN = /^[0-9a-f]{7,40}$/;
