import { expect, Page, test } from '@playwright/test';
import {
  closeAllPagesAndReopen,
  getRequestLog,
  readSnapshot,
  resetFaults,
  setAuthenticated,
  setDownlink,
  setScenario,
  setServiceWorkerMode,
  waitForDownloadsToSettle,
  waitForFirstInstall,
  waitForWaitingVersion
} from './update-flow.helpers';

/** Cache Storage names, read from the page. */
function readCacheNames(page: Page): Promise<string[]> {
  return page.evaluate(() => caches.keys());
}

/** Service worker registration state, read from the page. */
function readRegistration(page: Page): Promise<{ exists: boolean; active: boolean; waiting: boolean }> {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return {
      exists: Boolean(registration),
      active: Boolean(registration?.active),
      waiting: Boolean(registration?.waiting)
    };
  });
}

/** Asks the browser to fetch /service-worker.js again (what a navigation or the periodic check does). */
async function checkServiceWorkerUpdate(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await (await navigator.serviceWorker.getRegistration())?.update();
  });
}

/**
 * Transition from the previous update system, emergency kill-switch and rollback by redeployment. The previous
 * system is a stand-in served by the sim server (same URL, skipWaiting, clients.claim, app-assets-* caches); the
 * full sequence with the real previous build is the manual pilot test of P6-04.
 */
test.describe('transition, kill-switch and rollback', () => {
  test.beforeEach(async ({ request }) => {
    await resetFaults(request);
    await setScenario(request, 'v1');
    await setAuthenticated(request, true);
    await setDownlink(request, 10);
    await setServiceWorkerMode(request, 'workbox');
  });

  test.afterEach(async ({ request }) => {
    await setServiceWorkerMode(request, 'workbox');
    await resetFaults(request);
  });

  test('previous system -> Workbox: waits while the old worker controls the page, then removes app-assets caches and keeps IndexedDB', async ({
    page,
    request
  }) => {
    await setServiceWorkerMode(request, 'legacy');
    await page.goto('/');
    await expect.poll(async () => readCacheNames(page), { timeout: 30_000 }).toContain('app-assets-v-e2e0001');
    await expect.poll(async () => (await readSnapshot(page)).cableName, { timeout: 30_000 }).toBe('E2E_CABLE_V1');
    await page.reload();
    expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    // Let the page finish loading Pyodide over the network so the log below only counts the Workbox installation.
    await expect.poll(async () => getRequestLog(request), { timeout: 30_000 }).toContain('/pyodide/pyodide.asm.wasm');
    await waitForDownloadsToSettle(request);

    // Deployment of the Workbox version at the same URL.
    await setServiceWorkerMode(request, 'workbox');
    await resetFaults(request);
    await checkServiceWorkerUpdate(page);
    await waitForWaitingVersion(page);
    await waitForDownloadsToSettle(request);

    // The old worker stays in charge until every window is closed.
    expect(await readCacheNames(page)).toEqual(expect.arrayContaining(['app-assets-control', 'app-assets-v-e2e0001']));
    // A single extra full download (counted before the reload: the stand-in only serves navigations from its cache).
    expect((await getRequestLog(request)).filter((path) => path === '/pyodide/pyodide.asm.wasm')).toHaveLength(1);
    expect((await page.reload())?.ok()).toBeTruthy();
    expect((await readRegistration(page)).waiting).toBe(true);

    const reopened = await closeAllPagesAndReopen(page);
    await expect
      .poll(async () => (await readCacheNames(reopened)).filter((name) => name.startsWith('app-assets')), {
        timeout: 30_000
      })
      .toEqual([]);
    expect(await readRegistration(reopened)).toEqual({ exists: true, active: true, waiting: false });
    const snapshot = await readSnapshot(reopened);
    expect(snapshot.offlineReady).toBe(true);
    expect(snapshot.cableName).toBe('E2E_CABLE_V1');
  });

  test('kill-switch: unregisters the worker and empties every cache without reloading open pages', async ({
    page,
    request
  }) => {
    await page.goto('/');
    await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');
    await page.evaluate(() => ((globalThis as Record<string, unknown>)['__killSwitchMarker'] = true));

    await setServiceWorkerMode(request, 'kill-switch');
    await checkServiceWorkerUpdate(page);

    await expect.poll(async () => (await readRegistration(page)).exists, { timeout: 30_000 }).toBe(false);
    await expect.poll(async () => readCacheNames(page), { timeout: 30_000 }).toEqual([]);
    expect(await page.evaluate(() => (globalThis as Record<string, unknown>)['__killSwitchMarker'])).toBe(true);
    // IndexedDB (studies, catalogs) is untouched.
    expect((await readSnapshot(page)).cableName).toBe('E2E_CABLE_V1');

    // The application keeps working online.
    const response = await page.reload();
    expect(response?.ok()).toBeTruthy();
    expect(response?.fromServiceWorker()).toBe(false);
  });

  test('rollback by redeploying the previous system: the old worker takes over and the app stays usable', async ({
    page,
    request
  }) => {
    await page.goto('/');
    await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');

    await setServiceWorkerMode(request, 'legacy');
    await checkServiceWorkerUpdate(page);

    await expect.poll(async () => readCacheNames(page), { timeout: 30_000 }).toContain('app-assets-v-e2e0001');
    await expect.poll(async () => (await readRegistration(page)).waiting, { timeout: 30_000 }).toBe(false);
    const response = await page.reload();
    expect(response?.ok()).toBeTruthy();
    const snapshot = await readSnapshot(page);
    expect(snapshot.offlineReady).toBe(true);
    expect(snapshot.cableName).toBe('E2E_CABLE_V1');
  });
});
