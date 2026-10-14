import { ExpirationPlugin } from 'workbox-expiration';
import { Route } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { evaluateBackgroundDownload } from '@services/app-update/network-rule.helpers';
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

/**
 * Downloads the requested catalog versions one at a time through the catalog strategy (already cached URLs are
 * served from the cache without any request).
 *
 * @remarks
 * Only same-origin versioned catalog URLs are accepted. The storage rule keeps the user data reserve free
 * (catalog sizes are unknown before download).
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
    const network = evaluateBackgroundDownload(deps.connection);
    if (!network.allowed) {
      deps.logger.info(`Catalog prefetch deferred (${network.reason})`);
      return refusal(network.reason as InstallRefusalReason);
    }
  }
  const estimate = await deps.storage?.estimate().catch(() => undefined);
  const storage = evaluateStorageForInstall({
    missingBytes: 0,
    usageBytes: estimate?.usage,
    quotaBytes: estimate?.quota,
    reserveBytes: USER_DATA_STORAGE_RESERVE_BYTES
  });
  if (!storage.allowed) {
    deps.logger.warn('Catalog prefetch refused (storage-insufficient)');
    return refusal('storage-insufficient');
  }

  const result: PrefetchCatalogsResult = { refused: null, cached: [], failed: [] };
  for (const url of urls) {
    try {
      const request = new Request(url, { redirect: 'error', credentials: 'same-origin' });
      const response = await deps.strategy.handle({ request, event: deps.event }); //NOSONAR — one download at a time
      (response.ok && !response.redirected ? result.cached : result.failed).push(url);
    } catch {
      result.failed.push(url);
    }
  }
  if (result.failed.length > 0) {
    deps.logger.warn(`Catalog prefetch failed for ${result.failed.join(', ')}`);
  }
  return result;
}
