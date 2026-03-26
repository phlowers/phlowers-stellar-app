import { expect, test } from '@playwright/test';
import { Snapshot } from './update-flow.interfaces';

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
      hasAssetV1: cacheKeys.includes('/e2e-app-v1.js'),
      hasAssetV2: cacheKeys.includes('/e2e-app-v2.js'),
      cableHash: (cableHashMetadata?.['value'] as string) ?? null,
      cableName: (firstCable?.['name'] as string) ?? null
    };
  });
}

async function getManifestFetchCount(request: import('@playwright/test').APIRequestContext): Promise<number> {
  const response = await request.get('/__e2e/manifest-fetch-count');
  const body = (await response.json()) as { count: number };
  return body.count;
}

/**
 * Scenario: user accepts an available update at startup.
 *
 * Flow:
 *  1. Install app at v1 (first page load triggers Service Worker install)
 *  2. Server switches to v2
 *  3. Page reload triggers the single startup check via AppUpdateOrchestratorService
 *  4. Update dialog becomes visible (user consent required)
 *  5. User clicks "Update now"
 *  6. Service Worker updates caches; page auto-reloads to v2
 */
test('user accepts update from dialog when new version is available at startup', async ({ page, request }) => {
  // Reset server state so manifest fetch count starts at 0.
  await request.post('/__e2e/reset');

  // Set server to v1 and perform first load so the Service Worker installs v1.
  await request.post('/__e2e/scenario?v=v1');
  await page.goto('/');

  // Wait until v1 is installed in cache.
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

  // Switch server to v2 and reset manifest counter before the reload.
  await request.post('/__e2e/scenario?v=v2');
  await request.post('/__e2e/reset');
  await request.post('/__e2e/scenario?v=v2');

  // Reload triggers AppUpdateOrchestratorService startup check.
  await page.reload();

  // Update dialog must appear — user consent is required.
  const updateDialog = page.locator('[data-testid="update-dialog"]');
  await expect(updateDialog).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-testid="update-now-btn"]')).toBeVisible();
  await expect(page.locator('[data-testid="update-later-btn"]')).toBeVisible();

  // User accepts — calls AppUpdateOrchestratorService.acceptUpdate() → posts
  // { type: 'update' } to Service Worker → update_complete → page reloads.
  await page.locator('[data-testid="update-now-btn"]').click();

  // Wait until cache is updated to v2.
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

  // The orchestrator performs exactly one manifest fetch per boot cycle.
  // (Counter was reset before reload, so this reflects the new session.)
  const fetchCount = await getManifestFetchCount(request);
  expect(fetchCount).toBeGreaterThanOrEqual(1);
  // At most: orchestrator fetch + SW update fetch + possible post-reload check.
  expect(fetchCount).toBeLessThanOrEqual(3);
});

/**
 * Scenario: user declines an available update at startup.
 *
 * When the user clicks "Later" the dialog closes and the cache must remain
 * at the current (v1) version — no assets must be overwritten.
 */
test('user declines update from dialog and app stays at current version', async ({ page, request }) => {
  await request.post('/__e2e/reset');

  // Install v1.
  await request.post('/__e2e/scenario?v=v1');
  await page.goto('/');

  await expect
    .poll(async () => {
      const snapshot = await readSnapshot(page);
      return snapshot.appVersion;
    })
    .toBe('1.0.0-e2e');

  const beforeDecline = await readSnapshot(page);
  expect(beforeDecline.hasAssetV1).toBeTruthy();

  // Switch server to v2 before reload.
  await request.post('/__e2e/scenario?v=v2');
  await request.post('/__e2e/reset');
  await request.post('/__e2e/scenario?v=v2');

  await page.reload();

  // Dialog must be visible.
  const updateDialog = page.locator('[data-testid="update-dialog"]');
  await expect(updateDialog).toBeVisible({ timeout: 30_000 });

  // User clicks "Later" — dialog closes, no cache mutation.
  await page.locator('[data-testid="update-later-btn"]').click();
  await expect(updateDialog).not.toBeVisible();

  // Cache version must still be v1.
  const afterDecline = await readSnapshot(page);
  expect(afterDecline.appVersion).toBe('1.0.0-e2e');
  expect(afterDecline.hasAssetV1).toBeTruthy();
  expect(afterDecline.hasAssetV2).toBeFalsy();
  expect(afterDecline.cableName).toBe('E2E_CABLE_V1');
});

/**
 * Scenario: no update available at startup.
 *
 * When the cached version matches the server version the dialog must NOT appear.
 */
test('no update dialog shown when versions match at startup', async ({ page, request }) => {
  await request.post('/__e2e/reset');

  // Install v1.
  await request.post('/__e2e/scenario?v=v1');
  await page.goto('/');

  await expect
    .poll(async () => {
      const snapshot = await readSnapshot(page);
      return snapshot.appVersion;
    })
    .toBe('1.0.0-e2e');

  // Reload with server still at v1 — orchestrator should find no version difference.
  await page.reload();

  // Dialog must NOT appear.
  const updateDialog = page.locator('[data-testid="update-dialog"]');
  await expect(updateDialog).not.toBeVisible({ timeout: 10_000 });

  // Version in cache remains v1.
  const snapshot = await readSnapshot(page);
  expect(snapshot.appVersion).toBe('1.0.0-e2e');
});
