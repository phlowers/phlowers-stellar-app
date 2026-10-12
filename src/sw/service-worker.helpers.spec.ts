import { BACKGROUND_DOWNLOAD_MIN_DOWNLINK_MBPS } from '@services/app-update/network-rule.constantes';
import { USER_DATA_STORAGE_RESERVE_BYTES } from '@services/app-update/storage-rule.constantes';
import type { SizedManifestEntry } from '@services/app-update/storage-rule.interfaces';
import { SHELL_URL } from './service-worker.constantes';
import {
  createSafeResponsePlugin,
  createShellNavigationRoute,
  createSwLogger,
  deleteLegacyCaches,
  InstallRefusedError,
  isQuotaExceededError,
  postToClients,
  removeEntriesAddedSince,
  runActivation,
  runGuardedInstall,
  toPrecacheEntry
} from './service-worker.helpers';
import type { GuardedInstallDeps, PrecacheControllerLike, SwClients } from './service-worker.interfaces';

const MB = 1024 * 1024;
const ORIGIN = 'https://stellar.test';

/** In-memory Cache keyed by absolute URL. */
function createFakeCache(initialUrls: string[] = []): Cache & { urls: () => string[] } {
  const entries = new Map<string, Response>(initialUrls.map((url) => [url, new Response('cached')]));
  const toUrl = (request: RequestInfo | URL): string =>
    new URL(typeof request === 'string' ? request : request instanceof URL ? request.href : request.url, ORIGIN).href;
  return {
    urls: () => [...entries.keys()],
    match: vi.fn(async (request: RequestInfo | URL) => entries.get(toUrl(request))),
    put: vi.fn(async (request: RequestInfo | URL, response: Response) => {
      entries.set(toUrl(request), response);
    }),
    keys: vi.fn(async () => [...entries.keys()].map((url) => ({ url }) as Request)),
    delete: vi.fn(async (request: RequestInfo | URL) => entries.delete(toUrl(request)))
  } as unknown as Cache & { urls: () => string[] };
}

function createFakeCacheStorage(names: string[], cache: Cache = createFakeCache()): CacheStorage {
  const existing = new Set(names);
  return {
    keys: vi.fn(async () => [...existing]),
    delete: vi.fn(async (name: string) => existing.delete(name)),
    open: vi.fn(async () => cache)
  } as unknown as CacheStorage;
}

function createFakeClients(): SwClients & { postMessage: ReturnType<typeof vi.fn> } {
  const postMessage = vi.fn();
  return {
    postMessage,
    matchAll: vi.fn(async () => [{ postMessage }]),
    claim: vi.fn(async () => undefined)
  };
}

function createController(install: () => Promise<unknown> = async () => ({})): PrecacheControllerLike {
  return {
    install: vi.fn(install),
    activate: vi.fn(async () => ({ deletedCacheRequests: [] })),
    getCacheKeyForURL: vi.fn((url: string) => `${ORIGIN}${url}?__WB_REVISION__=r`),
    strategy: { cacheName: 'workbox-precache-v2-test' }
  } as unknown as PrecacheControllerLike;
}

const ENTRIES: SizedManifestEntry[] = [
  { url: '/index.html', revision: 'r', sizeBytes: 10 * MB },
  { url: '/main.js', revision: 'r', sizeBytes: 20 * MB }
];

function createDeps(overrides: Partial<GuardedInstallDeps> = {}): GuardedInstallDeps {
  return {
    event: {} as ExtendableEvent,
    controller: createController(),
    entries: ENTRIES,
    connection: { downlink: 8 },
    storage: { estimate: async () => ({ usage: 0, quota: 1000 * MB }) },
    caches: createFakeCacheStorage([]),
    clients: createFakeClients(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    ...overrides
  };
}

describe('service worker helpers', () => {
  beforeAll(() => {
    (self as unknown as Record<string, unknown>)['__WB_DISABLE_DEV_LOGS'] = true;
  });

  describe('messaging', () => {
    it('posts to every window client, controlled or not', async () => {
      const clients = createFakeClients();

      await postToClients(clients, { type: 'SW_LOG', level: 'info', message: 'hello' });

      expect(clients.matchAll).toHaveBeenCalledWith({ type: 'window', includeUncontrolled: true });
      expect(clients.postMessage).toHaveBeenCalledWith({ type: 'SW_LOG', level: 'info', message: 'hello' });
    });

    it('relays logs to the pages with their level', async () => {
      const clients = createFakeClients();
      const logger = createSwLogger(clients);

      logger.info('i');
      logger.warn('w');
      logger.error('e');
      await vi.waitFor(() => expect(clients.postMessage).toHaveBeenCalledTimes(3));

      expect(clients.postMessage).toHaveBeenCalledWith({ type: 'SW_LOG', level: 'warn', message: 'w' });
      expect(clients.postMessage).toHaveBeenCalledWith({ type: 'SW_LOG', level: 'error', message: 'e' });
    });

    it('never throws when relaying a log fails', async () => {
      const clients = createFakeClients();
      vi.mocked(clients.matchAll).mockRejectedValue(new Error('gone'));

      expect(() => createSwLogger(clients).info('x')).not.toThrow();
    });
  });

  describe('toPrecacheEntry', () => {
    it('keeps url, revision and integrity and drops the size', () => {
      expect(toPrecacheEntry({ url: '/a.js', revision: 'abc', integrity: 'sha256-x', sizeBytes: 12 })).toEqual({
        url: '/a.js',
        revision: 'abc',
        integrity: 'sha256-x'
      });
      expect(toPrecacheEntry({ url: '/b.js', revision: null })).toEqual({ url: '/b.js', revision: null });
    });
  });

  describe('createSafeResponsePlugin', () => {
    const cacheWillUpdate = createSafeResponsePlugin().cacheWillUpdate!;
    const call = (response: Partial<Response>) =>
      cacheWillUpdate({
        response: response as Response,
        request: {} as Request,
        event: {} as ExtendableEvent,
        state: {}
      });

    it('accepts an OK response that was not redirected', async () => {
      const response = { ok: true, redirected: false };
      expect(await call(response)).toBe(response);
    });

    it('refuses a redirected response (login page)', async () => {
      expect(await call({ ok: true, redirected: true })).toBeNull();
    });

    it('refuses a non-OK response', async () => {
      expect(await call({ ok: false, redirected: false, status: 404 })).toBeNull();
    });
  });

  describe('createShellNavigationRoute', () => {
    const handler = vi.fn();
    const route = createShellNavigationRoute(handler);
    const matches = (path: string, mode: RequestMode = 'navigate'): boolean =>
      Boolean(
        route.match({
          url: new URL(path, ORIGIN),
          request: { mode } as Request,
          event: {} as ExtendableEvent,
          sameOrigin: true
        })
      );

    it('serves the shell handler for the root and deep links', () => {
      expect(matches('/')).toBe(true);
      expect(matches('/studies/42')).toBe(true);
      expect(route.handler).toEqual({ handle: handler });
    });

    it.each([
      '/auth/relogin',
      '/auth',
      '/docs/x',
      '/data/cables.csv',
      '/assets_list.json',
      '/catalog-manifest.json',
      '/version.json',
      '/assets/config/app-config.json'
    ])('never intercepts the navigation to %s', (path) => {
      expect(matches(path)).toBe(false);
    });

    it('ignores non-navigation requests', () => {
      expect(matches('/studies/42', 'cors')).toBe(false);
    });

    it('binds the shell to /index.html', () => {
      expect(SHELL_URL).toBe('/index.html');
    });
  });

  describe('cache maintenance', () => {
    it('deletes only the caches of the previous update system', async () => {
      const cacheStorage = createFakeCacheStorage([
        'app-assets',
        'app-assets-v-abc1234',
        'app-assets-control',
        'workbox-precache-v2-x',
        'stellar-catalogs-v1'
      ]);

      const deleted = await deleteLegacyCaches(cacheStorage);

      expect(deleted).toEqual(['app-assets', 'app-assets-v-abc1234', 'app-assets-control']);
      expect(await cacheStorage.keys()).toEqual(['workbox-precache-v2-x', 'stellar-catalogs-v1']);
    });

    it('removes only the entries added since a snapshot', async () => {
      const cache = createFakeCache([`${ORIGIN}/a`]);
      const before = new Set(cache.urls());
      await cache.put(`${ORIGIN}/b`, new Response('b'));

      expect(await removeEntriesAddedSince(cache, before)).toBe(1);
      expect(cache.urls()).toEqual([`${ORIGIN}/a`]);
    });

    it('recognizes a quota error by its name', () => {
      expect(isQuotaExceededError(new DOMException('full', 'QuotaExceededError'))).toBe(true);
      expect(isQuotaExceededError(new Error('other'))).toBe(false);
      expect(isQuotaExceededError(null)).toBe(false);
    });
  });

  describe('runGuardedInstall', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no network in tests'));
    });

    afterEach(() => {
      fetchSpy.mockRestore();
    });

    it('fails before any download when the downlink is below the threshold', async () => {
      const deps = createDeps({ connection: { downlink: 1 } });

      await expect(runGuardedInstall(deps)).rejects.toMatchObject({ reason: 'downlink-below-threshold' });

      expect(deps.controller.install).not.toHaveBeenCalled();
      expect(deps.caches.open).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect((deps.clients as ReturnType<typeof createFakeClients>).postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SW_INSTALL_REFUSED', reason: 'downlink-below-threshold', downlinkMbps: 1 })
      );
    });

    it.each([
      [undefined, 'api-unavailable'],
      [{ downlink: 50, saveData: true }, 'save-data']
    ])('refuses with connection %o (%s)', async (connection, reason) => {
      const deps = createDeps({ connection });

      await expect(runGuardedInstall(deps)).rejects.toBeInstanceOf(InstallRefusedError);
      await expect(runGuardedInstall(deps)).rejects.toMatchObject({ reason });
      expect(deps.controller.install).not.toHaveBeenCalled();
    });

    it('starts the precache when the downlink reaches the threshold', async () => {
      const deps = createDeps({ connection: { downlink: BACKGROUND_DOWNLOAD_MIN_DOWNLINK_MBPS + 3 } });

      await runGuardedInstall(deps);

      expect(deps.controller.install).toHaveBeenCalledWith(deps.event);
      expect(deps.logger.info).toHaveBeenCalledWith(expect.stringContaining(`${30 * MB} bytes`));
    });

    it('fails before any download when the free space does not cover the missing files and the reserve', async () => {
      const quota = 30 * MB + USER_DATA_STORAGE_RESERVE_BYTES - 1;
      const deps = createDeps({ storage: { estimate: async () => ({ usage: 0, quota }) } });

      await expect(runGuardedInstall(deps)).rejects.toMatchObject({ reason: 'storage-insufficient' });

      expect(deps.controller.install).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect((deps.clients as ReturnType<typeof createFakeClients>).postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SW_INSTALL_REFUSED',
          reason: 'storage-insufficient',
          requiredBytes: 30 * MB + USER_DATA_STORAGE_RESERVE_BYTES,
          freeBytes: quota
        })
      );
    });

    it('only counts the entries missing from the precache', async () => {
      const cache = createFakeCache([`${ORIGIN}/main.js?__WB_REVISION__=r`]);
      const quota = 10 * MB + USER_DATA_STORAGE_RESERVE_BYTES;
      const deps = createDeps({
        caches: createFakeCacheStorage([], cache),
        storage: { estimate: async () => ({ usage: 0, quota }) }
      });

      await runGuardedInstall(deps);

      expect(deps.controller.install).toHaveBeenCalled();
    });

    it('allows the installation when the storage estimate is unavailable', async () => {
      const deps = createDeps({ storage: undefined });

      await runGuardedInstall(deps);

      expect(deps.controller.install).toHaveBeenCalled();
    });

    it('allows the installation when the storage estimate rejects', async () => {
      const deps = createDeps({ storage: { estimate: () => Promise.reject(new Error('denied')) } });

      await runGuardedInstall(deps);

      expect(deps.controller.install).toHaveBeenCalled();
    });

    it('removes the entries written by the attempt when the quota is exceeded', async () => {
      const cache = createFakeCache([`${ORIGIN}/existing.js`]);
      const controller = createController(async () => {
        await cache.put(`${ORIGIN}/index.html`, new Response('1'));
        await cache.put(`${ORIGIN}/main.js`, new Response('2'));
        throw new DOMException('full', 'QuotaExceededError');
      });
      const deps = createDeps({ controller, caches: createFakeCacheStorage([], cache) });

      await expect(runGuardedInstall(deps)).rejects.toMatchObject({ reason: 'storage-insufficient' });

      expect(cache.urls()).toEqual([`${ORIGIN}/existing.js`]);
      expect((deps.clients as ReturnType<typeof createFakeClients>).postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SW_INSTALL_REFUSED', reason: 'storage-insufficient' })
      );
    });

    it('keeps the downloaded entries on any other failure so the next attempt resumes', async () => {
      const cache = createFakeCache();
      const failure = new Error('bad-precaching-response');
      const controller = createController(async () => {
        await cache.put(`${ORIGIN}/index.html`, new Response('1'));
        throw failure;
      });
      const deps = createDeps({ controller, caches: createFakeCacheStorage([], cache) });

      await expect(runGuardedInstall(deps)).rejects.toBe(failure);

      expect(cache.urls()).toEqual([`${ORIGIN}/index.html`]);
      expect(deps.logger.error).toHaveBeenCalledWith('Installation failed: bad-precaching-response');
    });
  });

  describe('runActivation', () => {
    it('cleans outdated precache entries and legacy caches, then claims the clients', async () => {
      const controller = createController();
      const caches = createFakeCacheStorage(['app-assets-v-abc1234', 'app-assets-control', 'workbox-precache-v2-x']);
      const clients = createFakeClients();
      const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      const event = {} as ExtendableEvent;

      await runActivation({ event, controller, caches, clients, logger });

      expect(controller.activate).toHaveBeenCalledWith(event);
      expect(await caches.keys()).toEqual(['workbox-precache-v2-x']);
      expect(clients.claim).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Legacy caches deleted: app-assets-v-abc1234, app-assets-control');
    });

    it('logs nothing when there is no legacy cache', async () => {
      const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

      await runActivation({
        event: {} as ExtendableEvent,
        controller: createController(),
        caches: createFakeCacheStorage([]),
        clients: createFakeClients(),
        logger
      });

      expect(logger.info).not.toHaveBeenCalled();
    });
  });
});
