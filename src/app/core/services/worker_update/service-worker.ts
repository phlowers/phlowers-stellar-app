const CACHE_NAME = 'app-assets';

function fetchLatestManifest() {
  return fetch('/assets_list.json');
}

const serviceWorkerLogPrefix = 'SERVICE WORKER: ';

function log(message: string, ...args: any[]) {
  console.log(serviceWorkerLogPrefix + message, ...args);
}

export async function checkIfAppInstalled() {
  const cache = await caches.open(CACHE_NAME);
  const appVersion = await cache.match('app_version');
  if (appVersion) {
    return true;
  }
  return false;
}

export async function installApp() {
  log('beginning app installation');
  const latestManifest = await fetchLatestManifest();
  const manifest = await latestManifest.json();
  log('installing service worker with manifest', manifest);
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
  log('app installed');
  for (const client of await (
    self as unknown as ServiceWorkerGlobalScope
  ).clients.matchAll({
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

export async function updateApp() {
  log('update requested');
  const manifest = await fetchLatestManifest().then((manifest) =>
    manifest.json()
  );
  log('updating service worker with manifest', manifest);
  const files = manifest.files || [];
  const cache = await caches.open(CACHE_NAME);
  for (const file of files) {
    if (file.startsWith('/pyodide')) {
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
  const cacheKeys = (await cache.keys()).map((key) =>
    key.url.replace(self.location.origin, '')
  );
  const keysToDelete = cacheKeys.filter(
    (key) => key !== '/app_version' && !files.includes(key)
  );
  for (const key of keysToDelete) {
    log('deleting file', key);
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

export async function handleFetch(event: FetchEvent) {
  const url = event.request.url;
  const scope = (self as unknown as ServiceWorkerGlobalScope).registration
    ?.scope;
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

(self as unknown as ServiceWorkerGlobalScope).addEventListener(
  'fetch',
  handleFetch
);

(self as unknown as ServiceWorkerGlobalScope).addEventListener(
  'fetch',
  async (event: FetchEvent) => {
    const url = event.request.url;
    const scope = (self as unknown as ServiceWorkerGlobalScope).registration
      ?.scope;
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
);

(self as unknown as ServiceWorkerGlobalScope).addEventListener(
  'install',
  async () => {
    log('installing service worker');
  }
);

export async function handleMessage(event: ExtendableMessageEvent) {
  log('message in service worker', event);
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
        log('unknown message type', type);
    }
  } catch (e: any) {
    event.source?.postMessage({ message: 'error', error: e.message });
  }
}

(self as unknown as ServiceWorkerGlobalScope).addEventListener(
  'activate',
  async () => {
    log('activating service worker');
    const installed = await checkIfAppInstalled();
    if (installed) {
      log('app is installed');
    } else {
      log('app is not installed');
      await installApp();
    }
  }
);

(self as unknown as ServiceWorkerGlobalScope).addEventListener(
  'message',
  handleMessage
);
