import type { AssetManifest } from './service-worker.interfaces';

const CACHE_NAME = 'app-assets';
const APP_VERSION_CACHE_KEY = '/app_version';
/** Timeout (ms) for network-first fetch before falling back to cache. */
const NETWORK_FIRST_TIMEOUT_MS = 3000;

/**
 * Fetch with an AbortController timeout.
 * Aborts the request after `timeoutMs` milliseconds so the SW can fall back to cache faster.
 */
function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = NETWORK_FIRST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
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

function shouldUseNetworkFirst(request: Request): boolean {
  if (request.mode === 'navigate') {
    return true;
  }
  const url = new URL(request.url);
  const path = url.pathname;
  // Note: /assets_list.json is handled by shouldBypassSW() before reaching this function.
  return path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.css');
}

/**
 * Performs a full application installation by fetching the asset
 * manifest, caching all listed files, and storing the build version.
 * Notifies all controlled clients upon completion.
 * @returns The installed asset manifest.
 */
export async function installApp() {
  console.log('SERVICE WORKER: Beginning app installation');
  const response = await fetchLatestManifest();
  if (!response.ok) {
    throw new Error(`Manifest fetch failed with status ${response.status}`);
  }
  const manifest: AssetManifest = await response.json();
  const filesToInstall = manifest.files || [];
  const buildVersion = manifest.app_version;
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(filesToInstall);
  await cache.put(
    APP_VERSION_CACHE_KEY,
    new Response(JSON.stringify(buildVersion), {
      headers: {
        'content-type': 'application/json'
      }
    })
  );
  console.log(`SERVICE WORKER: App installed (version ${buildVersion}, ${filesToInstall.length} files)`);
  return manifest;
}

/**
 * Updates the cached application assets to the latest manifest.
 * Performs a full cache reset: deletes the entire cache and re-downloads
 * all files (including Python wheels) to ensure a clean state.
 * The IndexedDB database is preserved.
 * @returns The updated asset manifest.
 */
export async function updateApp() {
  console.log('SERVICE WORKER: Update requested — performing full cache reset');
  const response = await fetchLatestManifest();
  if (!response.ok) {
    throw new Error(`Manifest fetch failed with status ${response.status}`);
  }
  const manifest: AssetManifest = await response.json();
  const files = manifest.files || [];

  // Full cache reset: delete and recreate.
  await caches.delete(CACHE_NAME);
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(files);

  const appVersion = manifest.app_version;
  await cache.put(
    APP_VERSION_CACHE_KEY,
    new Response(JSON.stringify(appVersion), {
      headers: {
        'content-type': 'application/json'
      }
    })
  );
  console.log(`SERVICE WORKER: Full cache reset complete (version ${appVersion}, ${files.length} files cached)`);
  return manifest;
}

const NO_CACHE_INIT: RequestInit = {
  method: 'GET',
  headers: {
    pragma: 'no-cache',
    'cache-control': 'no-cache'
  }
};

/**
 * Returns true for URL paths that must be bypassed completely by the SW
 * (no cache read, no cache write). These are OIDC/Apache routes and the
 * asset manifest which the main thread must always receive fresh from the server.
 */
function shouldBypassSW(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    return path.startsWith('/auth/') || path === '/assets_list.json';
  } catch {
    return false;
  }
}

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

  // Full bypass: /auth/* (OIDC) and /assets_list.json must never be intercepted.
  if (shouldBypassSW(url)) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (url === scope) {
    // Home page: network-first so Apache can redirect when OIDC session expires.
    // 3xx responses are passed through without caching.
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const indexUrl = scope + 'index.html';
        try {
          const networkResponse = await fetchWithTimeout(event.request.clone());
          if (networkResponse && networkResponse.ok) {
            await cache.put(indexUrl, networkResponse.clone());
            return networkResponse;
          }
          // 3xx or non-ok: return directly without caching (preserves Apache redirects).
          return networkResponse;
        } catch {
          const cached = await cache.match(indexUrl);
          return cached ?? Response.error();
        }
      })()
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
            const networkResponse = await fetchWithTimeout(event.request.clone(), NO_CACHE_INIT);
            // Only cache successful (2xx) responses — never cache 3xx redirects.
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
        return fetch(fetchRequest, NO_CACHE_INIT).catch((error) => {
          console.error('Fetch failed:', error);
          return Response.error();
        });
      })
    );
  }
}

(self as unknown as ServiceWorkerGlobalScope).addEventListener('fetch', handleFetch);

(self as unknown as ServiceWorkerGlobalScope).addEventListener('install', () => {
  console.log('SERVICE WORKER: Installing service worker');
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
        console.warn(`SERVICE WORKER: Unknown message type: ${type}`);
    }
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    event.source?.postMessage({ message: 'error', error: errorMessage });
  }
}

/**
 * Handle the activate event.
 *
 * V2 behaviour: only claim clients. No auto-install or auto-update.
 * The first-launch install is triggered by `UpdateService.checkForUpdateOnce()`
 * from the Angular `APP_INITIALIZER`.
 */
async function handleActivate() {
  console.log('SERVICE WORKER: Activating service worker');
  await (self as unknown as ServiceWorkerGlobalScope).clients.claim();
}

(self as unknown as ServiceWorkerGlobalScope).addEventListener('activate', (event) => {
  event.waitUntil(
    handleActivate().catch((err) => {
      console.error('SERVICE WORKER: Activation failed', err);
    })
  );
});

(self as unknown as ServiceWorkerGlobalScope).addEventListener('message', handleMessage);
