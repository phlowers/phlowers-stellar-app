/** App shell served for every navigation. */
export const SHELL_URL = '/index.html';

/** Caches of the previous update system (`app-assets`, `app-assets-v-*`, `app-assets-control`). */
export const LEGACY_CACHE_PREFIX = 'app-assets';

/** Navigations never served from the shell: the browser handles them natively (OIDC, docs, data, config). */
export const NAVIGATION_DENYLIST: readonly RegExp[] = [
  /^\/auth(\/|$)/,
  /^\/docs(\/|$)/,
  /^\/data\//,
  /^\/assets\/config\//,
  /^\/assets_list\.json$/,
  /^\/catalog-manifest\.json$/,
  /^\/version\.json$/
];

export {
  CATALOG_CACHE_NAME,
  PREFETCH_CATALOGS_MESSAGE_TYPE,
  SW_INSTALL_REFUSED_MESSAGE_TYPE,
  SW_LOG_MESSAGE_TYPE
} from '@services/app-update/sw-messages.constantes';

/** 6 catalogs x 2 versions (the active one and the one prefetched for the next start). */
export const CATALOG_CACHE_MAX_ENTRIES = 12;
export const CATALOG_PATH_PREFIX = '/data/';
export const CATALOG_VERSION_PARAM = 'v';
