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

  if (!deps.message.force) {
    const measuredMbps = await measureIfNeeded(
      deps.connection,
      deps.probe ?? (() => Promise.resolve(null)),
      undefined,
      (message) => deps.logger.info(message)
    );
    const network = evaluateBackgroundDownload(deps.connection, undefined, measuredMbps);
    if (!network.allowed) {
      deps.logger.info(`Catalog prefetch deferred (${network.reason})`);
      return refusal(network.reason as InstallRefusalReason);
    }
  }
  const sizes = deps.message.sizes ?? {};
  const wasCached = new Map<string, boolean>();
  for (const url of urls) {
    wasCached.set(url, (await deps.cache?.has(url)) ?? false); //NOSONAR — a handful of catalogs
  }
  const missingBytes = urls.reduce((total, url) => total + (wasCached.get(url) ? 0 : (sizes[url] ?? 0)), 0);
  if (!(await hasReserveAfter(deps, missingBytes))) {
    deps.logger.warn('Catalog prefetch refused (storage-insufficient)');
    return refusal('storage-insufficient');
  }

  const result: PrefetchCatalogsResult = { refused: null, cached: [], failed: [] };
  for (const [index, url] of urls.entries()) {
    const alreadyCached = wasCached.get(url) === true;
    if (!alreadyCached && !(await hasReserveAfter(deps, sizes[url] ?? 0))) {
      deps.logger.warn('Catalog prefetch stopped (storage-insufficient)');
      result.failed.push(...urls.slice(index));
      break;
    }
    try {
      const request = new Request(url, { redirect: 'error', credentials: 'same-origin' });
      const response = await deps.strategy.handle({ request, event: deps.event }); //NOSONAR — one download at a time
      if (!response.ok || response.redirected) {
        result.failed.push(url);
        continue;
      }
      if (!alreadyCached && !(await hasReserveAfter(deps, 0))) {
        await deps.cache?.delete(url);
        deps.logger.warn('Catalog prefetch stopped: download exceeded the user data reserve');
        result.failed.push(...urls.slice(index));
        break;
      }
      result.cached.push(url);
    } catch {
      result.failed.push(url);
    }
  }
  if (result.failed.length > 0) {
    deps.logger.warn(`Catalog prefetch failed for ${result.failed.join(', ')}`);
  }
  return result;
}
