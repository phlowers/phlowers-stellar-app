import { APIRequestContext, CDPSession, expect, Page, test } from '@playwright/test';
import {
  closeAllPagesAndReopen,
  getRequestLog,
  readSnapshot,
  resetFaults,
  setAuthenticated,
  setDownlink,
  setFaults,
  setScenario,
  waitForFirstInstall,
  waitForWaitingVersion
} from './update-flow.helpers';

const UPDATE_WAITING_TOAST = 'Update downloaded';
// Read from the network at every start by design, never precached.
const NETWORK_ONLY_PATHS = new Set(['/assets/config/app-config.json', '/version.json', '/catalog-manifest.json']);

/** App files downloaded since the last faults reset, network-only files and catalogs excluded. */
async function getDownloadedAppFiles(request: APIRequestContext): Promise<string[]> {
  return (await getRequestLog(request)).filter((path) => !NETWORK_ONLY_PATHS.has(path) && !path.startsWith('/data/'));
}

/** Installs v1 (first launch, authenticated, fast network) and returns once it is fully cached. */
async function installV1(page: Page): Promise<void> {
  await page.goto('/');
  await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');
}

/** Paths of the precache entries currently in Cache Storage. */
function readPrecachedPaths(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const paths: string[] = [];
    for (const name of await caches.keys()) {
      if (name.startsWith('workbox-precache')) {
        const keys = await (await caches.open(name)).keys();
        paths.push(...keys.map((request) => new URL(request.url).pathname));
      }
    }
    return paths;
  });
}

function hasWaitingVersion(page: Page): Promise<boolean> {
  return page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting));
}

async function stopServiceWorkers(page: Page): Promise<CDPSession> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('ServiceWorker.enable');
  await cdp.send('ServiceWorker.stopAllWorkers');
  return cdp;
}

test.describe('application update lifecycle (Workbox)', () => {
  test.beforeEach(async ({ request }) => {
    await resetFaults(request);
    await setScenario(request, 'v1');
    await setAuthenticated(request, true);
    await setDownlink(request, 10);
  });

  test.afterEach(async ({ request }) => {
    await resetFaults(request);
    await setScenario(request, 'v1');
  });

  test('a rebuild of the same commit downloads nothing and shows no notification', async ({ page, request }) => {
    await installV1(page);
    await resetFaults(request);

    await setScenario(request, 'v1-rebuild');
    await page.reload();
    await page.waitForTimeout(5_000);

    expect(await getDownloadedAppFiles(request)).toEqual([]);
    expect(await hasWaitingVersion(page)).toBe(false);
    await expect(page.getByText(UPDATE_WAITING_TOAST)).toHaveCount(0);
  });

  test('a new version waits: notified, unchanged after F5, active once every window is closed and reopened', async ({
    page,
    request
  }) => {
    await installV1(page);

    await setScenario(request, 'v2');
    await page.reload();
    await waitForWaitingVersion(page);
    await expect(page.getByText(UPDATE_WAITING_TOAST).first()).toBeVisible();

    await page.reload();
    expect((await readSnapshot(page)).appVersion).toBe('1.0.0-e2e');

    const reopened = await closeAllPagesAndReopen(page);
    await expect.poll(async () => (await readSnapshot(reopened)).appVersion, { timeout: 30_000 }).toBe('2.0.0-e2e');
    expect(await hasWaitingVersion(reopened)).toBe(false);
  });

  test('only the files whose revision changed are downloaded', async ({ page, request }) => {
    await installV1(page);
    await resetFaults(request);

    await setScenario(request, 'v2');
    await page.reload();
    await waitForWaitingVersion(page);

    const downloaded = [...new Set(await getDownloadedAppFiles(request))];
    expect(downloaded).toContain('/e2e-app-v2.js');
    expect(downloaded).not.toContain('/index.html');
    expect(downloaded).not.toContain('/pyodide/python_stdlib.zip');
    // v1 -> v2 only changes the scenario asset and the chunk carrying the version stamp.
    expect(downloaded.length).toBeLessThanOrEqual(2);
  });

  test('an interrupted first installation resumes without downloading the cached files again', async ({
    page,
    request
  }) => {
    test.setTimeout(180_000);
    await setFaults(request, { latencyMs: 150 });
    await page.goto('/');
    await expect.poll(async () => (await readPrecachedPaths(page)).length, { timeout: 60_000 }).toBeGreaterThan(20);

    await stopServiceWorkers(page);
    const cachedBeforeRetry = new Set(await readPrecachedPaths(page));
    const logLengthAtCut = (await getRequestLog(request)).length;
    expect(await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.active))).toBe(
      false
    );

    await setFaults(request, { latencyMs: 0 });
    // A failed first installation clears the registration: the app registers again at its next start. Same page,
    // no navigation, so only the service worker downloads from now on.
    await page.evaluate(async () => {
      await navigator.serviceWorker.register('/service-worker.js');
    });
    await expect
      .poll(() => page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.active)), {
        timeout: 90_000
      })
      .toBe(true);

    const downloadedAgain = (await getRequestLog(request))
      .slice(logLengthAtCut)
      .filter((path) => cachedBeforeRetry.has(path));
    expect(downloadedAgain).toEqual([]);
  });

  test('a file whose content differs from the manifest (integrity) fails the update; nothing changes', async ({
    page,
    request
  }) => {
    await installV1(page);
    await setFaults(request, { tamper: '/e2e-app-v2.js' });

    await setScenario(request, 'v2');
    await page.reload();
    await page.waitForTimeout(8_000);

    expect(await hasWaitingVersion(page)).toBe(false);
    const reopened = await closeAllPagesAndReopen(page);
    expect((await readSnapshot(reopened)).appVersion).toBe('1.0.0-e2e');
    expect(await readPrecachedPaths(reopened)).not.toContain('/e2e-app-v2.js');
  });

  test('a login page served instead of the files (expired session) fails the update; nothing changes', async ({
    page,
    request
  }) => {
    await installV1(page);
    await setFaults(request, { redirectAfter: 0 });

    await setScenario(request, 'v2');
    await page.reload();
    await page.waitForTimeout(8_000);

    expect(await hasWaitingVersion(page)).toBe(false);
    await resetFaults(request);
    const reopened = await closeAllPagesAndReopen(page);
    expect((await readSnapshot(reopened)).appVersion).toBe('1.0.0-e2e');
  });

  test('a candidate file that fails to download (404) fails the update; the active version stays complete', async ({
    page,
    request
  }) => {
    await installV1(page);

    await setScenario(request, 'v2-broken');
    await page.reload();
    await page.waitForTimeout(8_000);

    expect(await hasWaitingVersion(page)).toBe(false);
    const reopened = await closeAllPagesAndReopen(page);
    const snapshot = await readSnapshot(reopened);
    expect(snapshot.appVersion).toBe('1.0.0-e2e');
    expect(snapshot.offlineReady).toBe(true);
  });
});
