/**
 * Free space (bytes) always kept for user data (studies, catalogs in IndexedDB) when deciding whether
 * an update download may start: the storage quota is shared between Cache Storage and IndexedDB.
 *
 * @remarks
 * To change it, edit this constant only: the service worker and the page share it.
 */
export const USER_DATA_STORAGE_RESERVE_BYTES = 100 * 1024 * 1024;
