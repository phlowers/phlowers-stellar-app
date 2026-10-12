export interface StorageForInstallInput {
  /** Total size of the files still missing from the cache (the delta to download). */
  missingBytes: number;
  /** `navigator.storage.estimate().usage`, undefined when unavailable. */
  usageBytes: number | undefined;
  /** `navigator.storage.estimate().quota`, undefined when unavailable. */
  quotaBytes: number | undefined;
  reserveBytes: number;
}

export type StorageDecisionReason = 'allowed' | 'api-unavailable' | 'storage-insufficient';

export interface StorageDecision {
  allowed: boolean;
  reason: StorageDecisionReason;
  /** Bytes needed (missing files + reserve). */
  requiredBytes: number;
  /** Bytes currently free, or null when unknown. */
  freeBytes: number | null;
}

/** Precache manifest entry as injected by the build (`sizeBytes` is added by the build: workbox-build strips `size`). */
export interface SizedManifestEntry {
  url: string;
  revision: string | null;
  integrity?: string;
  sizeBytes?: number;
}
