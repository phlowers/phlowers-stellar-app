export interface Snapshot {
  /** Version executed by the current document (stamped per scenario in the JS it loaded), or null. */
  appVersion: string | null;
  /** True when a cached shell (`/index.html`) exists in Cache Storage, i.e. the app can start offline. */
  offlineReady: boolean;
  cableHash: string | null;
  cableName: string | null;
}
