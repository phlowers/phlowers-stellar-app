const CACHE_NAME = 'app-assets';

/**
 * Fetches the latest asset manifest (`assets_list.json`) from the server.
 * @returns A `Response` promise for the manifest file.
 */
function fetchLatestManifest() {
  return fetch('/assets_list.json');
}

/**
 * Checks whether the application has been installed by looking
 * for an `app_version` entry in the cache.
 * @returns `true` if the app is installed.
 */
export async function checkIfAppInstalled() {
  const cache = await caches.open(CACHE_NAME);
  const appVersion = await cache.match('app_version');
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
  console.log('SERVICE WORKER: Beginning app installation');
  const latestManifest = await fetchLatestManifest();
  const manifest = await latestManifest.json();
  const filesToInstall = manifest.files || [];
  const buildVersion = manifest.app_version;
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(filesToInstall);
  cache.put(
    'app_version',
    new Response(JSON.stringify(buildVersion), {
      headers: {
        'content-type': 'application/json'
      }
    })
  );
  console.log(`SERVICE WORKER: App installed (version ${buildVersion}, ${filesToInstall.length} files)`);
  for (const client of await (self as unknown as ServiceWorkerGlobalScope).clients.matchAll({
    includeUncontrolled: true,
    type: 'window'
  })) {
    client.postMessage({
      message: 'install_complete',
      latest_version: buildVersion,
      current_version: buildVersion
    });
  }
  return buildVersion;
}

/**
 * Updates the cached application assets to the latest manifest.
 * Skips re-downloading already-cached wheel files and removes
 * stale entries no longer present in the manifest.
 * @returns The updated application version.
 */
export async function updateApp() {
  console.log('SERVICE WORKER: Update requested');
  const manifest = await fetchLatestManifest().then((manifest) => manifest.json());
  const files = manifest.files || [];
  const cache = await caches.open(CACHE_NAME);
  let addedCount = 0;
  for (const file of files) {
    // do not redownload wheels if already in cache
    if (file.startsWith('/pyodide') && file.endsWith('.whl')) {
      if (!(await cache.match(file))) {
        await cache.add(file);
        addedCount++;
      }
    } else {
      await cache.add(file);
      addedCount++;
    }
  }
  const cacheKeys = (await cache.keys()).map((key) => key.url.replace(self.location.origin, ''));
  const keysToDelete = cacheKeys.filter((key) => key !== '/app_version' && !files.includes(key));
  for (const key of keysToDelete) {
    await cache.delete(key);
  }
  const appVersion = manifest.app_version;
  await cache.put(
    'app_version',
    new Response(JSON.stringify(appVersion), {
      headers: {
        'content-type': 'application/json'
      }
    })
  );
  console.log(
    `SERVICE WORKER: Update complete (version ${appVersion}, ${addedCount} added, ${keysToDelete.length} deleted)`
  );
  return appVersion;
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

(self as unknown as ServiceWorkerGlobalScope).addEventListener('install', async () => {
  console.log('SERVICE WORKER: Installing service worker');
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
  let appVersion = null;
  try {
    switch (type) {
      case 'update':
        appVersion = await updateApp();
        event.source?.postMessage({
          message: 'update_complete',
          latest_version: appVersion
        });
        break;
      case 'install':
        appVersion = await installApp();
        event.source?.postMessage({
          message: 'install_complete',
          latest_version: appVersion
        });
        break;
      default:
        console.warn(`SERVICE WORKER: Unknown message type: ${type}`);
    }
  } catch (e: any) {
    event.source?.postMessage({ message: 'error', error: e.message });
  }
}

(self as unknown as ServiceWorkerGlobalScope).addEventListener('activate', async () => {
  console.log('SERVICE WORKER: Activating service worker');
  const installed = await checkIfAppInstalled();
  if (!installed) {
    console.log('SERVICE WORKER: App not installed, installing now');
    await installApp();
  }
});

(self as unknown as ServiceWorkerGlobalScope).addEventListener('message', handleMessage);
