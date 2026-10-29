import { expect, test } from '@playwright/test';
import {
  getRequestLog,
  readSnapshot,
  resetFaults,
  setAuthenticated,
  setScenario,
  waitForFirstInstall
} from './update-flow.helpers';

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
    expect(snapshot.offlineReady).toBe(true);

    // No auto-install/update prompt should ever be shown once the app is up to date.
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('never installs the app or imports catalogs for an unauthenticated user', async ({ page, request }) => {
    await setScenario(request, 'v1');
    await setAuthenticated(request, false);

    await page.goto('/');
    // authGuard redirects an unauthenticated user to /login instead of installing anything.
    await expect(page).toHaveURL(/\/login/);

    const snapshot = await readSnapshot(page);
    expect(snapshot.offlineReady).toBe(false);
    expect(snapshot.cableHash).toBeNull();
    expect(snapshot.cableName).toBeNull();
  });
});

test.describe('catalog resilience', () => {
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
    // Start N prefetches the file; start N+1 tries to import it, rejects the mismatch, retries once, gives up.
    await page.reload();
    await page.waitForTimeout(3000);
    await page.reload();
    await page.waitForTimeout(3000);

    const afterSnapshot = await readSnapshot(page);
    expect(afterSnapshot.cableName).toBe('E2E_CABLE_V1');
    expect(afterSnapshot.cableHash).toBe(beforeSnapshot.cableHash);
  });
});

test.describe('catalogs update independently and minimally', () => {
  test('downloads only the catalog file whose hash changed', async ({ page, request }) => {
    await setScenario(request, 'v1');
    await setAuthenticated(request, true);
    await page.goto('/');
    // First install imports every catalog once (all hashes are missing from metadata).
    await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');
    await resetFaults(request);

    // Only cables.csv changes between v1 and v2; every other catalog hash is unchanged.
    await setScenario(request, 'v2');
    await page.reload();
    await expect
      .poll(async () => (await getRequestLog(request)).filter((path) => path.startsWith('/data/')), {
        timeout: 30_000
      })
      .toHaveLength(1);

    const catalogRequests = (await getRequestLog(request)).filter((path) => path.startsWith('/data/'));
    expect(catalogRequests[0]).toMatch(/^\/data\/cables\.csv\?v=[0-9a-f]{64}$/);
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
      await expect(page.locator('router-outlet').first()).toBeAttached();

      const deepLinkResponse = await page.goto('/admin');
      expect(deepLinkResponse?.ok()).toBeTruthy();
      // The admin page renders from the cached shell; the version check button is online-only by design.
      await expect(page.locator('main table')).toBeVisible();
      await expect(page.getByTestId('check-app-version-btn')).toBeHidden();
    } finally {
      await context.setOffline(false);
    }
  });
});
