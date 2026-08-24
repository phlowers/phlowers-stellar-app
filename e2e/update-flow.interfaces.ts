export interface Snapshot {
  /** `version` field of `/app_version` read from the currently active cache, or null if none. */
  appVersion: string | null;
  /** Name of the versioned cache currently marked `active` in the control cache, or null. */
  activeCacheName: string | null;
  /** Name of the versioned cache currently marked `previous` (rollback target), or null. */
  previousCacheName: string | null;
  /** Names of every `app-assets-v-*` cache present in Cache Storage. */
  versionedCacheNames: string[];
  hasAssetV1: boolean;
  hasAssetV2: boolean;
  hasAssetV3: boolean;
  cableHash: string | null;
  cableName: string | null;
}
