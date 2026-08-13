import { expect, Page, test } from '@playwright/test';
import { Snapshot } from './update-flow.interfaces';

/**
 * Reads the app/catalog state through real browser APIs (Cache Storage +
 * IndexedDB), resolving the active/previous versioned caches via the
 * activation pointer (`app-assets-control`) instead of a fixed cache name —
 * mirrors `resolveActiveCache()` in service-worker.ts.
 */
async function readSnapshot(page: Page): Promise<Snapshot> {
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
async function setScenario(request: import('@playwright/test').APIRequestContext, scenario: string): Promise<void> {
  const response = await request.post(`/__e2e/scenario?v=${scenario}`);
  expect(response.ok()).toBeTruthy();
}

/** Toggles the simulated `/auth/userinfo` authenticated session. */
async function setAuthenticated(
  request: import('@playwright/test').APIRequestContext,
  authenticated: boolean
): Promise<void> {
  const response = await request.post(`/__e2e/auth?authenticated=${authenticated}`);
  expect(response.ok()).toBeTruthy();
}

/** Waits for the automatic first install (authenticated + empty cache) and its catalog import to complete. */
async function waitForFirstInstall(page: Page, expectedVersion: string, expectedCableName: string): Promise<void> {
  await expect.poll(async () => (await readSnapshot(page)).appVersion, { timeout: 30_000 }).toBe(expectedVersion);
  await expect.poll(async () => (await readSnapshot(page)).cableName, { timeout: 30_000 }).toBe(expectedCableName);
}

test.describe('first install and authentication gating', () => {
  test('installs the app and imports catalogs automatically once the user is authenticated', async ({
    page,
    request
  }) => {
    await setScenario(request, 'v1');
    await setAuthenticated(request, true);

    await page.goto('/');
    await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');

    const snapshot = await readSnapshot(page);
    expect(snapshot.cableHash).not.toBeNull();
    // Exactly one versioned cache after a first install: no previous version yet.
    expect(snapshot.versionedCacheNames).toHaveLength(1);
    expect(snapshot.previousCacheName).toBeNull();

    // No auto-install/update prompt should ever be shown once the app is up to date.
    await expect(page.getByTestId('update-dialog')).toBeHidden();
  });

  test('never installs the app or imports catalogs for an unauthenticated user', async ({ page, request }) => {
    await setScenario(request, 'v1');
    await setAuthenticated(request, false);

    await page.goto('/');
    // authGuard redirects an unauthenticated user to /login instead of installing anything.
    await expect(page).toHaveURL(/\/login/);

    const snapshot = await readSnapshot(page);
    expect(snapshot.versionedCacheNames).toHaveLength(0);
    expect(snapshot.cableHash).toBeNull();
    expect(snapshot.cableName).toBeNull();
  });
});

test.describe('application update popup', () => {
  test('shows the popup after a reload when a new version is published, and refusing it leaves the app on the old version', async ({
    page,
    request
  }) => {
    await setScenario(request, 'v1');
    await setAuthenticated(request, true);
    await page.goto('/');
    await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');
    const beforeHash = (await readSnapshot(page)).cableHash;

    // Publish v2 (new app version + new cable data) and reload, as a real user would.
    await setScenario(request, 'v2');
    await page.reload();

    await expect(page.getByTestId('update-dialog')).toBeVisible();
    await page.getByTestId('update-later-btn').click();
    await expect(page.getByTestId('update-dialog')).toBeHidden();

    // Refusing the app update must never block the independent catalog refresh.
    await expect.poll(async () => (await readSnapshot(page)).cableName, { timeout: 30_000 }).toBe('E2E_CABLE_V2');
    const afterCatalogRefresh = await readSnapshot(page);
    expect(afterCatalogRefresh.cableHash).not.toBe(beforeHash);
    // The application version itself must remain untouched.
    expect(afterCatalogRefresh.appVersion).toBe('1.0.0-e2e');
    expect(afterCatalogRefresh.versionedCacheNames).toHaveLength(1);
  });

  test('accepting the popup activates the new version and retains the previous one for rollback', async ({
    page,
    request
  }) => {
    await setScenario(request, 'v1');
    await setAuthenticated(request, true);
    await page.goto('/');
    await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');
    const v1CacheName = (await readSnapshot(page)).activeCacheName;

    await setScenario(request, 'v2');
    await page.reload();
    await expect(page.getByTestId('update-dialog')).toBeVisible();
    await page.getByTestId('update-now-btn').click();

    // A successful update navigates the page back to '/' once activated.
    await expect.poll(async () => (await readSnapshot(page)).appVersion, { timeout: 30_000 }).toBe('2.0.0-e2e');

    const snapshot = await readSnapshot(page);
    expect(snapshot.versionedCacheNames).toHaveLength(2);
    expect(snapshot.previousCacheName).toBe(v1CacheName);
    expect(snapshot.hasAssetV2).toBeTruthy();

    // The previous version's own cache must still hold its own complete asset set (rollback target).
    const previousStillComplete = await page.evaluate(async (previousName) => {
      const previousCache = await caches.open(previousName);
      const keys = (await previousCache.keys()).map((k) => new URL(k.url).pathname);
      return keys.includes('/e2e-app-v1.js');
    }, snapshot.previousCacheName as string);
    expect(previousStillComplete).toBeTruthy();
  });

  test('prunes versions older than active+previous after a second update', async ({ page, request }) => {
    await setScenario(request, 'v1');
    await setAuthenticated(request, true);
    await page.goto('/');
    await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');

    await setScenario(request, 'v2');
    await page.reload();
    await page.getByTestId('update-now-btn').click();
    await expect.poll(async () => (await readSnapshot(page)).appVersion, { timeout: 30_000 }).toBe('2.0.0-e2e');
    const v2CacheName = (await readSnapshot(page)).activeCacheName;

    await setScenario(request, 'v3');
    await page.reload();
    await expect(page.getByTestId('update-dialog')).toBeVisible();
    await page.getByTestId('update-now-btn').click();
    await expect.poll(async () => (await readSnapshot(page)).appVersion, { timeout: 30_000 }).toBe('3.0.0-e2e');

    const snapshot = await readSnapshot(page);
    // Only active (v3) + previous (v2) remain; v1 has been pruned.
    expect(snapshot.versionedCacheNames).toHaveLength(2);
    expect(snapshot.previousCacheName).toBe(v2CacheName);
    expect(snapshot.hasAssetV3).toBeTruthy();
  });
});

test.describe('admin explicit update', () => {
  test('forces an update from the administration page', async ({ page, request }) => {
    await setScenario(request, 'v1');
    await setAuthenticated(request, true);
    await page.goto('/');
    await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');

    await setScenario(request, 'v2');
    await page.goto('/admin');
    await page.getByTestId('check-app-version-btn').click();
    await expect(page.getByTestId('force-update-btn')).toBeVisible();
    await page.getByTestId('force-update-btn').click();

    await expect.poll(async () => (await readSnapshot(page)).appVersion, { timeout: 30_000 }).toBe('2.0.0-e2e');
  });
});

test.describe('resilience', () => {
  test('aborts the update and keeps the previous version fully usable when a candidate asset fails to precache', async ({
    page,
    request
  }) => {
    await setScenario(request, 'v1');
    await setAuthenticated(request, true);
    await page.goto('/');
    await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');

    await setScenario(request, 'v2-broken');
    await page.reload();
    await expect(page.getByTestId('update-dialog')).toBeVisible();
    await page.getByTestId('update-now-btn').click();

    // The candidate precache fails (one asset 404s): the app must never end up
    // on a half-installed version. Give the failure time to surface, then
    // assert the previous version is still the one and only active version.
    await page.waitForTimeout(3000);
    const snapshot = await readSnapshot(page);
    expect(snapshot.appVersion).toBe('1.0.0-e2e');
    expect(snapshot.versionedCacheNames).toHaveLength(1);
  });

  test('keeps the previous catalog data active when the declared hash does not match the served content', async ({
    page,
    request
  }) => {
    await setScenario(request, 'v1');
    await setAuthenticated(request, true);
    await page.goto('/');
    await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');
    const beforeSnapshot = await readSnapshot(page);

    await setScenario(request, 'v2-badhash');
    await page.reload();

    // The catalog orchestrator runs independently of the app-update popup and
    // rejects the mismatch before any Dexie mutation; give it time to run,
    // then assert nothing changed.
    await page.waitForTimeout(3000);
    const afterSnapshot = await readSnapshot(page);
    expect(afterSnapshot.cableName).toBe('E2E_CABLE_V1');
    expect(afterSnapshot.cableHash).toBe(beforeSnapshot.cableHash);
  });
});

test.describe('catalogs update independently and minimally', () => {
  test('requests only the catalog file whose hash changed', async ({ page, request }) => {
    await setScenario(request, 'v1');
    await setAuthenticated(request, true);
    await page.goto('/');
    // First install imports every catalog once (all hashes are missing from metadata).
    await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');

    const catalogRequests: string[] = [];
    page.on('request', (req) => {
      const url = new URL(req.url());
      if (url.pathname.startsWith('/data/')) {
        catalogRequests.push(url.pathname);
      }
    });

    // Only cables.csv changes between v1 and v2; every other catalog hash is unchanged.
    await setScenario(request, 'v2');
    await page.reload();
    await expect.poll(async () => (await readSnapshot(page)).cableName, { timeout: 30_000 }).toBe('E2E_CABLE_V2');

    expect(catalogRequests).toContain('/data/cables.csv');
    expect(catalogRequests).not.toContain('/data/attachments.csv');
    expect(catalogRequests).not.toContain('/data/chains.csv');
    expect(catalogRequests).not.toContain('/data/lines.csv');
    expect(catalogRequests).not.toContain('/data/maintenance-teams.csv');
    expect(catalogRequests).not.toContain('/data/obstacle_configuration.json');
  });
});

test.describe('offline root and deep link', () => {
  test('serves the cached shell offline for both the root and a deep link', async ({ page, request, context }) => {
    await setScenario(request, 'v1');
    await setAuthenticated(request, true);
    await page.goto('/');
    await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');

    await context.setOffline(true);
    try {
      const rootResponse = await page.goto('/');
      expect(rootResponse?.ok()).toBeTruthy();
      await expect(page.locator('router-outlet')).toBeAttached();

      const deepLinkResponse = await page.goto('/admin');
      expect(deepLinkResponse?.ok()).toBeTruthy();
      await expect(page.getByTestId('check-app-version-btn')).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
  });
});
