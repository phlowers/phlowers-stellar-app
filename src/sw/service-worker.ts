import { PrecacheController, PrecacheRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import type { NetworkConnectionLike } from '@services/app-update/network-rule.interfaces';
import type { SizedManifestEntry } from '@services/app-update/storage-rule.interfaces';
import { SHELL_URL } from './service-worker.constantes';
import { createCatalogRoute, createCatalogStrategy, isPrefetchCatalogsMessage, prefetchCatalogs } from './catalogs';
import {
  createSafeResponsePlugin,
  createShellNavigationHandler,
  createShellNavigationRoute,
  createDownloadLogPlugin,
  createSwLogger,
  runActivation,
  runGuardedInstall,
  toPrecacheEntry
} from './service-worker.helpers';

// Never call skipWaiting(): a new version only activates once every window of the app is closed.
const sw = self as unknown as ServiceWorkerGlobalScope;
// Replaced at build time by workbox-build injectManifest (entries carry url, revision, integrity and sizeBytes).
const manifest: SizedManifestEntry[] = (self as unknown as { __WB_MANIFEST: SizedManifestEntry[] }).__WB_MANIFEST;

const logger = createSwLogger(sw.clients);
const connectionOf = (): NetworkConnectionLike | undefined =>
  (sw.navigator as WorkerNavigator & { connection?: NetworkConnectionLike }).connection;
const controller = new PrecacheController({ plugins: [createSafeResponsePlugin(), createDownloadLogPlugin(logger)] });
controller.addToCacheList(manifest.map(toPrecacheEntry));
const catalogStrategy = createCatalogStrategy();

sw.addEventListener('install', (event) => {
  event.waitUntil(
    runGuardedInstall({
      event,
      controller,
      entries: manifest,
      connection: connectionOf(),
      storage: sw.navigator.storage,
      caches: sw.caches,
      clients: sw.clients,
      logger
    })
  );
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(runActivation({ event, controller, caches: sw.caches, clients: sw.clients, logger }));
});

sw.addEventListener('message', (event) => {
  if (!isPrefetchCatalogsMessage(event.data)) {
    return;
  }
  const message = event.data;
  event.waitUntil(
    prefetchCatalogs({
      message,
      event,
      origin: sw.location.origin,
      strategy: catalogStrategy,
      connection: connectionOf(),
      storage: sw.navigator.storage,
      logger
    }).then((result) => event.ports[0]?.postMessage(result))
  );
});

registerRoute(createCatalogRoute(sw.location.origin, catalogStrategy));
registerRoute(new PrecacheRoute(controller));
registerRoute(
  createShellNavigationRoute(
    createShellNavigationHandler({
      matchShell: () => controller.matchPrecache(SHELL_URL),
      fetch: (request) => fetch(request),
      origin: sw.location.origin
    })
  )
);
