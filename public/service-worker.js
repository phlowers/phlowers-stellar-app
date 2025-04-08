const CACHE_NAME = 'app-assets';

function fetchLatestManifest() {
  return fetch("/assets_list.json");
}

const serviceWorkerLogPrefix = "SERVICE WORKER: ";

function log(message) {
  console.log(serviceWorkerLogPrefix + message);
}

self.addEventListener("install", (event) => {
  log("beginning service worker installation");
  event.waitUntil(fetchLatestManifest().then((manifest) => {
    return manifest.json();
  }).then(async (manifest) => {
    log(serviceWorkerLogPrefix + "installing service worker with manifest", manifest);
    const files = manifest.files || [];
    const buildVersion = manifest.app_version;
    const cache = await caches.open(CACHE_NAME);
    return cache.addAll(files).then(() => {
      const jsonResponse = new Response(JSON.stringify(buildVersion), {
        headers: {
          'content-type': 'application/json'
        }
      });
      cache.put("app_version", jsonResponse);
      log(serviceWorkerLogPrefix + "app installed");
    }).then(async () => {
      for (const client of await clients.matchAll({ includeUncontrolled: true, type: 'window' })) {
        client.postMessage({ message: "install_complete", latest_version: buildVersion });
      }
    });
  }))
})

self.addEventListener('activate', event => {
  log(serviceWorkerLogPrefix + "activating service worker");
});

self.addEventListener("message", (event) => {
  log(serviceWorkerLogPrefix + "message in service worker", event);
  if (event.data.type === "update") {
    log(serviceWorkerLogPrefix + "update requested");
    event.waitUntil(fetchLatestManifest().then((manifest) => {
      return manifest.json();
    }).then(async (manifest) => {
      const files = manifest.files || [];
      log(serviceWorkerLogPrefix + "updating service worker with manifest", manifest);
      const cache = await caches.open(CACHE_NAME);
      for (const file of files) {
        if (file.startsWith("http") || file.startsWith("/pyodide")) {
          if (await cache.match(file)) {
            log(serviceWorkerLogPrefix + "file already in cache, skipping", file);
          } else {
            log(serviceWorkerLogPrefix + "file not in cache, adding", file);
            await cache.add(file);
          }
        } else {
          log(serviceWorkerLogPrefix + "adding file", file);
          await cache.add(file);
        }
      }
      const cacheKeys = (await cache.keys()).map(key => key.url.replace(self.location.origin, ""));
      const keysToDelete = cacheKeys.filter(key => key !== "/app_version" && !files.includes(key));
      for (const key of keysToDelete) {
        log(serviceWorkerLogPrefix + "deleting file", key);
        await cache.delete(key);
      }
      const appVersion = manifest.app_version;
      const jsonResponse = new Response(JSON.stringify(appVersion), {
        headers: {
          'content-type': 'application/json'
        }
      });
      await cache.put("app_version", jsonResponse);

      for (const client of await clients.matchAll({ includeUncontrolled: true, type: 'window' })) {
        client.postMessage({ message: "update_complete", current_version: manifest.app_version });
      }
    }));
  }
});
function checkNewVersion() {
  fetchLatestManifest().then((manifest) => {
    return manifest.json();
  }).then((manifest) => {
    const manifestVersion = manifest.app_version;
    if (manifestVersion) {
      return caches.open(CACHE_NAME).then(cache => {
        return cache.match("app_version");
      }).then(cacheAppVersion => {
        return cacheAppVersion.json();
      }).then(async appVersion => {
        if (appVersion) {
          if (appVersion.git_hash !== manifestVersion.git_hash || appVersion.build_datetime_utc !== manifestVersion.build_datetime_utc) {
            log(serviceWorkerLogPrefix + "new version detected. New version:", manifestVersion, "Current version:", appVersion);
            for (const client of await clients.matchAll({ includeUncontrolled: true, type: 'window' })) {
              client.postMessage({ message: "new_version", latest_version: manifestVersion, current_version: appVersion });
            }
          } else {
            log(serviceWorkerLogPrefix + "no new version");
            for (const client of await clients.matchAll({ includeUncontrolled: true, type: 'window' })) {
              client.postMessage({ message: "no_new_version", latest_version: manifestVersion, current_version: appVersion });
            }
          }
        } else {
          log(serviceWorkerLogPrefix + "no app version in cache");
        }
      });
    } else {
      log(serviceWorkerLogPrefix + "no manifest version");
    }
  })
}

self.addEventListener('fetch', event => {
  const url = event.request.url;
  const scope = self.registration.scope;
  if (event.request.mode === "navigate") {
    checkNewVersion();
  }
  if (url === scope) {
    const newUrl = scope + 'index.html';
    event.respondWith(
      caches.match(newUrl)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request.clone());
        })
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          const fetchRequest = event.request.clone();
          return fetch(fetchRequest)
            .catch(error => {
              console.error('Fetch failed:', error);
            });
        })
    );
  }
});