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

function createDeps(overrides: Partial<PrefetchCatalogsDeps> = {}): PrefetchCatalogsDeps {
  return {
    message: { type: 'PREFETCH_CATALOGS', urls: [CABLES, LINES], force: false },
    event: new FakeExtendableEvent('message') as unknown as ExtendableEvent,
    origin: ORIGIN,
    strategy: { handle: vi.fn(async () => new Response('csv')) },
    connection: { downlink: 8 },
    storage: { estimate: async () => ({ usage: 0, quota: 10_000 * 1024 * 1024 }) },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    ...overrides
  };
}

const requestedUrls = (strategy: CatalogStrategyLike): string[] =>
  vi.mocked(strategy.handle).mock.calls.map(([options]) => options.request.url);

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
      expect(deps.strategy.handle).not.toHaveBeenCalled();
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
      const strategy: CatalogStrategyLike = {
        handle: vi.fn(async ({ request }) => {
          order.push(`start ${request.url}`);
          await new Promise((resolve) => setTimeout(resolve, 5));
          order.push(`end ${request.url}`);
          return new Response('csv');
        })
      };
      const deps = createDeps({
        connection: { downlink: 1 },
        strategy,
        message: { type: 'PREFETCH_CATALOGS', urls: [CABLES, LINES], force: true }
      });

      const result = await prefetchCatalogs(deps);

      expect(order).toEqual([`start ${CABLES}`, `end ${CABLES}`, `start ${LINES}`, `end ${LINES}`]);
      expect(result).toEqual({ refused: null, cached: [CABLES, LINES], failed: [] });
    });

    it('requests with redirect=error and same-origin credentials', async () => {
      const deps = createDeps();

      await prefetchCatalogs(deps);

      const [options] = vi.mocked(deps.strategy.handle).mock.calls[0];
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
        handle: vi
          .fn()
          .mockRejectedValueOnce(new TypeError('redirect'))
          .mockResolvedValueOnce(new Response('', { status: 404 }))
      };
      const deps = createDeps({ strategy });

      expect(await prefetchCatalogs(deps)).toEqual({ refused: null, cached: [], failed: [CABLES, LINES] });
      expect(deps.logger.warn).toHaveBeenCalled();
    });

    it('refuses when the user data reserve is not free, even with force', async () => {
      const deps = createDeps({
        storage: { estimate: async () => ({ usage: 0, quota: 1024 }) },
        message: { type: 'PREFETCH_CATALOGS', urls: [CABLES], force: true }
      });

      expect((await prefetchCatalogs(deps)).refused).toBe('storage-insufficient');
      expect(deps.strategy.handle).not.toHaveBeenCalled();
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
