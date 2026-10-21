import { expect, Page, test } from '@playwright/test';
import {
  getRequestLog,
  readSnapshot,
  resetFaults,
  setAuthenticated,
  setDownlink,
  setFaults,
  setScenario,
  waitForFirstInstall
} from './update-flow.helpers';

/** Service worker registration state, read from the page. */
function readRegistration(page: Page): Promise<{ active: boolean; waiting: boolean; installing: boolean }> {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return {
      active: Boolean(registration?.active),
      waiting: Boolean(registration?.waiting),
      installing: Boolean(registration?.installing)
    };
  });
}

/**
 * Console output of the page. The e2e session never reaches the logged layout (the app stays on /login), so the
 * offline indicator is not rendered: the refusal relayed by the service worker is asserted on its log instead.
 */
function collectPageLogs(page: Page): string[] {
  const logs: string[] = [];
  page.on('console', (message) => logs.push(message.text()));
  return logs;
}

test.describe('network rule (downlink)', () => {
  test.beforeEach(async ({ request }) => {
    await resetFaults(request);
    await setScenario(request, 'v1');
    await setAuthenticated(request, true);
  });

  test.afterEach(async ({ request }) => {
    await setDownlink(request, 10);
  });

  test('installs the application in the background when the downlink reaches the threshold', async ({
    page,
    request
  }) => {
    await setDownlink(request, 8, page);
    await page.goto('/');

    await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');

    expect((await readRegistration(page)).active).toBe(true);
    expect(await getRequestLog(request)).toContain('/index.html');
  });

  test('downloads nothing in the background below the threshold', async ({ page, request }) => {
    const pageLogs = collectPageLogs(page);
    await setDownlink(request, 1, page);
    await page.goto('/');

    // Give the service worker time to (wrongly) start precaching.
    await page.waitForTimeout(5_000);

    const snapshot = await readSnapshot(page);
    expect(snapshot.offlineReady).toBe(false);
    expect((await readRegistration(page)).active).toBe(false);
    // The page itself still loads what it needs online (screens, Pyodide): only the precache must stay empty.
    const precachedEntries = await page.evaluate(async () => {
      let count = 0;
      for (const name of await caches.keys()) {
        if (name.startsWith('workbox-precache')) {
          count += (await (await caches.open(name)).keys()).length;
        }
      }
      return count;
    });
    expect(precachedEntries).toBe(0);
    // The page received the refusal that drives the "waiting for a sufficient network" indicator (unit-tested).
    expect(pageLogs.some((text) => text.includes('Installation refused (downlink-below-threshold)'))).toBe(true);
  });

  test('installs once the downlink rises above the threshold', async ({ page, request }) => {
    await setDownlink(request, 1, page);
    await page.goto('/');
    await page.waitForTimeout(3_000);
    expect((await readRegistration(page)).active).toBe(false);

    await setDownlink(request, 8);
    // The browser retries the installation at the next registration check (navigation).
    await page.reload();

    await expect.poll(async () => (await readRegistration(page)).active, { timeout: 60_000 }).toBe(true);
    await expect.poll(async () => (await readSnapshot(page)).offlineReady, { timeout: 30_000 }).toBe(true);
  });
});

/** Versioned catalog URLs present in the service worker catalog cache. */
function readCachedCatalogs(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const cache = await caches.open('stellar-catalogs-v1');
    return (await cache.keys()).map((request) => {
      const url = new URL(request.url);
      return url.pathname + url.search;
    });
  });
}

test.describe('offline, expired session and catalogs (Workbox)', () => {
  test.beforeEach(async ({ request }) => {
    await resetFaults(request);
    await setScenario(request, 'v1');
    await setAuthenticated(request, true);
    await setDownlink(request, 10);
  });

  test.afterEach(async ({ request, context }) => {
    await context.setOffline(false);
    await resetFaults(request);
    await setScenario(request, 'v1');
    await setAuthenticated(request, true);
  });

  test('opens offline from the cache, quickly, with Pyodide available', async ({ page, context }) => {
    await page.goto('/');
    await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');

    await context.setOffline(true);
    const startedAt = Date.now();
    const response = await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const elapsedMs = Date.now() - startedAt;

    expect(response?.ok()).toBeTruthy();
    expect(response?.fromServiceWorker()).toBe(true);
    expect(elapsedMs).toBeLessThan(2_000);
    const pyodideCached = await page.evaluate(async () =>
      Promise.all(
        ['/pyodide/pyodide.asm.wasm', '/pyodide/python_stdlib.zip'].map(
          async (path) => (await caches.match(path, { ignoreSearch: true })) !== undefined
        )
      )
    );
    expect(pyodideCached).toEqual([true, true]);
  });

  test('with an expired session, opens from the cache and /auth/* reaches the server (never intercepted)', async ({
    page,
    request
  }) => {
    await page.goto('/');
    await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');

    await setAuthenticated(request, false);
    const authResponses: { url: string; fromServiceWorker: boolean }[] = [];
    page.on('response', (response) => {
      if (new URL(response.url()).pathname.startsWith('/auth/')) {
        authResponses.push({ url: response.url(), fromServiceWorker: response.fromServiceWorker() });
      }
    });
    const shell = await page.goto('/');

    expect(shell?.fromServiceWorker()).toBe(true);
    await expect.poll(() => authResponses.length, { timeout: 15_000 }).toBeGreaterThan(0);
    expect(authResponses.every((response) => !response.fromServiceWorker)).toBe(true);
  });

  test('a raw 401 on navigation is never seen while the shell is cached', async ({ page, request }) => {
    await page.goto('/');
    await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');
    await setFaults(request, { navigationStatus: 401 });

    const response = await page.goto('/studies/42');

    expect(response?.fromServiceWorker()).toBe(true);
    expect(new URL(page.url()).pathname).toBe('/studies/42');
  });

  test('without a cached shell, a raw 401 on navigation is redirected to /auth/relogin', async ({ page, request }) => {
    await page.goto('/');
    await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');
    await page.evaluate(async () => {
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        await cache.delete('/index.html', { ignoreSearch: true });
      }
    });
    await setFaults(request, { navigationStatus: 401 });

    await page.goto('/studies/42');

    expect(new URL(page.url()).pathname).toBe('/auth/relogin');
    await expect(page.locator('body')).toHaveText('E2E relogin');
  });

  test('a new catalog is prefetched in the background, then imported at the next start from the cache', async ({
    page,
    request
  }) => {
    await page.goto('/');
    await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');

    // Start N: the new cables.csv is only prefetched; the data in use does not change.
    await setScenario(request, 'v2');
    const manifest = (await (await request.get('/catalog-manifest.json')).json()) as {
      data_hashes: Record<string, string>;
    };
    const newCablesUrl = `/data/cables.csv?v=${manifest.data_hashes['cables.csv']}`;
    await page.reload();
    await expect.poll(async () => readCachedCatalogs(page), { timeout: 30_000 }).toContain(newCablesUrl);
    expect((await readSnapshot(page)).cableName).toBe('E2E_CABLE_V1');

    // Start N+1: imported from the cache, no network request for the file.
    await resetFaults(request);
    await page.reload();
    await expect.poll(async () => (await readSnapshot(page)).cableName, { timeout: 30_000 }).toBe('E2E_CABLE_V2');
    expect((await getRequestLog(request)).filter((path) => path.startsWith('/data/cables.csv'))).toEqual([]);
  });

  test('a corrupted cached catalog is evicted and downloaded once more from the network', async ({ page, request }) => {
    await page.goto('/');
    await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');
    await setScenario(request, 'v2');
    const manifest = (await (await request.get('/catalog-manifest.json')).json()) as {
      data_hashes: Record<string, string>;
    };
    const url = `/data/cables.csv?v=${manifest.data_hashes['cables.csv']}`;
    await page.evaluate(async (corruptedUrl) => {
      const cache = await caches.open('stellar-catalogs-v1');
      await cache.put(corruptedUrl, new Response('name,data_source,section,diameter\nCORRUPTED,e2e,1,1'));
    }, url);
    await resetFaults(request);

    await page.reload();

    await expect.poll(async () => (await readSnapshot(page)).cableName, { timeout: 30_000 }).toBe('E2E_CABLE_V2');
    expect((await getRequestLog(request)).filter((path) => path === url)).toHaveLength(1);
  });

  test('not enough storage: nothing is downloaded, the user is told, the installation runs once space is freed', async ({
    page,
    context
  }) => {
    const cdp = await context.newCDPSession(page);
    const pageLogs = collectPageLogs(page);
    const origin = new URL(test.info().project.use.baseURL!).origin;
    // Below the precache (~73 MB) plus the 100 MB user data reserve.
    await cdp.send('Storage.overrideQuotaForOrigin', { origin, quotaSize: 50 * 1024 * 1024 });
    await page.goto('/');

    await expect(page.getByText('Not enough storage space').first()).toBeVisible({ timeout: 30_000 });
    expect(pageLogs.some((text) => text.includes('Installation refused (storage-insufficient)'))).toBe(true);
    expect((await readRegistration(page)).active).toBe(false);

    await cdp.send('Storage.overrideQuotaForOrigin', { origin });
    await page.reload();
    await expect.poll(async () => (await readRegistration(page)).active, { timeout: 60_000 }).toBe(true);
  });
});
