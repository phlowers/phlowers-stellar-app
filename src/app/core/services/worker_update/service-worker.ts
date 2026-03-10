const CACHE_NAME = 'app-assets';

interface AppVersion {
  git_hash: string;
  build_datetime_utc: string;
  version: string;
}

interface AssetManifest {
  app_version: AppVersion;
  files: string[];
  data_hashes?: Record<string, string>;
}

/**
 * Fetches the latest asset manifest (`assets_list.json`) from the server.
 * @returns A `Response` promise for the manifest file.
 */
function fetchLatestManifest() {
  return fetch('/assets_list.json', {
    cache: 'no-store',
    headers: {
      'cache-control': 'no-cache',
      pragma: 'no-cache'
    }
  });
}

const serviceWorkerLogPrefix = 'SERVICE WORKER: ';

function log(message: string, ...args: any[]) {
  console.log(serviceWorkerLogPrefix + message, ...args);
}

function areVersionsEqual(first: AppVersion | null, second: AppVersion | null): boolean {
  if (!first || !second) {
    return false;
  }
  return (
    first.git_hash === second.git_hash &&
    first.build_datetime_utc === second.build_datetime_utc &&
    first.version === second.version
  );
}

async function getCachedAppVersion(): Promise<AppVersion | null> {
  const cache = await caches.open(CACHE_NAME);
  const cachedVersionResponse = await cache.match('/app_version');
  if (!cachedVersionResponse) {
    return null;
  }
  return cachedVersionResponse.json();
}

async function postMessageToAllClients(message: string, payload: Record<string, unknown> = {}) {
  const clients = await (self as unknown as ServiceWorkerGlobalScope).clients.matchAll({
    includeUncontrolled: true,
    type: 'window'
  });
  for (const client of clients) {
    client.postMessage({ message, ...payload });
  }
}

function shouldUseNetworkFirst(request: Request): boolean {
  if (request.mode === 'navigate') {
    return true;
  }
  const url = new URL(request.url);
  const path = url.pathname;
  return path === '/assets_list.json' || path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.css');
}

/**
 * Checks whether the application has been installed by looking
 * for an `app_version` entry in the cache.
 * @returns `true` if the app is installed.
 */
export async function checkIfAppInstalled() {
  const cache = await caches.open(CACHE_NAME);
  const appVersion = await cache.match('/app_version');
  if (appVersion) {
    return true;
  }
  return false;
}

/**
 * Performs a full application installation by fetching the asset
 * manifest, caching all listed files, and storing the build version.
 * Notifies all controlled clients upon completion.
 * @returns The installed application version.
 */
export async function installApp() {
  log('beginning app installation');
  const latestManifest = await fetchLatestManifest();
  const manifest: AssetManifest = await latestManifest.json();
  log('installing service worker with manifest', manifest);
  const filesToInstall = manifest.files || [];
  const buildVersion = manifest.app_version;
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(filesToInstall);
  await cache.put(
    '/app_version',
    new Response(JSON.stringify(buildVersion), {
      headers: {
        'content-type': 'application/json'
      }
    })
  );
  log('app installed');
  for (const client of await (self as unknown as ServiceWorkerGlobalScope).clients.matchAll({
    includeUncontrolled: true,
    type: 'window'
  })) {
    client.postMessage({
      message: 'install_complete',
      latest_version: buildVersion,
      current_version: buildVersion,
      data_hashes: manifest.data_hashes || {}
    });
  }
  return manifest;
}

/**
 * Updates the cached application assets to the latest manifest.
 * Skips re-downloading already-cached wheel files and removes
 * stale entries no longer present in the manifest.
 * @returns The updated application version.
 */
export async function updateApp() {
  log('update requested');
  const manifest: AssetManifest = await fetchLatestManifest().then((manifest) => manifest.json());
  log('updating service worker with manifest', manifest);
  const files = manifest.files || [];
  const cache = await caches.open(CACHE_NAME);
  for (const file of files) {
    // do not redownload wheels if already in cache
    if (file.startsWith('/pyodide') && file.endsWith('.whl')) {
      if (await cache.match(file)) {
        log('file already in cache, skipping', file);
      } else {
        log('file not in cache, adding', file);
        await cache.add(file);
      }
    } else {
      log('adding file', file);
      await cache.add(file);
    }
  }
  const cacheKeys = (await cache.keys()).map((key) => key.url.replace(self.location.origin, ''));
  const keysToDelete = cacheKeys.filter((key) => key !== '/app_version' && !files.includes(key));
  for (const key of keysToDelete) {
    log('deleting file', key);
    await cache.delete(key);
  }
  const appVersion = manifest.app_version;
  await cache.put(
    '/app_version',
    new Response(JSON.stringify(appVersion), {
      headers: {
        'content-type': 'application/json'
      }
    })
  );
  return manifest;
}

const noCacheHeaders = () => {
  const myHeaders = new Headers();
  myHeaders.append('pragma', 'no-cache');
  myHeaders.append('cache-control', 'no-cache');
  return {
    method: 'GET',
    headers: myHeaders
  };
};

/**
 * Handle fetch events from the Service Worker.
 *
 * @remarks
 * Serves cached responses when available. Routes home page requests to
 * the cached index.html, proxies backend requests directly, and falls
 * back to network for uncached assets.
 *
 * @param event - The FetchEvent from the Service Worker
 */
export async function handleFetch(event: FetchEvent) {
  const url = event.request.url;
  const scope = (self as unknown as ServiceWorkerGlobalScope).registration?.scope;
  if (url === scope) {
    // case for home page
    const newUrl = scope + 'index.html';
    event.respondWith(
      caches.match(newUrl).then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request.clone());
      })
    );
  } else if (url.includes('celesteback')) {
    // redirect to the backend
    event.respondWith(fetch(event.request.clone()));
  } else {
    // all other requests
    if (shouldUseNetworkFirst(event.request)) {
      event.respondWith(
        (async () => {
          const cache = await caches.open(CACHE_NAME);
          try {
            const networkResponse = await fetch(event.request.clone(), noCacheHeaders());
            if (networkResponse && networkResponse.ok) {
              await cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          } catch (error) {
            console.error('Network-first fetch failed, trying cache:', error);
            const cachedResponse = await cache.match(event.request);
            if (cachedResponse) {
              return cachedResponse;
            }
            return Response.error();
          }
        })()
      );
      return;
    }

    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        const fetchRequest = event.request.clone();
        return fetch(fetchRequest, noCacheHeaders()).catch((error) => {
          console.error('Fetch failed:', error);
          return Response.error();
        });
      })
    );
  }
}

(self as unknown as ServiceWorkerGlobalScope).addEventListener('fetch', handleFetch);

(self as unknown as ServiceWorkerGlobalScope).addEventListener('install', () => {
  log('installing service worker');
  (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
});

/**
 * Handle messages sent to the Service Worker.
 *
 * @remarks
 * Supports 'update' and 'install' message types. Delegates to
 * `updateApp` or `installApp` and posts the result
 * back to the message source.
 *
 * @param event - The ExtendableMessageEvent containing the command
 */
export async function handleMessage(event: ExtendableMessageEvent) {
  log('message in service worker', event);
  const type = event.data.type;
  let manifest: AssetManifest | null = null;
  try {
    switch (type) {
      case 'update':
        manifest = await updateApp();
        event.source?.postMessage({
          message: 'update_complete',
          latest_version: manifest.app_version,
          data_hashes: manifest.data_hashes || {}
        });
        break;
      case 'install':
        manifest = await installApp();
        event.source?.postMessage({
          message: 'install_complete',
          latest_version: manifest.app_version,
          data_hashes: manifest.data_hashes || {}
        });
        break;
      default:
        log('unknown message type', type);
    }
  } catch (e: any) {
    event.source?.postMessage({ message: 'error', error: e.message });
  }
}

(self as unknown as ServiceWorkerGlobalScope).addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      log('activating service worker');
      await (self as unknown as ServiceWorkerGlobalScope).clients.claim();
      const installed = await checkIfAppInstalled();
      if (installed) {
        log('app is installed');
        const cachedVersion = await getCachedAppVersion();
        const latestManifest: AssetManifest = await fetchLatestManifest().then((manifest) => manifest.json());
        if (!areVersionsEqual(cachedVersion, latestManifest.app_version)) {
          log('new app version detected during activate, updating cached assets');
          const updatedManifest = await updateApp();
          await postMessageToAllClients('update_complete', {
            latest_version: updatedManifest.app_version,
            data_hashes: updatedManifest.data_hashes || {}
          });
        } else {
          await postMessageToAllClients('worker_ready', {
            latest_version: latestManifest.app_version,
            current_version: cachedVersion,
            data_hashes: latestManifest.data_hashes || {}
          });
        }
      } else {
        log('app is not installed');
        const manifest = await installApp();
        await postMessageToAllClients('worker_ready', {
          latest_version: manifest.app_version,
          current_version: manifest.app_version,
          data_hashes: manifest.data_hashes || {}
        });
      }
    })()
  );
});

(self as unknown as ServiceWorkerGlobalScope).addEventListener('message', handleMessage);
