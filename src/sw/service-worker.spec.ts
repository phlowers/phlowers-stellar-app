import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NavigationRoute, Route } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';

const precaching = vi.hoisted(() => {
  const controller = {
    addToCacheList: vi.fn(),
    matchPrecache: vi.fn(async (): Promise<Response | undefined> => undefined),
    install: vi.fn(async () => ({})),
    activate: vi.fn(async () => ({})),
    getCacheKeyForURL: vi.fn(),
    strategy: { cacheName: 'workbox-precache-v2-test' }
  };
  return {
    controller,
    PrecacheController: vi.fn(function () {
      return controller;
    }),
    PrecacheRoute: vi.fn(function (this: { kind: string }) {
      this.kind = 'precache-route';
    })
  };
});
const routing = vi.hoisted(() => ({ registerRoute: vi.fn() }));

vi.mock('workbox-precaching', () => ({
  PrecacheController: precaching.PrecacheController,
  PrecacheRoute: precaching.PrecacheRoute
}));
vi.mock('workbox-routing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('workbox-routing')>()),
  registerRoute: routing.registerRoute
}));

type Listener = (event: {
  waitUntil: (promise: Promise<unknown>) => void;
  data?: unknown;
  ports?: { postMessage: (message: unknown) => void }[];
}) => void;

describe('service worker entry point', () => {
  const listeners = new Map<string, Listener>();
  const skipWaiting = vi.fn();
  const claim = vi.fn(async () => undefined);
  const manifest = [
    { url: '/index.html', revision: 'r1', integrity: 'sha256-a', sizeBytes: 10 },
    { url: '/main.js', revision: 'r2', integrity: 'sha256-b', sizeBytes: 20 }
  ];

  beforeAll(async () => {
    const scope = self as unknown as Record<string, unknown>;
    scope['__WB_DISABLE_DEV_LOGS'] = true;
    scope['__WB_MANIFEST'] = manifest;
    scope['skipWaiting'] = skipWaiting;
    scope['clients'] = { matchAll: vi.fn(async () => []), claim };
    scope['caches'] = { keys: vi.fn(async () => []), delete: vi.fn(), open: vi.fn() };
    vi.spyOn(self, 'addEventListener').mockImplementation((type: string, listener: unknown) => {
      listeners.set(type, listener as Listener);
    });
    await import('./service-worker');
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('precaches the injected manifest without the build-only size field', () => {
    expect(precaching.controller.addToCacheList).toHaveBeenCalledWith([
      { url: '/index.html', revision: 'r1', integrity: 'sha256-a' },
      { url: '/main.js', revision: 'r2', integrity: 'sha256-b' }
    ]);
  });

  it('registers the catalog route, the precache route and a shell navigation route serving /index.html', async () => {
    expect(routing.registerRoute).toHaveBeenCalledTimes(3);
    const catalogRoute = routing.registerRoute.mock.calls[0][0] as Route;
    expect(catalogRoute).toBeInstanceOf(Route);
    expect(catalogRoute.handler).toBeInstanceOf(CacheFirst);
    expect(routing.registerRoute.mock.calls[1][0]).toMatchObject({ kind: 'precache-route' });
    const navigationRoute = routing.registerRoute.mock.calls[2][0] as NavigationRoute;
    expect(navigationRoute).toBeInstanceOf(NavigationRoute);

    const shell = new Response('shell');
    precaching.controller.matchPrecache.mockResolvedValueOnce(shell);
    const response = await navigationRoute.handler.handle({
      request: new Request('https://stellar.test/studies/42'),
      url: new URL('https://stellar.test/studies/42'),
      event: {} as ExtendableEvent
    });

    expect(precaching.controller.matchPrecache).toHaveBeenCalledWith('/index.html');
    expect(response).toBe(shell);
  });

  it('only listens to install, activate and message (fetch is handled by the Workbox router)', () => {
    expect([...listeners.keys()].sort()).toEqual(['activate', 'install', 'message']);
  });

  it('ignores messages that are not catalog prefetch requests', () => {
    const waitUntil = vi.fn();

    listeners.get('message')!({ waitUntil, data: { type: 'SKIP_WAITING' }, ports: [] });

    expect(waitUntil).not.toHaveBeenCalled();
    expect(skipWaiting).not.toHaveBeenCalled();
  });

  it('answers a catalog prefetch request on the transferred port', async () => {
    const waitUntil = vi.fn();
    const port = { postMessage: vi.fn() };

    listeners.get('message')!({
      waitUntil,
      data: { type: 'PREFETCH_CATALOGS', urls: ['/data/cables.csv?v=abc'], force: false },
      ports: [port]
    });
    await waitUntil.mock.calls[0][0];

    // No downlink in jsdom: the network rule defers the prefetch.
    expect(port.postMessage).toHaveBeenCalledWith({ refused: 'api-unavailable', cached: [], failed: [] });
  });

  it('extends the install event and never calls skipWaiting', async () => {
    const waitUntil = vi.fn();

    listeners.get('install')!({ waitUntil });

    expect(waitUntil).toHaveBeenCalledTimes(1);
    // No downlink in jsdom: the network rule refuses the installation.
    await expect(waitUntil.mock.calls[0][0]).rejects.toMatchObject({ reason: 'api-unavailable' });
    expect(precaching.controller.install).not.toHaveBeenCalled();
    expect(skipWaiting).not.toHaveBeenCalled();
  });

  it('activates by cleaning the precache and claiming the clients', async () => {
    const waitUntil = vi.fn();

    listeners.get('activate')!({ waitUntil });
    await waitUntil.mock.calls[0][0];

    expect(precaching.controller.activate).toHaveBeenCalled();
    expect(claim).toHaveBeenCalled();
    expect(skipWaiting).not.toHaveBeenCalled();
  });

  it('contains no skipWaiting call in the service worker sources', () => {
    for (const file of ['service-worker.ts', 'service-worker.helpers.ts', 'catalogs.ts']) {
      const code = readFileSync(resolve(__dirname, file), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      expect(code).not.toMatch(/skipWaiting\s*\(/);
    }
  });
});
