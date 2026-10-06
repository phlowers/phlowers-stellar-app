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
