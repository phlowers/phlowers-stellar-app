import { installApp, updateApp, handleFetch, handleMessage } from './service-worker';

// In-memory Cache Storage mock: each cache name maps to its own instance with
// independent put/match/keys/delete spies, so tests can exercise the SW's
// versioned-cache activation scheme (control cache vs. per-version caches vs.
// the pre-migration legacy cache) instead of a single shared cache object.
interface MockCacheInstance {
  match: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  keys: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

function createMockCacheInstance(): MockCacheInstance {
  return {
    match: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
    keys: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined)
  };
}

let cacheStore: Map<string, MockCacheInstance>;

const mockCaches = {
  open: vi.fn(async (name: string) => {
    if (!cacheStore.has(name)) {
      cacheStore.set(name, createMockCacheInstance());
    }
    return cacheStore.get(name);
  }),
  delete: vi.fn(async (name: string) => cacheStore.delete(name)),
  has: vi.fn(async (name: string) => cacheStore.has(name)),
  keys: vi.fn(async () => Array.from(cacheStore.keys())),
  match: vi.fn()
};

const mockFetch = vi.fn();

const mockClients = {
  matchAll: vi.fn()
};

const mockSelf = {
  location: { origin: 'https://example.com' },
  clients: mockClients,
  registration: { scope: 'https://example.com/' }
};

// Mock global objects
global.caches = mockCaches as unknown as CacheStorage;
global.fetch = mockFetch as unknown as typeof fetch;
global.Response = class MockResponse {
  constructor(body?: string | null, init?: Record<string, unknown>) {
    const response = {
      json: vi.fn().mockResolvedValue(body),
      text: vi.fn().mockResolvedValue(body),
      ...init
    };
    return response as unknown as Response;
  }
  static error() {
    return new MockResponse('Error', { status: 500 });
  }
  static redirect(url: string, status = 302) {
    return new MockResponse(null, { status, url, redirected: true });
  }
} as unknown as typeof Response;
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn()
};

// Mock service worker global scope
Object.defineProperty(global, 'self', {
  value: mockSelf,
  writable: true
});

/** Mirrors CONTROL_CACHE_NAME in service-worker.ts. */
const CONTROL_CACHE_NAME = 'app-assets-control';
/** Mirrors CONTROL_KEY in service-worker.ts. */
const CONTROL_KEY = '/control';
/** Mirrors LEGACY_CACHE_NAME in service-worker.ts. */
const LEGACY_CACHE_NAME = 'app-assets';

/**
 * Seeds the activation pointer so `resolveActiveCache()` resolves to a
 * specific version cache without going through a real install/update.
 */
async function seedControlState(state: { active: string; previous: string | null }): Promise<void> {
  const controlCache = await mockCaches.open(CONTROL_CACHE_NAME);
  controlCache!.match.mockImplementation(async (key: string) =>
    key === CONTROL_KEY ? { json: vi.fn().mockResolvedValue(state) } : undefined
  );
}

/**
 * Seeds the pre-migration legacy cache directly (no control state) — the
 * simplest way to make `resolveActiveCache()` resolve to "an installed shell
 * exists" without asserting on the exact versioned cache-naming scheme.
 */
async function seedLegacyCache(): Promise<MockCacheInstance> {
  return (await mockCaches.open(LEGACY_CACHE_NAME))!;
}

/** Asserts that no cache anywhere received a write — install/update alone own precaching. */
function expectNoCacheWrites(): void {
  for (const cache of cacheStore.values()) {
    expect(cache.put).not.toHaveBeenCalled();
  }
}

/** Builds a SW message event; `waitUntil` is a spy so tests can assert it received the task. */
function messageEvent(data: { type: string }, source: { postMessage: ReturnType<typeof vi.fn> } | null = null) {
  const eventSource = source ?? { postMessage: vi.fn() };
  const waitUntil = vi.fn();
  return {
    event: { data, source: eventSource, waitUntil } as unknown as ExtendableMessageEvent,
    source: eventSource,
    waitUntil
  };
}

describe('Service Worker Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cacheStore = new Map();
  });

  describe('installApp', () => {
    const mockManifest = {
      files: ['/index.html', '/app.js', '/styles.css'],
      app_version: {
        build_id: 'v1-hash',
        git_hash: 'v1-hash',
        version: '1.0.0',
        build_datetime_utc: '2024-01-01T00:00:00.000000+00:00'
      }
    };
    const versionCacheName = 'app-assets-v-v1-hash';

    beforeEach(() => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/assets_list.json') {
          return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(mockManifest) });
        }
        return Promise.resolve({ ok: true, status: 200 });
      });
    });

    it('should install app successfully', async () => {
      await installApp();

      expect(mockFetch).toHaveBeenCalledWith(
        '/assets_list.json',
        expect.objectContaining({
          cache: 'no-store',
          headers: expect.objectContaining({
            'cache-control': 'no-cache',
            pragma: 'no-cache'
          })
        })
      );
      const versionCache = cacheStore.get(versionCacheName)!;
      expect(versionCache).toBeDefined();
      for (const file of mockManifest.files) {
        expect(mockFetch).toHaveBeenCalledWith(
          file,
          expect.objectContaining({ cache: 'no-store', signal: expect.any(AbortSignal) })
        );
        expect(versionCache.put).toHaveBeenCalledWith(file, expect.objectContaining({ ok: true }));
      }
      expect(versionCache.put).toHaveBeenCalledWith(
        '/app_version',
        expect.objectContaining({
          headers: { 'content-type': 'application/json' }
        })
      );

      // Activation: the pointer now points at the newly precached version.
      const controlCache = cacheStore.get(CONTROL_CACHE_NAME)!;
      expect(controlCache.put).toHaveBeenCalledWith(
        CONTROL_KEY,
        expect.objectContaining({ headers: { 'content-type': 'application/json' } })
      );
    });

    it('should throw when manifest response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404
      });

      await expect(installApp()).rejects.toThrow('Manifest fetch failed with status 404');
    });

    it('should reject an empty manifest instead of activating an incomplete version', async () => {
      const emptyManifest = {
        files: [],
        app_version: {
          build_id: 'v1-empty',
          git_hash: 'v1-empty',
          version: '1.0.0',
          build_datetime_utc: '2024-01-01T00:00:00.000000+00:00'
        }
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(emptyManifest)
      });

      await expect(installApp()).rejects.toThrow(/manifest is empty or missing \/index\.html/i);

      // Only the manifest itself was fetched — no per-file fetch, no cache ever opened.
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockCaches.open).not.toHaveBeenCalled();
    });

    it('should handle fetch manifest errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(installApp()).rejects.toThrow('Network error');
    });

    it('should abort install when a single file fails to precache (e.g. 404 on a candidate asset)', async () => {
      const versionCache = await mockCaches.open(versionCacheName);
      mockFetch.mockImplementation((url: string) => {
        if (url === '/assets_list.json') {
          return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(mockManifest) });
        }
        if (url === '/app.js') {
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.resolve({ ok: true, status: 200 });
      });

      await expect(installApp()).rejects.toThrow('Precache failed for /app.js: HTTP 404');

      // A failed install must never mark itself as done, and the incomplete
      // candidate cache must be deleted so it never lingers.
      expect(versionCache!.put).not.toHaveBeenCalledWith('/app_version', expect.anything());
      expect(mockCaches.delete).toHaveBeenCalledWith(versionCacheName);
    });

    it('should throw identifying the file when every file fails to precache', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/assets_list.json') {
          return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(mockManifest) });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      await expect(installApp()).rejects.toThrow(/Precache failed for .+: HTTP 404/);
    });

    it('should not write a still in-flight file to the cache once another file already failed', async () => {
      const versionCache = await mockCaches.open(versionCacheName);
      let resolveStylesFetch!: (value: { ok: boolean; status: number }) => void;
      const stylesFetch = new Promise<{ ok: boolean; status: number }>((resolve) => {
        resolveStylesFetch = resolve;
      });

      mockFetch.mockImplementation((url: string) => {
        if (url === '/assets_list.json') {
          return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(mockManifest) });
        }
        if (url === '/app.js') {
          return Promise.resolve({ ok: false, status: 404 });
        }
        if (url === '/styles.css') {
          // Still in flight when /app.js fails.
          return stylesFetch;
        }
        return Promise.resolve({ ok: true, status: 200 });
      });

      await expect(installApp()).rejects.toThrow('Precache failed for /app.js: HTTP 404');

      // Resolve the slow fetch only after installApp() has already rejected.
      resolveStylesFetch({ ok: true, status: 200 });
      await Promise.resolve();
      await Promise.resolve();

      expect(versionCache!.put).not.toHaveBeenCalledWith('/styles.css', expect.anything());
    });

    it.each([
      ['//evil.com/payload.js', 'protocol-relative URL'],
      ['https://evil.com/payload.js', 'absolute cross-origin URL'],
      ['/\\evil.com/payload.js', 'backslash trick'],
      ['app.js', 'non-root-relative path']
    ])('should reject a manifest file that is a %s (%s) without ever fetching it', async (file) => {
      const maliciousManifest = { files: ['/index.html', file], app_version: mockManifest.app_version };
      mockFetch.mockImplementation((url: string) => {
        if (url === '/assets_list.json') {
          return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(maliciousManifest) });
        }
        return Promise.resolve({ ok: true, status: 200 });
      });

      await expect(installApp()).rejects.toThrow(/invalid or cross-origin asset path/);
      expect(mockFetch).not.toHaveBeenCalledWith(file, expect.anything());
    });
  });

  describe('updateApp', () => {
    const mockManifest = {
      files: ['/index.html', '/app.js', '/pyodide/file1.whl'],
      app_version: {
        build_id: 'v2-hash',
        git_hash: 'v2-hash',
        version: '1.1.0',
        build_datetime_utc: '2024-02-01T00:00:00.000000+00:00'
      }
    };
    const versionCacheName = 'app-assets-v-v2-hash';

    beforeEach(() => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/assets_list.json') {
          return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(mockManifest) });
        }
        return Promise.resolve({ ok: true, status: 200 });
      });
    });

    it('should precache the new version into its own cache and activate it', async () => {
      const result = await updateApp();

      expect(result).toEqual(mockManifest);
      const versionCache = cacheStore.get(versionCacheName)!;
      expect(versionCache).toBeDefined();
      for (const file of mockManifest.files) {
        expect(versionCache.put).toHaveBeenCalledWith(file, expect.objectContaining({ ok: true }));
      }
      // Store new version
      expect(versionCache.put).toHaveBeenCalledWith(
        '/app_version',
        expect.objectContaining({
          headers: { 'content-type': 'application/json' }
        })
      );
      const controlCache = cacheStore.get(CONTROL_CACHE_NAME)!;
      expect(controlCache.put).toHaveBeenCalledWith(
        CONTROL_KEY,
        expect.objectContaining({ headers: { 'content-type': 'application/json' } })
      );
      // The old destructive delete-then-copy scheme must be gone.
      expect(mockCaches.delete).not.toHaveBeenCalledWith(LEGACY_CACHE_NAME);
    });

    it('should re-download Python wheels (no incremental caching)', async () => {
      const manifestWithWheels = {
        files: ['/index.html', '/pyodide/numpy.whl', '/pyodide/pandas.whl'],
        app_version: {
          build_id: 'v2-wheels-hash',
          git_hash: 'v2-wheels-hash',
          version: '1.1.0',
          build_datetime_utc: '2024-02-01T00:00:00.000000+00:00'
        }
      };
      mockFetch.mockImplementation((url: string) => {
        if (url === '/assets_list.json') {
          return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(manifestWithWheels) });
        }
        return Promise.resolve({ ok: true, status: 200 });
      });

      await updateApp();

      const versionCache = cacheStore.get('app-assets-v-v2-wheels-hash')!;
      // All files including .whl should be individually re-fetched and cached (full reset)
      for (const file of manifestWithWheels.files) {
        expect(versionCache.put).toHaveBeenCalledWith(file, expect.objectContaining({ ok: true }));
      }
    });

    it('should reject an empty manifest instead of activating an incomplete version', async () => {
      const emptyManifest = {
        files: [],
        app_version: {
          build_id: 'v2-empty',
          git_hash: 'v2-empty',
          version: '1.1.0',
          build_datetime_utc: '2024-02-01T00:00:00.000000+00:00'
        }
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(emptyManifest)
      });

      await expect(updateApp()).rejects.toThrow(/manifest is empty or missing \/index\.html/i);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockCaches.open).not.toHaveBeenCalled();
    });

    it('should handle fetch manifest errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(updateApp()).rejects.toThrow('Network error');
    });

    it('should throw when manifest response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      });

      await expect(updateApp()).rejects.toThrow('Manifest fetch failed with status 500');
    });

    it('should delete the incomplete candidate cache and never touch the previously active version when a file fails to precache', async () => {
      // Simulate an already-active version to prove it is left untouched.
      await seedControlState({ active: 'app-assets-v-current', previous: null });
      const activeCache = await mockCaches.open('app-assets-v-current');

      mockFetch.mockImplementation((url: string) => {
        if (url === '/assets_list.json') {
          return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(mockManifest) });
        }
        if (url === '/app.js') {
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.resolve({ ok: true, status: 200 });
      });

      await expect(updateApp()).rejects.toThrow('Precache failed for /app.js: HTTP 404');

      // The failed candidate cache is cleaned up...
      expect(mockCaches.delete).toHaveBeenCalledWith(versionCacheName);
      // ...but the currently active version is never touched, and activation
      // (the control pointer write) never happens on a failed precache.
      expect(mockCaches.delete).not.toHaveBeenCalledWith('app-assets-v-current');
      expect(activeCache!.put).not.toHaveBeenCalled();
      const controlCache = cacheStore.get(CONTROL_CACHE_NAME)!;
      expect(controlCache.put).not.toHaveBeenCalled();
    });

    it('should refuse to precache into the cache named like the active one (same build_id)', async () => {
      await seedControlState({ active: versionCacheName, previous: null });
      const activeCache = await mockCaches.open(versionCacheName);

      await expect(updateApp()).rejects.toThrow(/Refusing to precache into the active cache/);

      // Only the manifest was fetched; the active cache was neither written nor deleted.
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(activeCache!.put).not.toHaveBeenCalled();
      expect(mockCaches.delete).not.toHaveBeenCalled();
    });

    it('should refuse a manifest without build_id', async () => {
      const manifestWithoutBuildId = {
        files: mockManifest.files,
        app_version: { git_hash: 'v2-hash', version: '1.1.0', build_datetime_utc: '2024-02-01T00:00:00.000000+00:00' }
      };
      mockFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(manifestWithoutBuildId) });

      await expect(updateApp()).rejects.toThrow(/no build_id/);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockCaches.delete).not.toHaveBeenCalled();
    });

    it('should never delete the previous cache when precaching into it fails', async () => {
      await seedControlState({ active: 'app-assets-v-current', previous: versionCacheName });
      mockFetch.mockImplementation((url: string) => {
        if (url === '/assets_list.json') {
          return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(mockManifest) });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      await expect(updateApp()).rejects.toThrow(/Precache failed for .+: HTTP 404/);

      expect(mockCaches.delete).not.toHaveBeenCalledWith(versionCacheName);
      expect(mockCaches.delete).not.toHaveBeenCalledWith('app-assets-v-current');
    });
  });

  describe('handleFetch — bypass routes', () => {
    let mockEvent: {
      respondWith: ReturnType<typeof vi.fn>;
      request: { url: string; clone: ReturnType<typeof vi.fn>; mode?: string };
    };

    beforeEach(() => {
      mockEvent = {
        request: {
          url: 'https://example.com/',
          clone: vi.fn().mockReturnThis()
        },
        respondWith: vi.fn()
      };
    });

    it('should bypass /auth/userinfo completely (no respondWith, no cache access)', async () => {
      mockEvent.request.url = 'https://example.com/auth/userinfo';

      await handleFetch(mockEvent as unknown as FetchEvent);

      // Plain return: the browser must handle the request natively.
      expect(mockEvent.respondWith).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockCaches.open).not.toHaveBeenCalled();
    });

    it('should bypass /auth/callback completely', async () => {
      mockEvent.request.url = 'https://example.com/auth/callback';

      await handleFetch(mockEvent as unknown as FetchEvent);

      expect(mockEvent.respondWith).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockCaches.open).not.toHaveBeenCalled();
    });

    it('should bypass /auth/relogin completely (native browser handling of the redirect chain)', async () => {
      mockEvent.request.url = 'https://example.com/auth/relogin';

      await handleFetch(mockEvent as unknown as FetchEvent);

      expect(mockEvent.respondWith).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockCaches.open).not.toHaveBeenCalled();
    });

    it('should bypass /assets_list.json completely (no respondWith, no cache access)', async () => {
      mockEvent.request.url = 'https://example.com/assets_list.json';

      await handleFetch(mockEvent as unknown as FetchEvent);

      expect(mockEvent.respondWith).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockCaches.open).not.toHaveBeenCalled();
    });

    it('should bypass /version.json completely (no respondWith, no cache access)', async () => {
      mockEvent.request.url = 'https://example.com/version.json';

      await handleFetch(mockEvent as unknown as FetchEvent);

      expect(mockEvent.respondWith).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockCaches.open).not.toHaveBeenCalled();
    });

    it('should bypass /docs completely (no respondWith, no cache access)', async () => {
      mockEvent.request.url = 'https://example.com/docs';

      await handleFetch(mockEvent as unknown as FetchEvent);

      expect(mockEvent.respondWith).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockCaches.open).not.toHaveBeenCalled();
    });

    it('should bypass /docs/ sub-pages completely (no respondWith, no cache access)', async () => {
      mockEvent.request.url = 'https://example.com/docs/some-page.html';

      await handleFetch(mockEvent as unknown as FetchEvent);

      expect(mockEvent.respondWith).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockCaches.open).not.toHaveBeenCalled();
    });

    it('should bypass /data/ catalog files completely (no respondWith, no cache access)', async () => {
      mockEvent.request.url = 'https://example.com/data/cables.csv';

      await handleFetch(mockEvent as unknown as FetchEvent);

      expect(mockEvent.respondWith).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockCaches.open).not.toHaveBeenCalled();
    });
  });

  describe('handleFetch — 3xx response not cached', () => {
    let mockEvent: {
      respondWith: ReturnType<typeof vi.fn>;
      request: { url: string; clone: ReturnType<typeof vi.fn>; mode?: string };
    };

    beforeEach(() => {
      mockEvent = {
        request: {
          url: 'https://example.com/app.js',
          clone: vi.fn().mockReturnThis()
        },
        respondWith: vi.fn()
      };
    });

    it('should not call cache.put when network returns a 302 redirect', async () => {
      const redirectResponse = { ok: false, status: 302 };
      mockFetch.mockResolvedValue(redirectResponse);

      await handleFetch(mockEvent as unknown as FetchEvent);

      const responsePromise = mockEvent.respondWith.mock.calls[0][0];
      await responsePromise;

      expectNoCacheWrites();
    });
  });

  describe('handleFetch — home page navigation with 3xx passthrough', () => {
    let mockEvent: { respondWith: ReturnType<typeof vi.fn>; request: { url: string; clone: ReturnType<typeof vi.fn> } };

    beforeEach(() => {
      mockEvent = {
        request: {
          url: 'https://example.com/',
          clone: vi.fn().mockReturnThis()
        },
        respondWith: vi.fn()
      };
    });

    it('should return 302 from network without caching (OIDC session expiry)', async () => {
      const redirectResponse = { ok: false, status: 302 };
      mockFetch.mockResolvedValue(redirectResponse);

      await handleFetch(mockEvent as unknown as FetchEvent);

      const responsePromise = mockEvent.respondWith.mock.calls[0][0];
      const response = await responsePromise;

      expect(response).toBe(redirectResponse);
      expectNoCacheWrites();
    });

    it('should serve the installed cached shell on a 200 without re-caching it (no silent update)', async () => {
      // A fresh index.html from a newly deployed version must NEVER replace
      // the installed shell outside the user-confirmed update flow.
      const okResponse = { ok: true, status: 200, clone: vi.fn().mockReturnThis() };
      const cachedShell = { ok: true, status: 200, from: 'installed-cache' };
      mockFetch.mockResolvedValue(okResponse);
      const legacyCache = await seedLegacyCache();
      legacyCache.match.mockResolvedValue(cachedShell);

      await handleFetch(mockEvent as unknown as FetchEvent);

      const responsePromise = mockEvent.respondWith.mock.calls[0][0];
      const response = await responsePromise;

      expect(response).toBe(cachedShell);
      expectNoCacheWrites();
    });

    it('should serve the network 200 without caching it when no shell is installed yet (first launch)', async () => {
      const okResponse = { ok: true, status: 200, clone: vi.fn().mockReturnThis() };
      mockFetch.mockResolvedValue(okResponse);

      await handleFetch(mockEvent as unknown as FetchEvent);

      const responsePromise = mockEvent.respondWith.mock.calls[0][0];
      const response = await responsePromise;

      expect(response).toBe(okResponse);
      expectNoCacheWrites();
    });

    it('should fall back to cache when network fails for home page', async () => {
      mockFetch.mockRejectedValue(new Error('Network down'));
      const cachedIndex = { ok: true, status: 200 };
      const legacyCache = await seedLegacyCache();
      legacyCache.match.mockResolvedValue(cachedIndex);

      await handleFetch(mockEvent as unknown as FetchEvent);

      const responsePromise = mockEvent.respondWith.mock.calls[0][0];
      const response = await responsePromise;

      expect(response).toBe(cachedIndex);
    });

    it('should serve the installed shell for SPA deep-link navigations (no silent update)', async () => {
      mockEvent.request.url = 'https://example.com/studies/42';
      (mockEvent.request as { mode?: string }).mode = 'navigate';
      const okResponse = { ok: true, status: 200, clone: vi.fn().mockReturnThis() };
      const cachedShell = { ok: true, status: 200, from: 'installed-cache' };
      mockFetch.mockResolvedValue(okResponse);
      const legacyCache = await seedLegacyCache();
      legacyCache.match.mockResolvedValue(cachedShell);

      await handleFetch(mockEvent as unknown as FetchEvent);

      const response = await mockEvent.respondWith.mock.calls[0][0];

      expect(response).toBe(cachedShell);
      expectNoCacheWrites();
    });
  });

  describe('handleFetch — home page serves cached shell on 401/5xx (no technical page)', () => {
    let mockEvent: { respondWith: ReturnType<typeof vi.fn>; request: { url: string; clone: ReturnType<typeof vi.fn> } };

    beforeEach(() => {
      mockEvent = {
        request: {
          url: 'https://example.com/',
          clone: vi.fn().mockReturnThis()
        },
        respondWith: vi.fn()
      };
    });

    it('should serve the cached shell when the server returns 502', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 502 });
      const cachedShell = { ok: true, status: 200 };
      const legacyCache = await seedLegacyCache();
      legacyCache.match.mockResolvedValue(cachedShell);

      await handleFetch(mockEvent as unknown as FetchEvent);

      const response = await mockEvent.respondWith.mock.calls[0][0];

      expect(response).toBe(cachedShell);
      expectNoCacheWrites();
    });

    it('should serve the cached shell when the server returns a bare 401', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 401 });
      const cachedShell = { ok: true, status: 200 };
      const legacyCache = await seedLegacyCache();
      legacyCache.match.mockResolvedValue(cachedShell);

      await handleFetch(mockEvent as unknown as FetchEvent);

      const response = await mockEvent.respondWith.mock.calls[0][0];

      expect(response).toBe(cachedShell);
    });

    it('should still pass a 302 redirect through even with a cached shell (OIDC flow)', async () => {
      const redirectResponse = { ok: false, status: 302 };
      mockFetch.mockResolvedValue(redirectResponse);
      const legacyCache = await seedLegacyCache();
      legacyCache.match.mockResolvedValue({ ok: true, status: 200 });

      await handleFetch(mockEvent as unknown as FetchEvent);

      const response = await mockEvent.respondWith.mock.calls[0][0];

      expect(response).toBe(redirectResponse);
    });

    it('should return the network error response when 5xx and no cached shell', async () => {
      const errorResponse = { ok: false, status: 503 };
      mockFetch.mockResolvedValue(errorResponse);

      await handleFetch(mockEvent as unknown as FetchEvent);

      const response = await mockEvent.respondWith.mock.calls[0][0];

      expect(response).toBe(errorResponse);
    });

    it('should force reauth via /auth/relogin when a bare 401 has no cached shell', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 401 });

      await handleFetch(mockEvent as unknown as FetchEvent);

      const response = (await mockEvent.respondWith.mock.calls[0][0]) as Response & { url: string };

      expect(response.status).toBe(302);
      expect(response.url).toBe('https://example.com/auth/relogin');
    });

    it('should force reauth via /auth/relogin when a bare 403 has no cached shell', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 403 });

      await handleFetch(mockEvent as unknown as FetchEvent);

      const response = (await mockEvent.respondWith.mock.calls[0][0]) as Response & { url: string };

      expect(response.status).toBe(302);
      expect(response.url).toBe('https://example.com/auth/relogin');
    });
  });

  describe('handleFetch', () => {
    let mockEvent: { respondWith: vi.Mock; request: { url: string; clone: vi.Mock } };

    beforeEach(() => {
      mockEvent = {
        request: {
          url: 'https://example.com/',
          clone: vi.fn().mockReturnValue({ url: 'https://example.com/' })
        },
        respondWith: vi.fn()
      };
    });

    it('should handle home page requests', async () => {
      mockEvent.request.url = 'https://example.com/';
      const mockResponse = { ok: true, status: 200, clone: vi.fn().mockReturnThis() };
      mockFetch.mockResolvedValue(mockResponse);

      await handleFetch(mockEvent as unknown as FetchEvent);

      expect(mockEvent.respondWith).toHaveBeenCalled();
      const responsePromise = mockEvent.respondWith.mock.calls[0][0];
      const response = await responsePromise;
      expect(response).toBe(mockResponse);
    });

    it('should handle backend requests', async () => {
      mockEvent.request.url = 'https://example.com/celesteback/api/data';

      await handleFetch(mockEvent as unknown as FetchEvent);

      expect(mockEvent.respondWith).toHaveBeenCalledWith(expect.any(Promise));
    });

    it('should handle other requests with cache hit', async () => {
      mockEvent.request.url = 'https://example.com/image.png';
      const mockResponse = new Response('console.log("test");');
      const legacyCache = await seedLegacyCache();
      legacyCache.match.mockResolvedValue(mockResponse);

      await handleFetch(mockEvent as unknown as FetchEvent);
      await mockEvent.respondWith.mock.calls[0][0];

      expect(legacyCache.match).toHaveBeenCalledWith(mockEvent.request);
      expect(mockEvent.respondWith).toHaveBeenCalled();
    });

    it('should handle other requests with cache miss', async () => {
      mockEvent.request.url = 'https://example.com/image.png';
      mockFetch.mockResolvedValue(new Response('console.log("test");'));
      const clonedRequest = { url: 'https://example.com/image.png' };
      mockEvent.request.clone.mockReturnValue(clonedRequest);

      await handleFetch(mockEvent as unknown as FetchEvent);
      await mockEvent.respondWith.mock.calls[0][0];

      expect(mockFetch).toHaveBeenCalledWith(
        clonedRequest,
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Object),
          // Cache-miss fallback must be bounded (fetchWithTimeout).
          signal: expect.any(AbortSignal)
        })
      );
      expect(mockEvent.respondWith).toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
      mockEvent.request.url = 'https://example.com/image.png';
      mockFetch.mockRejectedValue(new Error('Network error'));

      await handleFetch(mockEvent as unknown as FetchEvent);

      expect(mockEvent.respondWith).toHaveBeenCalled();
    });

    it('should serve js assets cache-first without hitting the network (no silent update)', async () => {
      // Bundles from a newly deployed version must never replace the
      // installed ones outside the user-confirmed update flow.
      mockEvent.request.url = 'https://example.com/app.js';
      const cachedResponse = { ok: true, from: 'installed-cache' };
      const legacyCache = await seedLegacyCache();
      legacyCache.match.mockResolvedValue(cachedResponse);

      await handleFetch(mockEvent as unknown as FetchEvent);

      expect(mockEvent.respondWith).toHaveBeenCalled();
      const responsePromise = mockEvent.respondWith.mock.calls[0][0];
      const response = await responsePromise;

      expect(response).toBe(cachedResponse);
      expect(mockFetch).not.toHaveBeenCalled();
      expectNoCacheWrites();
    });

    it('should fetch uncached js from the network without writing it to the cache', async () => {
      mockEvent.request.url = 'https://example.com/app.js';
      const clonedRequest = { url: 'https://example.com/app.js' };
      const networkResponse = {
        ok: true,
        clone: vi.fn().mockReturnValue({ ok: true, body: 'bundled-js' })
      };
      mockEvent.request.clone.mockReturnValue(clonedRequest);
      mockFetch.mockResolvedValue(networkResponse as unknown as globalThis.Response);

      await handleFetch(mockEvent as unknown as FetchEvent);

      expect(mockEvent.respondWith).toHaveBeenCalled();
      const responsePromise = mockEvent.respondWith.mock.calls[0][0];
      const response = await responsePromise;

      expect(response).toBe(networkResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        clonedRequest,
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Object)
        })
      );
      expectNoCacheWrites();
    });

    it('should serve css assets cache-first on cache hit', async () => {
      mockEvent.request.url = 'https://example.com/styles.css';
      const cachedResponse = { from: 'cache' };
      const legacyCache = await seedLegacyCache();
      legacyCache.match.mockResolvedValue(cachedResponse as unknown as globalThis.Response);

      await handleFetch(mockEvent as unknown as FetchEvent);

      expect(mockEvent.respondWith).toHaveBeenCalled();
      const responsePromise = mockEvent.respondWith.mock.calls[0][0];
      const response = await responsePromise;

      expect(response).toBe(cachedResponse);
      expect(legacyCache.match).toHaveBeenCalledWith(mockEvent.request);
    });

    it('should pass a bounded AbortSignal to the cache-miss network fallback', async () => {
      // A cache-miss fetch must never hang indefinitely behind an OIDC
      // refresh pile-up on the server (headers-only 13s bound).
      mockEvent.request.url = 'https://example.com/chunk-KJVBLZQZ.js';
      const clonedRequest = { url: 'https://example.com/chunk-KJVBLZQZ.js' };
      const networkResponse = {
        ok: true,
        clone: vi.fn().mockReturnValue({ ok: true })
      };
      mockEvent.request.clone.mockReturnValue(clonedRequest);
      mockFetch.mockResolvedValue(networkResponse as unknown as globalThis.Response);

      await handleFetch(mockEvent as unknown as FetchEvent);
      await mockEvent.respondWith.mock.calls[0][0];

      const fetchInit = mockFetch.mock.calls[0][1] as RequestInit;
      expect(fetchInit.signal).toBeDefined();
      expect(fetchInit.signal).toBeInstanceOf(AbortSignal);
    });

    describe('hashed asset missing from the active cache', () => {
      const chunkUrl = 'https://example.com/chunk-4MWGN5E4.js';
      const previousResponse = { ok: true, from: 'previous-cache' };

      async function seedVersions(previousHas: boolean): Promise<void> {
        await seedControlState({ active: 'app-assets-v-new', previous: 'app-assets-v-old' });
        await mockCaches.open('app-assets-v-new');
        const previous = (await mockCaches.open('app-assets-v-old'))!;
        previous.match.mockResolvedValue(previousHas ? previousResponse : undefined);
      }

      it('should serve it from the previous version cache before the network', async () => {
        mockEvent.request.url = chunkUrl;
        await seedVersions(true);

        await handleFetch(mockEvent as unknown as FetchEvent);
        const response = await mockEvent.respondWith.mock.calls[0][0];

        expect(response).toBe(previousResponse);
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should fall back to the network when the previous cache has no such file', async () => {
        mockEvent.request.url = chunkUrl;
        const networkResponse = { ok: true, from: 'network' };
        mockFetch.mockResolvedValue(networkResponse);
        await seedVersions(false);

        await handleFetch(mockEvent as unknown as FetchEvent);
        const response = await mockEvent.respondWith.mock.calls[0][0];

        expect(response).toBe(networkResponse);
      });

      it('should not look a non-hashed file up in the previous version cache', async () => {
        mockEvent.request.url = 'https://example.com/en.json';
        const networkResponse = { ok: true, from: 'network' };
        mockFetch.mockResolvedValue(networkResponse);
        await seedVersions(true);

        await handleFetch(mockEvent as unknown as FetchEvent);
        const response = await mockEvent.respondWith.mock.calls[0][0];

        expect(response).toBe(networkResponse);
      });

      it('should go to the network when there is no previous version', async () => {
        mockEvent.request.url = chunkUrl;
        const networkResponse = { ok: true, from: 'network' };
        mockFetch.mockResolvedValue(networkResponse);
        await seedControlState({ active: 'app-assets-v-new', previous: null });
        await mockCaches.open('app-assets-v-new');

        await handleFetch(mockEvent as unknown as FetchEvent);
        const response = await mockEvent.respondWith.mock.calls[0][0];

        expect(response).toBe(networkResponse);
      });
    });

    it('should return Response.error() when network fails and no cache exists', async () => {
      // The original bug surfaced as ERR_FAILED for chunk loads; this confirms
      // the SW does surface the error rather than hanging indefinitely.
      mockEvent.request.url = 'https://example.com/chunk-4MWGN5E4.js';
      const clonedRequest = { url: 'https://example.com/chunk-4MWGN5E4.js' };
      mockEvent.request.clone.mockReturnValue(clonedRequest);
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      await handleFetch(mockEvent as unknown as FetchEvent);
      const response = await mockEvent.respondWith.mock.calls[0][0];

      // Our MockResponse.error() returns a stub with status 500.
      expect(response).toBeDefined();
      expect((response as { status?: number }).status).toBe(500);
    });
  });

  describe('handleMessage', () => {
    let mockEvent: {
      data: { type: string };
      source: { postMessage: vi.Mock } | null;
      waitUntil: vi.Mock;
    };

    beforeEach(() => {
      mockEvent = {
        data: { type: 'update' },
        source: { postMessage: vi.fn() },
        waitUntil: vi.fn()
      };
    });

    afterEach(() => {
      mockClients.matchAll.mockReset();
    });

    it('should broadcast update_complete to every open page', async () => {
      const mockManifest = {
        files: ['/index.html', '/app.js'],
        app_version: {
          build_id: 'msg-update-hash',
          git_hash: 'msg-update-hash',
          version: '1.1.0',
          build_datetime_utc: '2024-01-01T00:00:00.000000+00:00'
        }
      };
      const otherTab = { postMessage: vi.fn() };
      const sourceTab = { postMessage: vi.fn() };
      mockClients.matchAll.mockResolvedValue([sourceTab, otherTab]);
      mockEvent.source = sourceTab;
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockManifest)
      });

      await handleMessage(mockEvent as unknown as ExtendableMessageEvent);

      const complete = {
        message: 'update_complete',
        latest_version: mockManifest.app_version,
        data_hashes: {}
      };
      expect(otherTab.postMessage).toHaveBeenCalledWith(complete);
      // The source is one of the open pages: it gets the message once, from the broadcast.
      expect(sourceTab.postMessage.mock.calls.filter(([m]) => m.message === 'update_complete')).toHaveLength(1);
      expect(mockClients.matchAll).toHaveBeenCalledWith({ includeUncontrolled: true, type: 'window' });
    });

    it('should handle install message type', async () => {
      mockEvent.data.type = 'install';
      const mockManifest = {
        files: ['/index.html', '/app.js'],
        app_version: {
          build_id: 'msg-install-hash',
          git_hash: 'msg-install-hash',
          version: '1.0.0',
          build_datetime_utc: '2024-01-01T00:00:00.000000+00:00'
        }
      };
      const page = { postMessage: vi.fn() };
      mockClients.matchAll.mockResolvedValue([page]);
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockManifest)
      });

      await handleMessage(mockEvent as unknown as ExtendableMessageEvent);

      expect(page.postMessage).toHaveBeenCalledWith({
        message: 'install_complete',
        latest_version: mockManifest.app_version,
        data_hashes: {}
      });
    });

    it('should handle unknown message type', async () => {
      mockEvent.data.type = 'unknown';

      await handleMessage(mockEvent as unknown as ExtendableMessageEvent);

      expect(mockEvent.source!.postMessage).not.toHaveBeenCalled();
    });

    it('should handle errors and send error message', async () => {
      mockEvent.data.type = 'update';
      mockFetch.mockRejectedValue(new Error('Update failed'));

      await handleMessage(mockEvent as unknown as ExtendableMessageEvent);

      expect(mockEvent.source!.postMessage).toHaveBeenCalledWith({
        message: 'error',
        error: 'Update failed'
      });
    });

    it('should handle missing event source', async () => {
      mockEvent.source = null;
      mockEvent.data.type = 'update';
      const mockManifest = {
        files: ['/index.html', '/app.js'],
        app_version: {
          build_id: 'msg-nosource-hash',
          git_hash: 'msg-nosource-hash',
          version: '1.1.0',
          build_datetime_utc: '2024-01-01T00:00:00.000000+00:00'
        }
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockManifest)
      });

      await handleMessage(mockEvent as unknown as ExtendableMessageEvent);

      // Should not throw and should not call postMessage when source is null
      expect(mockEvent.source).toBeNull();
    });
  });

  describe('update logs relayed to pages', () => {
    const manifest = {
      files: ['/index.html', '/app.js'],
      app_version: {
        build_id: 'log-hash',
        git_hash: 'log-hash',
        version: '1.2.0',
        build_datetime_utc: '2024-01-01T00:00:00.000000+00:00'
      }
    };
    let clientPostMessage: ReturnType<typeof vi.fn>;

    /** Entries relayed to the page, in emission order. */
    async function relayedEntries(): Promise<
      { runId: string; level: string; step: string; details?: Record<string, unknown> }[]
    > {
      await new Promise((resolve) => setTimeout(resolve, 0));
      return clientPostMessage.mock.calls
        .map(([message]) => message)
        .filter((message) => message.message === 'log')
        .map((message) => message.entry);
    }

    beforeEach(() => {
      clientPostMessage = vi.fn();
      mockClients.matchAll.mockResolvedValue([{ postMessage: clientPostMessage }]);
    });

    afterEach(() => {
      mockClients.matchAll.mockReset();
    });

    it('should relay the whole run (request, manifest, precache, activation, done) under one runId', async () => {
      mockFetch.mockImplementation((url: string) =>
        url === '/assets_list.json'
          ? Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(manifest) })
          : Promise.resolve({ ok: true, status: 200, headers: new Headers({ 'content-length': '10' }) })
      );

      await handleMessage(messageEvent({ type: 'update' }).event);
      const entries = await relayedEntries();

      expect(entries.map((entry) => entry.step)).toEqual([
        'request-received',
        'manifest-fetch-start',
        'manifest-loaded',
        'precache-start',
        'progress',
        'progress',
        'precache-done',
        'activate-start',
        'activated',
        'cleanup',
        'done'
      ]);
      expect(new Set(entries.map((entry) => entry.runId)).size).toBe(1);
      expect(entries.find((entry) => entry.step === 'manifest-loaded')!.details).toEqual(
        expect.objectContaining({ gitHash: 'log-hash', files: 2 })
      );
      expect(entries.filter((entry) => entry.step === 'progress').at(-1)!.details).toEqual(
        expect.objectContaining({ percent: 100, files: 2, total: 2, bytes: 20 })
      );
    });

    it('should relay the failing file with its HTTP status and the final failure', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/assets_list.json') {
          return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(manifest) });
        }
        if (url === '/app.js') {
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.resolve({ ok: true, status: 200 });
      });

      await handleMessage(messageEvent({ type: 'update' }).event);
      const entries = await relayedEntries();

      const fileFailed = entries.find((entry) => entry.step === 'file-failed')!;
      expect(fileFailed.level).toBe('error');
      expect(fileFailed.details).toEqual(expect.objectContaining({ path: '/app.js', status: 404, attempt: 1 }));
      expect(entries.map((entry) => entry.step)).toEqual(expect.arrayContaining(['precache-failed', 'failed']));
      expect(entries.map((entry) => entry.step)).not.toContain('activated');
    });

    it('should not break the update when relaying to pages fails', async () => {
      mockClients.matchAll.mockRejectedValue(new Error('no clients'));
      mockFetch.mockImplementation((url: string) =>
        url === '/assets_list.json'
          ? Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(manifest) })
          : Promise.resolve({ ok: true, status: 200 })
      );
      await handleMessage(messageEvent({ type: 'update' }).event);

      const controlCache = cacheStore.get(CONTROL_CACHE_NAME)!;
      expect(controlCache.put).toHaveBeenCalledWith(CONTROL_KEY, expect.anything());
    });
  });

  describe('precache robustness', () => {
    const manifest = {
      files: ['/index.html', '/app.js'],
      app_version: {
        build_id: 'rob-hash',
        git_hash: 'rob-hash',
        version: '1.3.0',
        build_datetime_utc: '2024-01-01T00:00:00.000000+00:00'
      }
    };
    const versionCacheName = 'app-assets-v-rob-hash';

    /** Serves the manifest; `onFile` answers every other request. */
    function serve(onFile: (url: string, init?: RequestInit) => unknown): void {
      mockFetch.mockImplementation((url: string, init?: RequestInit) =>
        url === '/assets_list.json'
          ? Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(manifest) })
          : onFile(url, init)
      );
    }

    const okResponse = () => Promise.resolve({ ok: true, status: 200 });
    const countCalls = (url: string) => mockFetch.mock.calls.filter(([calledUrl]) => calledUrl === url).length;

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should retry a transient 502 with an increasing delay and then succeed', async () => {
      vi.useFakeTimers();
      let appJsCalls = 0;
      serve((url) =>
        url === '/app.js' && ++appJsCalls <= 2 ? Promise.resolve({ ok: false, status: 502 }) : okResponse()
      );

      const run = installApp();
      await vi.advanceTimersByTimeAsync(1000);
      expect(appJsCalls).toBe(2);
      await vi.advanceTimersByTimeAsync(2000);
      await expect(run).resolves.toEqual(manifest);

      expect(appJsCalls).toBe(3);
    });

    it('should retry a network error', async () => {
      vi.useFakeTimers();
      let appJsCalls = 0;
      serve((url) =>
        url === '/app.js' && ++appJsCalls === 1 ? Promise.reject(new TypeError('Failed to fetch')) : okResponse()
      );

      const run = installApp();
      await vi.runAllTimersAsync();

      await expect(run).resolves.toEqual(manifest);
      expect(appJsCalls).toBe(2);
    });

    it('should give up after the maximum number of attempts and delete the candidate cache', async () => {
      vi.useFakeTimers();
      serve((url) => (url === '/app.js' ? Promise.resolve({ ok: false, status: 502 }) : okResponse()));

      const run = expect(installApp()).rejects.toThrow('Precache failed for /app.js: HTTP 502');
      await vi.runAllTimersAsync();
      await run;

      expect(countCalls('/app.js')).toBe(4);
      expect(mockCaches.delete).toHaveBeenCalledWith(versionCacheName);
    });

    it.each([
      ['401', { ok: false, status: 401 }, /HTTP 401 \(authentication required\)/],
      ['403', { ok: false, status: 403 }, /HTTP 403 \(authentication required\)/],
      [
        'redirect to login',
        { ok: false, status: 0, type: 'opaqueredirect' },
        /authentication required \(redirected to login\)/
      ]
    ])('should not retry a %s and report an authentication error', async (_label, response, message) => {
      serve((url) => (url === '/app.js' ? Promise.resolve(response) : okResponse()));

      await expect(installApp()).rejects.toThrow(message);

      expect(countCalls('/app.js')).toBe(1);
      expect(mockFetch).toHaveBeenCalledWith('/app.js', expect.objectContaining({ redirect: 'manual' }));
    });

    it('should not retry a stalled file and name it in the error', async () => {
      vi.useFakeTimers();
      serve((url, init) =>
        url === '/app.js'
          ? new Promise((_resolve, reject) =>
              init!.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
            )
          : okResponse()
      );

      const run = expect(installApp()).rejects.toThrow('Precache timed out for /app.js: no data received for 30s');
      await vi.advanceTimersByTimeAsync(30000);
      await run;

      expect(countCalls('/app.js')).toBe(1);
    });

    it('should download at most 5 files at the same time', async () => {
      const files = ['/index.html', ...Array.from({ length: 11 }, (_, i) => `/chunk-${i}.js`)];
      let inFlight = 0;
      let maxInFlight = 0;
      mockFetch.mockImplementation((url: string) => {
        if (url === '/assets_list.json') {
          return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue({ ...manifest, files }) });
        }
        maxInFlight = Math.max(maxInFlight, ++inFlight);
        return new Promise((resolve) =>
          setTimeout(() => {
            inFlight--;
            resolve({ ok: true, status: 200 });
          }, 5)
        );
      });

      await installApp();

      expect(maxInFlight).toBe(5);
      expect(versionCachePuts()).toEqual(expect.arrayContaining(files));
    });

    /** Paths written to the target version cache. */
    function versionCachePuts(): string[] {
      return cacheStore.get(versionCacheName)!.put.mock.calls.map(([path]) => path);
    }

    it('should resume a partial cache without downloading the files already stored', async () => {
      const partial = (await mockCaches.open(versionCacheName))!;
      partial.keys.mockResolvedValue([{ url: 'https://example.com/index.html' }]);
      serve(okResponse);

      await installApp();

      expect(countCalls('/index.html')).toBe(0);
      expect(countCalls('/app.js')).toBe(1);
      expect(versionCachePuts()).toContain('/app_version');
    });

    it('should not reuse the files of a complete cache (an /app_version marker is present)', async () => {
      const complete = (await mockCaches.open(versionCacheName))!;
      complete.match.mockImplementation(async (key: string) => (key === '/app_version' ? {} : undefined));
      complete.keys.mockResolvedValue([{ url: 'https://example.com/index.html' }]);
      serve(okResponse);

      await installApp();

      expect(countCalls('/index.html')).toBe(1);
    });
  });

  describe('message handling lifecycle', () => {
    const manifest = {
      files: ['/index.html'],
      app_version: {
        build_id: 'life-hash',
        git_hash: 'life-hash',
        version: '1.4.0',
        build_datetime_utc: '2024-01-01T00:00:00.000000+00:00'
      }
    };

    afterEach(() => {
      mockClients.matchAll.mockReset();
    });

    it('should hand the run to event.waitUntil so the browser keeps the SW alive', async () => {
      mockFetch.mockImplementation((url: string) =>
        url === '/assets_list.json'
          ? Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(manifest) })
          : Promise.resolve({ ok: true, status: 200 })
      );
      const { event, waitUntil } = messageEvent({ type: 'update' });

      const task = handleMessage(event);

      expect(waitUntil).toHaveBeenCalledWith(task);
      await task;
    });

    it('should run a single download when a second request arrives during a run', async () => {
      let releaseManifest!: () => void;
      const manifestGate = new Promise<void>((resolve) => {
        releaseManifest = resolve;
      });
      mockFetch.mockImplementation((url: string) =>
        url === '/assets_list.json'
          ? manifestGate.then(() => ({ ok: true, json: vi.fn().mockResolvedValue(manifest) }))
          : Promise.resolve({ ok: true, status: 200 })
      );
      const page = { postMessage: vi.fn() };
      mockClients.matchAll.mockResolvedValue([page]);
      const first = messageEvent({ type: 'update' });
      const second = messageEvent({ type: 'install' });

      const firstTask = handleMessage(first.event);
      const secondTask = handleMessage(second.event);
      releaseManifest();
      await Promise.all([firstTask, secondTask]);

      expect(mockFetch.mock.calls.filter(([url]) => url === '/assets_list.json')).toHaveLength(1);
      const completions = page.postMessage.mock.calls.filter(([m]) => /_complete$/.test(m.message));
      expect(completions).toHaveLength(1);
      expect(completions[0][0].message).toBe('update_complete');
    });

    it('should send a failure only to the page that asked for the run', async () => {
      const otherTab = { postMessage: vi.fn() };
      mockClients.matchAll.mockResolvedValue([otherTab]);
      mockFetch.mockRejectedValue(new Error('boom'));
      const requester = messageEvent({ type: 'update' });

      await handleMessage(requester.event);

      expect(requester.source!.postMessage).toHaveBeenCalledWith({ message: 'error', error: 'boom' });
      expect(otherTab.postMessage.mock.calls.filter(([m]) => m.message === 'error')).toHaveLength(0);
    });

    it('should allow a new run once the previous one has ended', async () => {
      mockFetch.mockImplementation((url: string) =>
        url === '/assets_list.json'
          ? Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(manifest) })
          : Promise.resolve({ ok: true, status: 200 })
      );

      await handleMessage(messageEvent({ type: 'update' }).event);
      await handleMessage(messageEvent({ type: 'update' }).event);

      expect(mockFetch.mock.calls.filter(([url]) => url === '/assets_list.json')).toHaveLength(2);
    });

    it('should keep the SW alive until the run ends on a keepalive message', async () => {
      let releaseManifest!: () => void;
      const manifestGate = new Promise<void>((resolve) => {
        releaseManifest = resolve;
      });
      mockFetch.mockImplementation((url: string) =>
        url === '/assets_list.json'
          ? manifestGate.then(() => ({ ok: true, json: vi.fn().mockResolvedValue(manifest) }))
          : Promise.resolve({ ok: true, status: 200 })
      );
      const runTask = handleMessage(messageEvent({ type: 'update' }).event);
      const keepalive = messageEvent({ type: 'keepalive' });

      const keepaliveTask = handleMessage(keepalive.event);
      const settled = vi.fn();
      void keepaliveTask.then(settled);
      await Promise.resolve();
      expect(settled).not.toHaveBeenCalled();

      releaseManifest();
      await Promise.all([runTask, keepaliveTask]);

      expect(keepalive.waitUntil).toHaveBeenCalledWith(keepaliveTask);
      expect(settled).toHaveBeenCalled();
    });

    it('should resolve a keepalive message immediately when no run is in progress', async () => {
      await expect(handleMessage(messageEvent({ type: 'keepalive' }).event)).resolves.toBeUndefined();
    });

    it('should answer a keepalive with run: null when no run is in progress', async () => {
      const keepalive = messageEvent({ type: 'keepalive' });

      await handleMessage(keepalive.event);

      expect(keepalive.source!.postMessage).toHaveBeenCalledWith({ message: 'progress', run: null });
    });

    it('should answer a keepalive with the progress of the running update', async () => {
      let releaseManifest!: () => void;
      const manifestGate = new Promise<void>((resolve) => {
        releaseManifest = resolve;
      });
      mockFetch.mockImplementation((url: string) =>
        url === '/assets_list.json'
          ? manifestGate.then(() => ({ ok: true, json: vi.fn().mockResolvedValue(manifest) }))
          : Promise.resolve({ ok: true, status: 200 })
      );
      const runTask = handleMessage(messageEvent({ type: 'update' }).event);
      const keepalive = messageEvent({ type: 'keepalive' });

      const keepaliveTask = handleMessage(keepalive.event);

      expect(keepalive.source!.postMessage).toHaveBeenCalledWith({
        message: 'progress',
        run: { runId: expect.any(String), type: 'update', filesTotal: 0, filesDone: 0 }
      });
      releaseManifest();
      await Promise.all([runTask, keepaliveTask]);
    });

    it('should broadcast a progress message each time the whole percentage changes', async () => {
      const page = { postMessage: vi.fn() };
      mockClients.matchAll.mockResolvedValue([page]);
      const files = ['/index.html', '/a.js', '/b.js', '/c.js'];
      mockFetch.mockImplementation((url: string) =>
        url === '/assets_list.json'
          ? Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue({ ...manifest, files }) })
          : Promise.resolve({ ok: true, status: 200 })
      );

      await handleMessage(messageEvent({ type: 'update' }).event);

      const percents = page.postMessage.mock.calls
        .map(([m]) => m)
        .filter((m) => m.message === 'progress')
        .map((m) => Math.floor((m.run.filesDone * 100) / m.run.filesTotal));
      expect(percents).toEqual([0, 25, 50, 75, 100]);
    });

    it('should report the running update, the activation pointer and the caches on a status message', async () => {
      await seedControlState({ active: 'app-assets-v-current', previous: null });
      let releaseManifest!: () => void;
      const manifestGate = new Promise<void>((resolve) => {
        releaseManifest = resolve;
      });
      mockFetch.mockImplementation((url: string) =>
        url === '/assets_list.json'
          ? manifestGate.then(() => ({ ok: true, json: vi.fn().mockResolvedValue(manifest) }))
          : Promise.resolve({ ok: true, status: 200 })
      );
      const runTask = handleMessage(messageEvent({ type: 'update' }).event);
      const status = messageEvent({ type: 'status' });

      await handleMessage(status.event);

      expect(status.source!.postMessage).toHaveBeenCalledWith({
        message: 'status',
        status: {
          run: expect.objectContaining({ type: 'update', filesTotal: 0, filesDone: 0 }),
          control: { active: 'app-assets-v-current', previous: null },
          caches: expect.arrayContaining([CONTROL_CACHE_NAME])
        }
      });
      releaseManifest();
      await runTask;

      const idle = messageEvent({ type: 'status' });
      await handleMessage(idle.event);
      expect(idle.source!.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ status: expect.objectContaining({ run: null }) })
      );
    });
  });
});
