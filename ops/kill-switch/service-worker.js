/*
 * Emergency kill-switch: deploy this file in place of /service-worker.js to disable the service worker on every
 * workstation at its next connection. It deletes every Cache Storage entry and unregisters itself; IndexedDB
 * (studies, catalogs) is untouched and open pages are NEVER reloaded, so no work in progress is lost.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
      await self.registration.unregister();
    })()
  );
});
