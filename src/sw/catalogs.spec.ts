import { Route } from 'workbox-routing';
import { CATALOG_CACHE_NAME } from './service-worker.constantes';
import {
  createCatalogRoute,
  createCatalogStrategy,
  isPrefetchCatalogsMessage,
  isVersionedCatalogUrl,
  prefetchCatalogs
} from './catalogs';
import type { CatalogStrategyLike, PrefetchCatalogsDeps } from './service-worker.interfaces';

vi.mock('workbox-expiration', () => ({
  ExpirationPlugin: vi.fn(function () {
    return {};
  })
}));

const ORIGIN = 'https://stellar.test';
const CABLES = `${ORIGIN}/data/cables.csv?v=abc`;
const LINES = `${ORIGIN}/data/lines.csv?v=def`;

class FakeExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void {
    void promise.catch(() => undefined);
  }
}

interface StrategyStep {
  response?: () => Promise<Response> | Response;
  done?: () => Promise<void>;
}

/** Mocks `handleAll`: the response resolves on headers, `done` settles after the body and the cache write. */
function createStrategy(step: (request: Request) => Response | StrategyStep): CatalogStrategyLike {
  return {
    handleAll: vi.fn(({ request }) => {
      const resolved = step(request);
      const { response, done }: StrategyStep = resolved instanceof Response ? { response: () => resolved } : resolved;
      return [Promise.resolve(response?.() ?? new Response('csv')), Promise.resolve(done?.())];
    })
  };
}

function createDeps(overrides: Partial<PrefetchCatalogsDeps> = {}): PrefetchCatalogsDeps {
  return {
    message: { type: 'PREFETCH_CATALOGS', urls: [CABLES, LINES], force: false },
    event: new FakeExtendableEvent('message') as unknown as ExtendableEvent,
    origin: ORIGIN,
    strategy: createStrategy(() => new Response('csv')),
    connection: { downlink: 8 },
    storage: { estimate: async () => ({ usage: 0, quota: 10_000 * 1024 * 1024 }) },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    ...overrides
  };
}

const requestedUrls = (strategy: CatalogStrategyLike): string[] =>
  vi.mocked(strategy.handleAll).mock.calls.map(([options]) => options.request.url);

describe('service worker catalogs', () => {
  beforeAll(() => {
    (self as unknown as Record<string, unknown>)['__WB_DISABLE_DEV_LOGS'] = true;
  });

  describe('isVersionedCatalogUrl', () => {
    it.each([
      ['/data/cables.csv?v=abc', true],
      ['/data/obstacle_configuration.json?v=1', true],
      ['/data/cables.csv', false],
      ['/data/cables.csv?v=', false],
      ['/assets/cables.csv?v=abc', false],
      ['https://other.test/data/cables.csv?v=abc', false]
    ])('%s -> %s', (url, expected) => {
      expect(isVersionedCatalogUrl(new URL(url, ORIGIN), ORIGIN)).toBe(expected);
    });
  });

  describe('createCatalogRoute', () => {
    it('routes only versioned catalog GET requests to the strategy', () => {
      const strategy = createCatalogStrategy();
      const route = createCatalogRoute(ORIGIN, strategy);
      const match = (url: string) =>
        route.match({
          url: new URL(url, ORIGIN),
          request: {} as Request,
          event: {} as ExtendableEvent,
          sameOrigin: true
        });

      expect(route).toBeInstanceOf(Route);
      expect(route.method).toBe('GET');
      expect(route.handler).toBe(strategy);
      expect(match('/data/cables.csv?v=abc')).toBe(true);
      expect(match('/data/cables.csv')).toBe(false);
    });

    it('stores catalogs in the dedicated cache', () => {
      expect(createCatalogStrategy().cacheName).toBe(CATALOG_CACHE_NAME);
    });
  });

  describe('catalog strategy (real CacheFirst)', () => {
    const stored = new Map<string, Response>();
    const cache = {
      put: vi.fn(async (request: Request, response: Response) => {
        stored.set(request.url, response);
      }),
      match: vi.fn(async (request: Request) => stored.get(request.url)?.clone())
    };
    let fetchSpy: ReturnType<typeof vi.spyOn>;

    beforeAll(() => {
      const scope = globalThis as unknown as Record<string, unknown>;
      scope['ExtendableEvent'] = FakeExtendableEvent;
      scope['FetchEvent'] = class FakeFetchEvent extends FakeExtendableEvent {};
      scope['caches'] = {
        open: vi.fn(async () => cache),
        match: vi.fn(async (request: Request) => cache.match(request))
      };
    });

    beforeEach(() => {
      stored.clear();
      cache.put.mockClear();
      fetchSpy = vi.spyOn(globalThis, 'fetch');
    });

    afterEach(() => {
      fetchSpy.mockRestore();
    });

    const handle = (url: string) =>
      createCatalogStrategy().handle({
        request: new Request(url),
        event: new FakeExtendableEvent('fetch') as unknown as ExtendableEvent
      });

    it('serves a second request from the cache without any network request', async () => {
      fetchSpy.mockResolvedValue(new Response('name\nE2E', { status: 200 }));

      await handle(CABLES);
      await vi.waitFor(() => expect(cache.put).toHaveBeenCalledTimes(1));
      const second = await handle(CABLES);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(await second.text()).toBe('name\nE2E');
    });

    it('never writes a redirected response to the catalog cache', async () => {
      // A real redirected response keeps `redirected` on clone(); reproduce that on the fake.
      const redirectedResponse = (): Response => {
        const response = new Response('<html>login</html>', { status: 200 });
        Object.defineProperty(response, 'redirected', { value: true });
        Object.defineProperty(response, 'clone', { value: redirectedResponse });
        return response;
      };
      fetchSpy.mockResolvedValue(redirectedResponse());

      await handle(CABLES);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(cache.put).not.toHaveBeenCalled();
    });
  });

  describe('prefetchCatalogs', () => {
    it('downloads nothing when the network rule refuses and force is false', async () => {
      const deps = createDeps({ connection: { downlink: 1 } });

      expect(await prefetchCatalogs(deps)).toEqual({ refused: 'downlink-below-threshold', cached: [], failed: [] });
      expect(deps.strategy.handleAll).not.toHaveBeenCalled();
    });

    it('downloads when the probe measures enough despite a low downlink estimate', async () => {
      const probe = vi.fn(async () => 30);
      const deps = createDeps({ connection: { downlink: 1 }, probe });

      const result = await prefetchCatalogs(deps);

      expect(probe).toHaveBeenCalledTimes(1);
      expect(result.refused).toBeNull();
    });

    it('does not probe when force is true', async () => {
      const probe = vi.fn(async () => 30);
      const deps = createDeps({
        connection: { downlink: 1 },
        probe,
        message: { type: 'PREFETCH_CATALOGS', urls: [CABLES], force: true }
      });

      await prefetchCatalogs(deps);

      expect(probe).not.toHaveBeenCalled();
    });

    it('downloads the URLs one at a time when force is true, whatever the network', async () => {
      const order: string[] = [];
      const strategy = createStrategy((request) => ({
        response: () => {
          order.push(`headers ${request.url}`);
          return new Response('csv');
        },
        done: async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          order.push(`done ${request.url}`);
        }
      }));
      const deps = createDeps({
        connection: { downlink: 1 },
        strategy,
        message: { type: 'PREFETCH_CATALOGS', urls: [CABLES, LINES], force: true }
      });

      const result = await prefetchCatalogs(deps);

      expect(order).toEqual([`headers ${CABLES}`, `done ${CABLES}`, `headers ${LINES}`, `done ${LINES}`]);
      expect(result).toEqual({ refused: null, cached: [CABLES, LINES], failed: [] });
    });

    it('requests with redirect=error and same-origin credentials', async () => {
      const deps = createDeps();

      await prefetchCatalogs(deps);

      const [options] = vi.mocked(deps.strategy.handleAll).mock.calls[0];
      expect(options.request.redirect).toBe('error');
      expect(options.request.credentials).toBe('same-origin');
      expect(options.event).toBe(deps.event);
    });

    it('ignores URLs that are not same-origin versioned catalogs, and duplicates', async () => {
      const deps = createDeps({
        message: {
          type: 'PREFETCH_CATALOGS',
          urls: [
            '/data/cables.csv?v=abc',
            CABLES,
            '/data/cables.csv',
            'https://evil.test/data/x.csv?v=1',
            '/index.html?v=1'
          ],
          force: false
        }
      });

      await prefetchCatalogs(deps);

      expect(requestedUrls(deps.strategy)).toEqual([CABLES]);
    });

    it('reports failed downloads without stopping the others', async () => {
      const strategy: CatalogStrategyLike = {
        handleAll: vi
          .fn()
          .mockReturnValueOnce([Promise.reject(new TypeError('redirect')), Promise.resolve()])
          .mockReturnValueOnce([Promise.resolve(new Response('', { status: 404 })), Promise.resolve()])
      };
      const deps = createDeps({ strategy });

      expect(await prefetchCatalogs(deps)).toEqual({ refused: null, cached: [], failed: [CABLES, LINES] });
      expect(deps.logger.warn).toHaveBeenCalled();
    });

    it('does not report a catalog as cached before its body and cache write complete', async () => {
      let finishBody = (): void => undefined;
      const deps = createDeps({
        message: { type: 'PREFETCH_CATALOGS', urls: [CABLES], force: true },
        strategy: createStrategy(() => ({
          done: () => new Promise<void>((resolve) => (finishBody = resolve))
        }))
      });
      let settled = false;

      const pending = prefetchCatalogs(deps).then((result) => {
        settled = true;
        return result;
      });
      await new Promise((resolve) => setTimeout(resolve, 5));
      expect(settled).toBe(false);

      finishBody();
      expect((await pending).cached).toEqual([CABLES]);
    });

    it('does not start the next download while the previous body is still streaming', async () => {
      let finishBody = (): void => undefined;
      const strategy = createStrategy((request) =>
        request.url === CABLES ? { done: () => new Promise<void>((resolve) => (finishBody = resolve)) } : {}
      );
      const deps = createDeps({ strategy });

      const pending = prefetchCatalogs(deps);
      await new Promise((resolve) => setTimeout(resolve, 5));
      expect(requestedUrls(strategy)).toEqual([CABLES]);

      finishBody();
      expect(await pending).toEqual({ refused: null, cached: [CABLES, LINES], failed: [] });
      expect(requestedUrls(strategy)).toEqual([CABLES, LINES]);
    });

    it.each([
      ['a failed cache write', { done: async () => Promise.reject(new Error('quota')) }],
      ['a body transfer that fails', { done: async () => Promise.reject(new TypeError('network')) }]
    ])('reports a catalog as failed after %s, and still downloads the next one', async (_label, firstStep) => {
      const strategy = createStrategy((request) => (request.url === CABLES ? firstStep : {}));
      const deps = createDeps({ strategy });

      expect(await prefetchCatalogs(deps)).toEqual({ refused: null, cached: [LINES], failed: [CABLES] });
      expect(deps.logger.warn).toHaveBeenCalled();
    });

    it('refuses when the user data reserve is not free, even with force', async () => {
      const deps = createDeps({
        storage: { estimate: async () => ({ usage: 0, quota: 1024 }) },
        message: { type: 'PREFETCH_CATALOGS', urls: [CABLES], force: true }
      });

      expect((await prefetchCatalogs(deps)).refused).toBe('storage-insufficient');
      expect(deps.strategy.handleAll).not.toHaveBeenCalled();
    });

    describe('storage reserve', () => {
      const MB = 1024 * 1024;
      const RESERVE = 100 * MB;
      const message = (sizes?: Record<string, number>) => ({
        type: 'PREFETCH_CATALOGS' as const,
        urls: [CABLES, LINES],
        force: false,
        sizes
      });
      const cacheOf = (cached: string[] = []) => ({
        has: vi.fn(async (url: string) => cached.includes(url)),
        delete: vi.fn(async () => true)
      });

      it('refuses when the uncached catalogs would eat into the reserve', async () => {
        const deps = createDeps({
          storage: { estimate: async () => ({ usage: 0, quota: RESERVE + 5 * MB }) },
          message: message({ [CABLES]: 3 * MB, [LINES]: 3 * MB }),
          cache: cacheOf()
        });

        expect((await prefetchCatalogs(deps)).refused).toBe('storage-insufficient');
        expect(deps.strategy.handleAll).not.toHaveBeenCalled();
      });

      it('ignores the size of catalogs that are already cached', async () => {
        const deps = createDeps({
          storage: { estimate: async () => ({ usage: 0, quota: RESERVE + 5 * MB }) },
          message: message({ [CABLES]: 3 * MB, [LINES]: 3 * MB }),
          cache: cacheOf([CABLES])
        });

        expect((await prefetchCatalogs(deps)).cached).toEqual([CABLES, LINES]);
      });

      it('stops before a download that no longer fits and reports the remaining catalogs as failed', async () => {
        const estimate = vi
          .fn()
          .mockResolvedValueOnce({ usage: 0, quota: RESERVE + 10 * MB })
          .mockResolvedValueOnce({ usage: 0, quota: RESERVE + 10 * MB })
          .mockResolvedValueOnce({ usage: 0, quota: RESERVE + 10 * MB })
          .mockResolvedValue({ usage: 8 * MB, quota: RESERVE + 10 * MB });
        const deps = createDeps({ storage: { estimate }, message: message({ [CABLES]: 4 * MB, [LINES]: 4 * MB }) });

        expect(await prefetchCatalogs(deps)).toEqual({ refused: null, cached: [CABLES], failed: [LINES] });
        expect(deps.strategy.handleAll).toHaveBeenCalledTimes(1);
      });

      it('evicts a download that consumed the reserve and stops', async () => {
        const estimate = vi
          .fn()
          .mockResolvedValueOnce({ usage: 0, quota: RESERVE + MB })
          .mockResolvedValueOnce({ usage: 0, quota: RESERVE + MB })
          .mockResolvedValue({ usage: 2 * MB, quota: RESERVE + MB });
        const cache = cacheOf();
        const deps = createDeps({ storage: { estimate }, cache });

        expect(await prefetchCatalogs(deps)).toEqual({ refused: null, cached: [], failed: [CABLES, LINES] });
        expect(cache.delete).toHaveBeenCalledWith(CABLES);
        expect(deps.strategy.handleAll).toHaveBeenCalledTimes(1);
      });

      it('never evicts a catalog that was already cached', async () => {
        const cache = cacheOf([CABLES]);
        const deps = createDeps({
          storage: { estimate: async () => ({ usage: 0, quota: RESERVE - 1 }) },
          message: { type: 'PREFETCH_CATALOGS', urls: [CABLES], force: false },
          cache
        });

        expect((await prefetchCatalogs(deps)).refused).toBe('storage-insufficient');
        expect(cache.delete).not.toHaveBeenCalled();
      });
    });

    it('prefetches when the storage estimate is unavailable', async () => {
      const deps = createDeps({ storage: undefined });

      expect((await prefetchCatalogs(deps)).cached).toEqual([CABLES, LINES]);
    });
  });

  describe('isPrefetchCatalogsMessage', () => {
    it.each([
      [{ type: 'PREFETCH_CATALOGS', urls: ['/data/a.csv?v=1'], force: false }, true],
      [{ type: 'PREFETCH_CATALOGS', urls: [42], force: false }, false],
      [{ type: 'OTHER', urls: [] }, false],
      [null, false],
      ['PREFETCH_CATALOGS', false]
    ])('%o -> %s', (data, expected) => {
      expect(isPrefetchCatalogsMessage(data)).toBe(expected);
    });
  });
});
