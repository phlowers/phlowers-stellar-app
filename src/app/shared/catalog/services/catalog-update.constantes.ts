import { InjectionToken } from '@angular/core';

/** Catalog hashes of the deployed version (written by create_assets_list_for_service_worker.py). */
export const CATALOG_MANIFEST_URL = '/catalog-manifest.json';
export const CATALOG_MANIFEST_TIMEOUT_MS = 10_000;

/** Web Lock serializing catalog imports across windows (exclusive, waited for). */
export const CATALOG_IMPORT_LOCK = 'stellar-catalog-import';
/**
 * Web Lock held in shared mode by every window that works with the catalogs, for its whole lifetime.
 * Replacing a live catalog version requires it exclusively, so it is only granted when no window is working.
 */
export const CATALOG_WORKING_SESSION_LOCK = 'stellar-catalog-working-session';

/** Web Locks entry point (undefined where the API is missing); injectable so tests can simulate several windows. */
export const CATALOG_LOCK_MANAGER = new InjectionToken<LockManager | undefined>('CATALOG_LOCK_MANAGER', {
  providedIn: 'root',
  factory: () => globalThis.navigator?.locks
});
