/** Imports one catalog; when `expectedHash` is given, the downloaded content is verified against it. */
export type CatalogImporter = (expectedHash?: string) => Promise<void>;

/** `dist/catalog-manifest.json`. */
export interface CatalogManifest {
  data_hashes: Record<string, string>;
}

export interface StaleCatalog {
  fileName: string;
  latestHash: string;
  /** Hash currently imported in IndexedDB, undefined when the catalog was never imported. */
  storedHash: string | undefined;
  importFn: CatalogImporter;
}
