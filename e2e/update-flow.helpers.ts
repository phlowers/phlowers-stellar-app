import { APIRequestContext, expect, Page } from '@playwright/test';
import { Snapshot } from './update-flow.interfaces';

/**
 * Reads the app/catalog state through observable behavior only (running version,
 * cached shell, IndexedDB), independently of the service worker implementation.
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
    // The sim server stamps the scenario version into the served JS: scan the scripts this document loaded.
    const scope = globalThis as unknown as { __e2eRunningVersion?: string };
    if (!scope.__e2eRunningVersion) {
      const scriptUrls = new Set(
        performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((url) => url.startsWith(location.origin) && new URL(url).pathname.endsWith('.js'))
      );
      for (const url of scriptUrls) {
        // A chunk of a version being replaced may already be gone: skip it, the next poll retries.
        const body = await fetch(url)
          .then((response) => (response.ok ? response.text() : ''))
          .catch(() => '');
        const match = /"(\d+\.\d+\.\d+-e2e(?:-[a-z]+)?)"/.exec(body);
        if (match) {
          scope.__e2eRunningVersion = match[1];
          break;
        }
      }
    }
    const appVersion = scope.__e2eRunningVersion ?? null;
    const offlineReady = (await caches.match('/index.html', { ignoreSearch: true })) !== undefined;

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
      offlineReady,
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
  await expect.poll(async () => (await readSnapshot(page)).offlineReady, { timeout: 30_000 }).toBe(true);
  await expect.poll(async () => (await readSnapshot(page)).appVersion, { timeout: 30_000 }).toBe(expectedVersion);
  await expect.poll(async () => (await readSnapshot(page)).cableName, { timeout: 30_000 }).toBe(expectedCableName);
  // A cached shell is not an atomic completion signal: wait until the precache stops downloading.
  await waitForDownloadsToSettle(page.request);
}

/** Resolves once the sim server has received no new app file request for `quietMs`. */
export async function waitForDownloadsToSettle(request: APIRequestContext, quietMs = 2_000): Promise<void> {
  let previousCount = -1;
  await expect
    .poll(
      async () => {
        const count = (await getRequestLog(request)).length;
        const settled = count === previousCount;
        previousCount = count;
        return settled;
      },
      { timeout: 60_000, intervals: [quietMs] }
    )
    .toBe(true);
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

/** Sets the downlink (Mbit/s) seen by the service worker network rule (and by the page, when given). */
export async function setDownlink(request: APIRequestContext, downlinkMbps: number, page?: Page): Promise<void> {
  const response = await request.post(`/__e2e/network?downlink=${downlinkMbps}`);
  expect(response.ok()).toBeTruthy();
  if (page) {
    await page.addInitScript((downlink) => {
      Object.defineProperty(navigator, 'connection', {
        configurable: true,
        value: Object.assign(new EventTarget(), { downlink })
      });
    }, downlinkMbps);
  }
}

/** Resolves once a downloaded version waits for activation (all windows closed). */
export async function waitForWaitingVersion(page: Page, timeout = 60_000): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const registration = await navigator.serviceWorker.getRegistration();
          return Boolean(registration?.waiting);
        }),
      { timeout }
    )
    .toBe(true);
}

/**
 * Closes every page of the context, then opens `url` in a new one: the only way a waiting service worker
 * activates (a reload keeps the current version).
 */
export async function closeAllPagesAndReopen(page: Page, url = '/'): Promise<Page> {
  const context = page.context();
  for (const openPage of context.pages()) {
    await openPage.close();
  }
  const reopened = await context.newPage();
  await reopened.goto(url);
  return reopened;
}
