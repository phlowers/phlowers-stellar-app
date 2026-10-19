/**
 * Minimum estimated downlink (Mbit/s, `navigator.connection.downlink`) required to download
 * application or catalog updates in the background.
 *
 * @remarks
 * Chrome/Edge cap `downlink` at 10 Mbit/s: keep this value at or below 10. To change it, edit this
 * constant only: the service worker and the page share it (both bundles are rebuilt by `npm run build`).
 */
export const BACKGROUND_DOWNLOAD_MIN_DOWNLINK_MBPS = 5;

/**
 * Active throughput probe, used when the passive `navigator.connection.downlink` estimate is below the threshold.
 *
 * @remarks
 * `downlink` only reflects recent traffic (and ignores private-address connections), so it often under-estimates
 * an idle or intranet connection. The probe reads at most `THROUGHPUT_PROBE_MAX_BYTES` of a same-origin file.
 */
export const THROUGHPUT_PROBE_MAX_BYTES = 1024 * 1024;
export const THROUGHPUT_PROBE_TIMEOUT_MS = 4000;

/** Header set on the probe request so that a server (or the e2e simulation) can recognise it. */
export const THROUGHPUT_PROBE_HEADER = 'X-Throughput-Probe';

/** A measurement younger than this is reused by the admin diagnostics instead of downloading the probe again. */
export const THROUGHPUT_MEASUREMENT_REUSE_MS = 60 * 1000;
