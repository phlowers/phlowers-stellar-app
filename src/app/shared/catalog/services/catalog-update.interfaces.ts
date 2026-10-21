/** Imports one catalog; when `expectedHash` is given, the downloaded content is verified against it. */
export type CatalogImporter = (expectedHash?: string) => Promise<void>;

/** `dist/catalog-manifest.json`. */
export interface CatalogManifest {
  data_hashes: Record<string, string>;
  /** Size in bytes of each catalog file; absent in manifests built before the storage reserve check. */
  data_sizes?: Record<string, number>;
}

export interface StaleCatalog {
  fileName: string;
  latestHash: string;
  /** Hash currently imported in IndexedDB, undefined when the catalog was never imported. */
  storedHash: string | undefined;
  importFn: CatalogImporter;
}

/** Outcome of processing the stale catalogs of one start. */
export interface StaleCatalogsOutcome {
  failedCatalogs: string[];
  /** URLs of the catalogs to download in the background for the next start. */
  toPrefetch: string[];
}

/** Result of a task that needs every other window to be idle (see `CatalogLockService.runIfNoWorkingSession`). */
export type CatalogPromotion<T> = { granted: true; value: T } | { granted: false };
