import type { AssetManifest } from './service-worker.interfaces';

const CACHE_NAME = 'app-assets';
const APP_VERSION_CACHE_KEY = '/app_version';
/** Timeout (ms) for network-first fetch before falling back to cache. */
const NETWORK_FIRST_TIMEOUT_MS = 3000;
const NAVIGATE_TIMEOUT_MS = 13000;

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
  // Note: /assets_list.json and /version.json are handled by shouldBypassSW() before reaching this function.
  return path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.css');
}

/**
 * Returns true when a response is a redirect that the browser must be allowed
 * to follow (e.g. Apache's 302 to the AuthProvider OIDC login). Navigation requests
 * are fetched with `redirect: 'manual'`, so a redirect surfaces here as an
 * `opaqueredirect` response (status 0). Such responses MUST be passed through
 * untouched so the browser performs the navigation instead of the SW
 * swallowing it and serving the cached shell.
 */
function isRedirectResponse(response: Response): boolean {
  return response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400);
}

/**
 * True for a raw 401/403 straight from Apache/mod_auth_openidc (not converted
 * to a redirect), which must never be shown to the user as-is.
 */
function isAuthErrorResponse(response: Response | undefined): response is Response {
  return !!response && (response.status === 401 || response.status === 403);
}

/**
 * Fetches and caches each file individually. Any single failure (e.g. a 502
 * during a rolling redeploy) aborts the whole install/update — missing or
 * broken assets must never be silently skipped. Compared to `Cache.addAll()`
 * (all-or-nothing, throws a generic `Failed to execute 'addAll' on 'Cache'`
 * error), this identifies exactly which file failed and why.
 *
 * A shared `AbortController` cancels the other in-flight fetches as soon as
 * one file fails, and any fetch that resolves afterwards is skipped instead
 * of being written to `cache` — otherwise `Promise.all` rejecting early
 * would still let those in-flight operations complete in the background,
 * leaving the cache partially populated despite the reported failure.
 */
async function cacheFiles(cache: Cache, files: string[]): Promise<void> {
  if (files.length === 0) {
    return;
  }
  const controller = new AbortController();

  await Promise.all(
    files.map(async (file) => {
      // Validated inline, in the same function that performs the fetch below:
      // `assets_list.json` is untrusted network data, so a poisoned/compromised
      // response must not be able to make the SW request/cache a cross-origin
      // resource (client-side request forgery). `assetPath` — never the raw
      // `file` argument — is what is passed to `fetch()`/`cache.put()`.
      let assetPath = '';
      if (file.startsWith('/') && !file.startsWith('//') && !file.includes('\\')) {
        try {
          const url = new URL(file, self.location.origin);
          if (url.origin === self.location.origin) {
            assetPath = url.pathname + url.search;
          }
        } catch {
          assetPath = '';
        }
      }
      if (!assetPath) {
        controller.abort();
        throw new Error(`Precache rejected for ${file}: invalid or cross-origin asset path`);
      }
      let response: Response;
      try {
        response = await fetch(assetPath, { cache: 'no-store', signal: controller.signal });
      } catch (error) {
        if (controller.signal.aborted) {
          // Aborted because another file already failed; that failure is what fails the precache.
          return;
        }
        controller.abort();
        throw error;
      }
      if (!response.ok) {
        controller.abort();
        throw new Error(`Precache failed for ${assetPath}: HTTP ${response.status}`);
      }
      if (controller.signal.aborted) {
        // Another file failed while this fetch was in flight — skip the write.
        return;
      }
      await cache.put(assetPath, response);
    })
  );
}

/**
 * Performs a full application installation by fetching the asset
 * manifest, caching all listed files, and storing the build version.
 * Notifies all controlled clients upon completion.
 * @returns The installed asset manifest.
 */
export async function installApp() {
  const response = await fetchLatestManifest();
  if (!response.ok) {
    throw new Error(`Manifest fetch failed with status ${response.status}`);
  }
  const manifest: AssetManifest = await response.json();
  const filesToInstall = manifest.files || [];
  const buildVersion = manifest.app_version;
  const cache = await caches.open(CACHE_NAME);
  await cacheFiles(cache, filesToInstall);
  await cache.put(
    APP_VERSION_CACHE_KEY,
    new Response(JSON.stringify(buildVersion), {
      headers: {
        'content-type': 'application/json'
      }
    })
  );
  return manifest;
}

/**
 * Updates the cached application assets to the latest manifest.
 * Caches new assets into a temporary cache first, then atomically
 * swaps it with the old cache to avoid leaving the app with a
 * partial/empty cache if the download fails mid-way.
 * The IndexedDB database is preserved.
 * @returns The updated asset manifest.
 */
export async function updateApp() {
  const response = await fetchLatestManifest();
  if (!response.ok) {
    throw new Error(`Manifest fetch failed with status ${response.status}`);
  }
  const manifest: AssetManifest = await response.json();
  const files = manifest.files || [];

  const TEMP_CACHE_NAME = `${CACHE_NAME}-tmp`;

  // Cache into a temporary cache first so the old cache remains intact on failure.
  try {
    await caches.delete(TEMP_CACHE_NAME);
    const tempCache = await caches.open(TEMP_CACHE_NAME);
    await cacheFiles(tempCache, files);

    const appVersion = manifest.app_version;
    await tempCache.put(
      APP_VERSION_CACHE_KEY,
      new Response(JSON.stringify(appVersion), {
        headers: {
          'content-type': 'application/json'
        }
      })
    );

    // Swap: delete old cache and rename temp cache.
    await caches.delete(CACHE_NAME);
    const finalCache = await caches.open(CACHE_NAME);
    const tempKeys = await tempCache.keys();
    for (const request of tempKeys) {
      const cached = await tempCache.match(request);
      if (cached) {
        await finalCache.put(request, cached);
      }
    }
    await caches.delete(TEMP_CACHE_NAME);

    return manifest;
  } catch (error) {
    // Rollback: clean up the temporary cache so it doesn't linger.
    await caches.delete(TEMP_CACHE_NAME);
    throw error;
  }
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
 * version/asset manifests which the main thread must always receive fresh
 * from the server.
 *
 * `/version.json` MUST be bypassed even though it is listed in
 * `manifest.files` (and therefore precached): without this bypass it is
 * served stale from the SW cache-first branch until the user performs a
 * hard-reload (which bypasses the SW entirely), because it is only
 * refreshed when `updateApp()`/`installApp()` runs.
 */
function shouldBypassSW(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    return path.startsWith('/auth/') || path === '/assets_list.json' || path === '/version.json';
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

  // Full bypass: /auth/* (OIDC), /assets_list.json and /version.json must never be intercepted.
  // Plain return WITHOUT respondWith: the browser handles the request natively.
  // `respondWith(fetch(request))` is NOT equivalent — OIDC endpoints answer
  // with cross-origin redirects to the AuthProvider, and a SW-relayed fetch of a
  // redirected navigation rejects ("Failed to fetch"), blanking the page
  // (incident 2026-08-10, evening: /auth/relogin navigation died in the SW).
  if (shouldBypassSW(url)) {
    return;
  }

  if (url === scope) {
    // Home page: network-first so Apache can redirect when the OIDC session
    // expires. On any non-redirect error (401/403/5xx) we fall back to the
    // cached shell so the user never sees a raw technical page; the app then
    // re-evaluates auth on the main thread.
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const indexUrl = scope + 'index.html';
        try {
          const networkResponse = await fetchWithTimeout(
            event.request.clone(),
            {
              redirect: 'manual',
              cache: 'no-store'
            },
            NAVIGATE_TIMEOUT_MS
          );
          if (networkResponse?.ok) {
            await cache.put(indexUrl, networkResponse.clone());
            return networkResponse;
          }
          // Preserve Apache/AuthProvider redirects (OIDC login flow): let the browser follow.
          if (networkResponse && isRedirectResponse(networkResponse)) {
            return networkResponse;
          }
          // 401/403/5xx (or any other non-ok): serve the cached shell if present.
          const cachedShell = await cache.match(indexUrl);
          if (cachedShell) {
            return cachedShell;
          }
          // No cached shell (e.g. right after clearing site data): force reauth
          // via /auth/relogin instead of leaking Apache's raw 401/403 body.
          if (isAuthErrorResponse(networkResponse)) {
            return Response.redirect(scope + 'auth/relogin', 302);
          }
          return networkResponse ?? Response.error();
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
          // Look up a cached fallback first. If we have one, the short network
          // timeout is safe (we can serve cache on abort). If we DON'T have a
          // cached copy, aborting at 3s would break the page (e.g. first-time
          // lazy-chunk loads on a slow network), so we wait for the real fetch.
          const cachedResponse = await cache.match(event.request);
          try {
            const networkResponse = cachedResponse
              ? await fetchWithTimeout(event.request.clone(), NO_CACHE_INIT)
              : await fetch(event.request.clone(), NO_CACHE_INIT);
            // Only cache successful (2xx) responses — never cache 3xx redirects.
            if (networkResponse?.ok) {
              await cache.put(event.request, networkResponse.clone());
              return networkResponse;
            }
            // Non-ok (401/403/5xx) for a code asset: prefer a cached copy over
            // surfacing a technical error that would break the page.
            if (cachedResponse) {
              return cachedResponse;
            }
            // No cache: for a full-page navigation, force reauth instead of a raw
            // 401/403 body. Non-navigate assets (e.g. a lazy chunk) are left as-is.
            if (event.request.mode === 'navigate' && isAuthErrorResponse(networkResponse)) {
              return Response.redirect(scope + 'auth/relogin', 302);
            }
            return networkResponse;
          } catch (error) {
            if (cachedResponse) {
              return cachedResponse;
            }
            console.error('Network-first fetch failed and no cache available:', error);
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
        // Bounded: an unbounded fetch here can hang behind an OIDC refresh
        // pile-up on the server (headers-only timeout; body streaming of
        // large files is unaffected once headers arrive).
        return fetchWithTimeout(fetchRequest, NO_CACHE_INIT, NAVIGATE_TIMEOUT_MS).catch((error) => {
          console.error('Fetch failed:', error);
          return Response.error();
        });
      })
    );
  }
}

(self as unknown as ServiceWorkerGlobalScope).addEventListener('fetch', handleFetch);

(self as unknown as ServiceWorkerGlobalScope).addEventListener('install', () => {
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
