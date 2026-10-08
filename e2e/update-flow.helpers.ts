import { APIRequestContext, expect, Page } from '@playwright/test';
import { Snapshot } from './update-flow.interfaces';

/**
 * Reads the app/catalog state through real browser APIs (Cache Storage +
 * IndexedDB), resolving the active/previous versioned caches via the
 * activation pointer (`app-assets-control`) instead of a fixed cache name —
 * mirrors `resolveActiveCache()` in service-worker.ts.
 */
export async function readSnapshot(page: Page): Promise<Snapshot> {
  // A successful update navigates to '/', which destroys the evaluation context mid-call.
  for (let attempt = 0; ; attempt++) {
    try {
      return await evaluateSnapshot(page);
    } catch (error) {
      if (attempt >= 4 || !String(error).includes('Execution context was destroyed')) {
        throw error;
      }
      await page.waitForLoadState('load');
    }
  }
}

function evaluateSnapshot(page: Page): Promise<Snapshot> {
  return page.evaluate(async () => {
    const controlCache = await caches.open('app-assets-control');
    const controlResponse = await controlCache.match('/control');
    const controlState = controlResponse
      ? ((await controlResponse.json()) as { active: string; previous: string | null })
      : null;
    const activeCacheName = controlState?.active ?? null;

    let appVersion: string | null = null;
    let cacheKeys: string[] = [];
    if (activeCacheName && (await caches.has(activeCacheName))) {
      const activeCache = await caches.open(activeCacheName);
      const appVersionResponse = await activeCache.match('/app_version');
      const appVersionJson = appVersionResponse ? await appVersionResponse.json() : null;
      appVersion = appVersionJson?.version ?? null;
      cacheKeys = (await activeCache.keys()).map((key) => new URL(key.url).pathname);
    }

    const allCacheNames = await caches.keys();
    const versionedCacheNames = allCacheNames.filter((name) => name.startsWith('app-assets-v-'));

    const dbRequest = indexedDB.open('stellar-db');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      dbRequest.onsuccess = () => resolve(dbRequest.result);
      dbRequest.onerror = () => reject(dbRequest.error);
    });

    const readStoreValue = (storeName: string, key: string): Promise<Record<string, unknown> | null> => {
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

    const firstCable = await new Promise<Record<string, unknown> | null>((resolve, reject) => {
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
      activeCacheName,
      previousCacheName: controlState?.previous ?? null,
      versionedCacheNames,
      hasAssetV1: cacheKeys.includes('/e2e-app-v1.js'),
      hasAssetV2: cacheKeys.includes('/e2e-app-v2.js'),
      hasAssetV3: cacheKeys.includes('/e2e-app-v3.js'),
      cableHash: (cableHashMetadata?.['value'] as string) ?? null,
      cableName: (firstCable?.['name'] as string) ?? null
    };
  });
}

/** Sets the app-version/catalog scenario served by the sim server. */
export async function setScenario(request: APIRequestContext, scenario: string): Promise<void> {
  const response = await request.post(`/__e2e/scenario?v=${scenario}`);
  expect(response.ok()).toBeTruthy();
}

/** Toggles the simulated `/auth/userinfo` authenticated session. */
export async function setAuthenticated(request: APIRequestContext, authenticated: boolean): Promise<void> {
  const response = await request.post(`/__e2e/auth?authenticated=${authenticated}`);
  expect(response.ok()).toBeTruthy();
}

/** Waits for the automatic first install (authenticated + empty cache) and its catalog import to complete. */
export async function waitForFirstInstall(
  page: Page,
  expectedVersion: string,
  expectedCableName: string
): Promise<void> {
  await expect.poll(async () => (await readSnapshot(page)).appVersion, { timeout: 30_000 }).toBe(expectedVersion);
  await expect.poll(async () => (await readSnapshot(page)).cableName, { timeout: 30_000 }).toBe(expectedCableName);
}

/** Calls the sim server fault-injection endpoint (see `update-sim-server.mjs`). */
export async function setFaults(request: APIRequestContext, query: Record<string, string | number>): Promise<void> {
  const search = new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]));
  const response = await request.post(`/__e2e/faults?${search.toString()}`);
  expect(response.ok()).toBeTruthy();
}

/** Clears every injected fault and the sim server request log. */
export async function resetFaults(request: APIRequestContext): Promise<void> {
  await setFaults(request, { reset: 'true' });
}

/** App file paths requested from the sim server since the last faults reset. */
export async function getRequestLog(request: APIRequestContext): Promise<string[]> {
  const response = await request.get('/__e2e/requests');
  return (await response.json()) as string[];
}
