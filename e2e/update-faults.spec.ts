import { APIRequestContext, expect, Page, test } from '@playwright/test';
import {
  getRequestLog,
  readSnapshot,
  resetFaults,
  setAuthenticated,
  setFaults,
  setScenario,
  waitForFirstInstall
} from './update-flow.helpers';

/**
 * Reproduction tests for the update hangs documented in plan.md (RC1-RC6) and the
 * resume after an interrupted run (D2). They pass since phases 3-5.
 */

const UPDATE_DIALOG_BUTTONS = ['update-now-btn', 'update-later-btn'];

/** The update dialog is back to its idle state: the user can act on it again. */
async function expectDialogRecovered(page: Page, timeout: number): Promise<void> {
  await expect(
    page.getByTestId(UPDATE_DIALOG_BUTTONS[0]).or(page.getByTestId(UPDATE_DIALOG_BUTTONS[1])).first()
  ).toBeVisible({
    timeout
  });
}

/** Installs v1, publishes `scenario`, reloads and confirms the update popup (button hidden = loading). */
async function startUpdateTo(page: Page, request: APIRequestContext, scenario: string): Promise<void> {
  await setScenario(request, 'v1');
  await setAuthenticated(request, true);
  await page.goto('/');
  await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');

  await setScenario(request, scenario);
  await page.reload();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByTestId('update-now-btn').click();
  await expect(page.getByTestId('update-now-btn')).toBeHidden();
}

test.describe('update hangs reproduction', () => {
  test.beforeEach(async ({ request }) => {
    await resetFaults(request);
  });

  test.afterEach(async ({ request }) => {
    await resetFaults(request);
    await setScenario(request, 'v1');
  });

  test('RC1: leaves the loading state when the service worker is stopped mid-download', async ({
    page,
    request,
    context
  }) => {
    await startUpdateTo(page, request, 'v2-slow');

    const cdp = await context.newCDPSession(page);
    await cdp.send('ServiceWorker.enable');
    await cdp.send('ServiceWorker.stopAllWorkers');

    await expectDialogRecovered(page, 20_000);
    expect((await readSnapshot(page)).appVersion).toBe('1.0.0-e2e');
  });

  test('D2: retrying after the service worker was stopped resumes without downloading everything again', async ({
    page,
    request,
    context
  }) => {
    test.setTimeout(120_000);
    await startUpdateTo(page, request, 'v2-slow');
    const startOfRun = (await getRequestLog(request)).length;
    await expect
      .poll(async () => (await getRequestLog(request)).length - startOfRun, { timeout: 30_000 })
      .toBeGreaterThan(30);

    const cdp = await context.newCDPSession(page);
    await cdp.send('ServiceWorker.enable');
    await cdp.send('ServiceWorker.stopAllWorkers');
    await expectDialogRecovered(page, 20_000);

    const totalFiles = ((await (await request.get('/assets_list.json')).json()) as { files: string[] }).files.length;
    const beforeRetry = (await getRequestLog(request)).length;
    await page.getByTestId('update-now-btn').click();
    await expect.poll(async () => (await readSnapshot(page)).appVersion, { timeout: 90_000 }).toBe('2.0.0-e2e-slow');

    const retryRequests = (await getRequestLog(request)).length - beforeRetry;
    expect(retryRequests).toBeLessThan(totalFiles - 20);
  });

  test('RC2: a stalled file ends the update with an error within the per-file timeout', async ({ page, request }) => {
    test.setTimeout(150_000);
    await setFaults(request, { stall: '/e2e-app-v2.js' });
    await startUpdateTo(page, request, 'v2');

    await expectDialogRecovered(page, 90_000);
    const snapshot = await readSnapshot(page);
    expect(snapshot.appVersion).toBe('1.0.0-e2e');
    expect(snapshot.versionedCacheNames).toHaveLength(1);
  });

  test('RC2: a transient 502 does not fail the update', async ({ page, request }) => {
    await setFaults(request, { fail: '/e2e-app-v2.js', status: 502, count: 2 });
    await startUpdateTo(page, request, 'v2');

    await expect.poll(async () => (await readSnapshot(page)).appVersion, { timeout: 30_000 }).toBe('2.0.0-e2e');
  });

  test('RC3: detects a new build that has the same git_hash and version', async ({ page, request }) => {
    await setScenario(request, 'v1');
    await setAuthenticated(request, true);
    await page.goto('/');
    await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');

    await setScenario(request, 'v2-samehash');
    await page.reload();

    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('RC6: another open tab is reloaded once the update is applied', async ({ page, request, context }) => {
    await setScenario(request, 'v1');
    await setAuthenticated(request, true);
    await page.goto('/');
    await waitForFirstInstall(page, '1.0.0-e2e', 'E2E_CABLE_V1');

    const otherTab = await context.newPage();
    await otherTab.goto('/');
    await otherTab.evaluate(() => ((globalThis as Record<string, unknown>)['__tabMarker'] = true));

    await setScenario(request, 'v2');
    await page.reload();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByTestId('update-now-btn').click();
    await expect.poll(async () => (await readSnapshot(page)).appVersion, { timeout: 30_000 }).toBe('2.0.0-e2e');

    // A reloaded page has lost the marker set on the old document.
    await expect
      .poll(() => otherTab.evaluate(() => (globalThis as Record<string, unknown>)['__tabMarker']), {
        timeout: 15_000
      })
      .toBeUndefined();
  });
});
