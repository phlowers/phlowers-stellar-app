import { ExpirationPlugin } from 'workbox-expiration';
import { Route } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { evaluateBackgroundDownload, measureIfNeeded } from '@services/app-update/network-rule.helpers';
import { USER_DATA_STORAGE_RESERVE_BYTES } from '@services/app-update/storage-rule.constantes';
import { evaluateStorageForInstall } from '@services/app-update/storage-rule.helpers';
import {
  CATALOG_CACHE_MAX_ENTRIES,
  CATALOG_CACHE_NAME,
  CATALOG_PATH_PREFIX,
  CATALOG_VERSION_PARAM,
  PREFETCH_CATALOGS_MESSAGE_TYPE
} from './service-worker.constantes';
import { createSafeResponsePlugin } from './service-worker.helpers';
import type {
  CatalogPrefetchOutcome,
  InstallRefusalReason,
  PrefetchCatalogsDeps,
  PrefetchCatalogsMessage,
  PrefetchCatalogsResult
} from './service-worker.interfaces';

/** Same-origin `/data/<file>?v=<sha>`: catalog URLs without a version stay outside the service worker. */
export function isVersionedCatalogUrl(url: URL, origin: string): boolean {
  return (
    url.origin === origin &&
    url.pathname.startsWith(CATALOG_PATH_PREFIX) &&
    (url.searchParams.get(CATALOG_VERSION_PARAM) ?? '') !== ''
  );
}

/** Cache-first strategy for the immutable versioned catalog URLs; redirected or non-OK responses are never cached. */
export function createCatalogStrategy(): CacheFirst {
  return new CacheFirst({
    cacheName: CATALOG_CACHE_NAME,
    plugins: [createSafeResponsePlugin(), new ExpirationPlugin({ maxEntries: CATALOG_CACHE_MAX_ENTRIES })]
  });
}

export function createCatalogRoute(origin: string, strategy: CacheFirst): Route {
  return new Route(({ url }) => isVersionedCatalogUrl(url, origin), strategy, 'GET');
}

export function isPrefetchCatalogsMessage(data: unknown): data is PrefetchCatalogsMessage {
  const message = data as Partial<PrefetchCatalogsMessage> | null;
  return (
    typeof message === 'object' &&
    message !== null &&
    message.type === PREFETCH_CATALOGS_MESSAGE_TYPE &&
    Array.isArray(message.urls) &&
    message.urls.every((url) => typeof url === 'string')
  );
}

function refusal(reason: InstallRefusalReason): PrefetchCatalogsResult {
  return { refused: reason, cached: [], failed: [] };
}

/** True when `extraBytes` more can be stored while the user data reserve stays free (allowed if the estimate is unavailable). */
async function hasReserveAfter(deps: PrefetchCatalogsDeps, extraBytes: number): Promise<boolean> {
  const estimate = await deps.storage?.estimate().catch(() => undefined);
  return evaluateStorageForInstall({
    missingBytes: extraBytes,
    usageBytes: estimate?.usage,
    quotaBytes: estimate?.quota,
    reserveBytes: USER_DATA_STORAGE_RESERVE_BYTES
  }).allowed;
}

/** A refusal when the network rule forbids a background download, null when the prefetch may go on. */
async function refuseOnNetwork(deps: PrefetchCatalogsDeps): Promise<PrefetchCatalogsResult | null> {
  if (deps.message.force) {
    return null;
  }
  const measuredMbps = await measureIfNeeded(
    deps.connection,
    deps.probe ?? (() => Promise.resolve(null)),
    undefined,
    (message) => deps.logger.info(message)
  );
  const network = evaluateBackgroundDownload(deps.connection, undefined, measuredMbps);
  if (network.allowed) {
    return null;
  }
  deps.logger.info(`Catalog prefetch deferred (${network.reason})`);
  return refusal(network.reason as InstallRefusalReason);
}

async function findCachedUrls(deps: PrefetchCatalogsDeps, urls: string[]): Promise<Set<string>> {
  const cached = new Set<string>();
  for (const url of urls) {
    const isCached = (await deps.cache?.has(url)) === true; //NOSONAR — a handful of catalogs
    if (isCached) {
      cached.add(url);
    }
  }
  return cached;
}

/** Downloads one catalog through the strategy and tells whether a usable response was fully received and stored. */
async function downloadCatalog(deps: PrefetchCatalogsDeps, url: string): Promise<boolean> {
  const request = new Request(url, { redirect: 'error', credentials: 'same-origin' });
  const [responsePromise, done] = deps.strategy.handleAll({ request, event: deps.event });
  // Wait for the body and the cache write too, so downloads never overlap and `cached` means stored.
  const [response, completion] = await Promise.allSettled([responsePromise, done]); //NOSONAR — one download at a time
  return (
    response.status === 'fulfilled' &&
    completion.status === 'fulfilled' &&
    response.value.ok &&
    !response.value.redirected
  );
}

/** Prefetches one catalog while keeping the user data reserve free (a catalog that was already cached costs nothing). */
async function prefetchCatalog(
  deps: PrefetchCatalogsDeps,
  url: string,
  alreadyCached: boolean,
  sizeBytes: number
): Promise<CatalogPrefetchOutcome> {
  if (!alreadyCached && !(await hasReserveAfter(deps, sizeBytes))) {
    deps.logger.warn('Catalog prefetch stopped (storage-insufficient)');
    return 'stopped';
  }
  try {
    if (!(await downloadCatalog(deps, url))) {
      return 'failed';
    }
    if (!alreadyCached && !(await hasReserveAfter(deps, 0))) {
      await deps.cache?.delete(url);
      deps.logger.warn('Catalog prefetch stopped: download exceeded the user data reserve');
      return 'stopped';
    }
    return 'cached';
  } catch {
    return 'failed';
  }
}

/**
 * Downloads the requested catalog versions one at a time through the catalog strategy (already cached URLs are
 * served from the cache without any request).
 *
 * @remarks
 * Only same-origin versioned catalog URLs are accepted. The user data reserve must stay free: the size of the
 * uncached catalogs (when announced by the page) is checked up front, the estimate is checked again before every
 * download, and a download that eats into the reserve is evicted from the cache and stops the prefetch.
 */
export async function prefetchCatalogs(deps: PrefetchCatalogsDeps): Promise<PrefetchCatalogsResult> {
  const urls = [
    ...new Set(
      deps.message.urls
        .map((url) => new URL(url, deps.origin))
        .filter((url) => isVersionedCatalogUrl(url, deps.origin))
        .map((url) => url.href)
    )
  ];

  const networkRefusal = await refuseOnNetwork(deps);
  if (networkRefusal) {
    return networkRefusal;
  }
  const sizeOf = (url: string) => deps.message.sizes?.[url] ?? 0;
  const cached = await findCachedUrls(deps, urls);
  const missingBytes = urls.filter((url) => !cached.has(url)).reduce((total, url) => total + sizeOf(url), 0);
  if (!(await hasReserveAfter(deps, missingBytes))) {
    deps.logger.warn('Catalog prefetch refused (storage-insufficient)');
    return refusal('storage-insufficient');
  }

  const result: PrefetchCatalogsResult = { refused: null, cached: [], failed: [] };
  for (const [index, url] of urls.entries()) {
    const outcome = await prefetchCatalog(deps, url, cached.has(url), sizeOf(url)); //NOSONAR — one download at a time
    if (outcome === 'stopped') {
      result.failed.push(...urls.slice(index));
      break;
    }
    result[outcome].push(url);
  }
  if (result.failed.length > 0) {
    deps.logger.warn(`Catalog prefetch failed for ${result.failed.join(', ')}`);
  }
  return result;
}
