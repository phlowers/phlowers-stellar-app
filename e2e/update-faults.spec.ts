import { expect, test } from '@playwright/test';
import {
  readSnapshot,
  resetFaults,
  setAuthenticated,
  setFaults,
  setScenario,
  waitForDownloadsToSettle,
  waitForFirstInstall,
  waitForWaitingVersion
} from './update-flow.helpers';

/**
 * Network and cache faults during installation or update (Workbox). The update lifecycle itself (waiting
 * version, integrity, interrupted download) is covered by update-lifecycle.spec.ts.
 */
test.describe('update faults', () => {
  test.beforeEach(async ({ request }) => {
    await resetFaults(request);
    await setScenario(request, 'v1');
    await setAuthenticated(request, true);
  });

  test.afterEach(async ({ request }) => {
    await resetFaults(request);
    await setScenario(request, 'v1');
  });

  test('a transient 502 only postpones the update to the next check', async ({ page, request }) => {
    await page.goto('/');
    await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');
    await setFaults(request, { fail: '/e2e-app-v2.js', status: 502, count: 1 });

    await setScenario(request, 'v2');
    await page.reload();
    await page.waitForTimeout(3_000);
    // The first attempt failed on the 502: the next registration check retries.
    await page.reload();

    await waitForWaitingVersion(page);
  });

  test('cleared site data (caches and service worker) is fully reinstalled without any prompt', async ({
    page,
    request
  }) => {
    await page.goto('/');
    await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');

    // What the browser's "clear site data" does to the update system.
    await page.evaluate(async () => {
      await Promise.all((await caches.keys()).map((name) => caches.delete(name)));
      await Promise.all(
        (await navigator.serviceWorker.getRegistrations()).map((registration) => registration.unregister())
      );
    });
    expect((await readSnapshot(page)).offlineReady).toBe(false);
    await page.reload();

    await expect.poll(async () => (await readSnapshot(page)).offlineReady, { timeout: 30_000 }).toBe(true);
    await expect.poll(async () => (await readSnapshot(page)).appVersion, { timeout: 30_000 }).toBe('1.0.0-e2e');
    await waitForDownloadsToSettle(request);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
