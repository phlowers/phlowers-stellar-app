/**
 * Minimum estimated downlink (Mbit/s, `navigator.connection.downlink`) required to download
 * application or catalog updates in the background.
 *
 * @remarks
 * Chrome/Edge cap `downlink` at 10 Mbit/s: keep this value at or below 10. To change it, edit this
 * constant only: the service worker and the page share it (both bundles are rebuilt by `npm run build`).
 */
export const BACKGROUND_DOWNLOAD_MIN_DOWNLINK_MBPS = 5;
