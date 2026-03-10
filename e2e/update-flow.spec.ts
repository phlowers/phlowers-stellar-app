import { expect, test } from '@playwright/test';

type Snapshot = {
  appVersion: string | null;
  hasAssetV1: boolean;
  hasAssetV2: boolean;
  cableHash: string | null;
  cableName: string | null;
};

async function readSnapshot(page: import('@playwright/test').Page): Promise<Snapshot> {
  return page.evaluate(async () => {
    const cache = await caches.open('app-assets');
    const appVersionResponse = await cache.match('/app_version');
    const appVersionJson = appVersionResponse ? await appVersionResponse.json() : null;
    const appVersion = appVersionJson?.version ?? null;

    const cacheKeys = (await cache.keys()).map((key) => new URL(key.url).pathname);

    const dbRequest = indexedDB.open('stellar-db');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      dbRequest.onsuccess = () => resolve(dbRequest.result);
      dbRequest.onerror = () => reject(dbRequest.error);
    });

    const readStoreValue = (storeName: string, key: string): Promise<any> => {
      return new Promise((resolve, reject) => {
        if (!db.objectStoreNames.contains(storeName)) {
          resolve(null);
          return;
        }
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const getRequest = store.get(key);
        getRequest.onsuccess = () => resolve(getRequest.result ?? null);
        getRequest.onerror = () => reject(getRequest.error);
      });
    };

    const firstCable = await new Promise<any>((resolve, reject) => {
      if (!db.objectStoreNames.contains('catCables')) {
        resolve(null);
        return;
      }
      const transaction = db.transaction('catCables', 'readonly');
      const store = transaction.objectStore('catCables');
      const cursorRequest = store.openCursor();
      cursorRequest.onsuccess = () => resolve(cursorRequest.result?.value ?? null);
      cursorRequest.onerror = () => reject(cursorRequest.error);
    });

    const cableHashMetadata = await readStoreValue('metadata', 'catalog_hash:cables.csv');

    db.close();

    return {
      appVersion,
      hasAssetV1: cacheKeys.includes('/e2e-app-v1.js'),
      hasAssetV2: cacheKeys.includes('/e2e-app-v2.js'),
      cableHash: cableHashMetadata?.value ?? null,
      cableName: firstCable?.name ?? null
    };
  });
}

test('updates app assets and CSV catalogs when a new version is published', async ({ page, request }) => {
  const scenarioResponse = await request.post('/__e2e/scenario?v=v1');
  expect(scenarioResponse.ok()).toBeTruthy();

  await page.goto('/');

  await expect
    .poll(async () => {
      const snapshot = await readSnapshot(page);
      return snapshot.appVersion;
    })
    .toBe('1.0.0-e2e');

  await expect
    .poll(async () => {
      const snapshot = await readSnapshot(page);
      return snapshot.cableName;
    })
    .toBe('E2E_CABLE_V1');

  const beforeUpdate = await readSnapshot(page);
  expect(beforeUpdate.hasAssetV1).toBeTruthy();
  expect(beforeUpdate.hasAssetV2).toBeFalsy();
  expect(beforeUpdate.cableHash).not.toBeNull();

  const scenarioUpdateResponse = await request.post('/__e2e/scenario?v=v2');
  expect(scenarioUpdateResponse.ok()).toBeTruthy();

  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    registration?.active?.postMessage({ type: 'update' });
  });

  await expect
    .poll(async () => {
      const snapshot = await readSnapshot(page);
      return snapshot.appVersion;
    })
    .toBe('2.0.0-e2e');

  const afterUpdate = await readSnapshot(page);
  expect(afterUpdate.hasAssetV2).toBeTruthy();
  expect(afterUpdate.hasAssetV1).toBeFalsy();
  expect(afterUpdate.cableName).toBe('E2E_CABLE_V2');
  expect(afterUpdate.cableHash).not.toBeNull();
  expect(afterUpdate.cableHash).not.toBe(beforeUpdate.cableHash);
});
