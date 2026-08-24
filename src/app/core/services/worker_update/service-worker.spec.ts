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

describe('Service Worker Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCaches.open.mockResolvedValue(mockCache);
    mockCaches.delete.mockResolvedValue(true);
    mockCache.keys.mockResolvedValue([]);
    (global.caches.match as vi.Mock).mockResolvedValue(null);
  });

  describe('installApp', () => {
    const mockManifest = {
      files: ['/index.html', '/app.js', '/styles.css'],
      app_version: { git_hash: 'v1-hash', version: '1.0.0', build_datetime_utc: '2024-01-01T00:00:00.000000+00:00' }
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
      for (const file of mockManifest.files) {
        expect(mockFetch).toHaveBeenCalledWith(file, { cache: 'no-store' });
        expect(mockCache.put).toHaveBeenCalledWith(file, expect.objectContaining({ ok: true }));
      }
      expect(mockCache.put).toHaveBeenCalledWith(
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
        app_version: { git_hash: 'v1-empty', version: '1.0.0', build_datetime_utc: '2024-01-01T00:00:00.000000+00:00' }
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(emptyManifest)
      });

      await expect(installApp()).rejects.toThrow(/manifest is empty or missing \/index\.html/i);

      // Only the manifest itself was fetched — no per-file fetch for an empty list.
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch manifest errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(installApp()).rejects.toThrow('Network error');
    });

    it('should abort install when a single file fails to precache (e.g. 502 during a rolling redeploy)', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/assets_list.json') {
          return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(mockManifest) });
        }
        if (url === '/app.js') {
          return Promise.resolve({ ok: false, status: 502 });
        }
        return Promise.resolve({ ok: true, status: 200 });
      });

      await expect(installApp()).rejects.toThrow('Precache failed for /app.js: HTTP 502');

      // A failed install must never mark itself as done.
      expect(mockCache.put).not.toHaveBeenCalledWith('/app_version', expect.anything());
    });

    it('should throw identifying the file when every file fails to precache', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/assets_list.json') {
          return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(mockManifest) });
        }
        return Promise.resolve({ ok: false, status: 502 });
      });

      await expect(installApp()).rejects.toThrow(/Precache failed for .+: HTTP 502/);
    });
  });

  describe('updateApp', () => {
    const mockManifest = {
      files: ['/index.html', '/app.js', '/pyodide/file1.whl'],
      app_version: { git_hash: 'v2-hash', version: '1.1.0', build_datetime_utc: '2024-02-01T00:00:00.000000+00:00' }
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
      // Must delete the entire cache first
      expect(mockCaches.delete).toHaveBeenCalledWith('app-assets');
      // Then reopen and cache each file individually
      expect(mockCaches.open).toHaveBeenCalledWith('app-assets');
      for (const file of mockManifest.files) {
        expect(mockCache.put).toHaveBeenCalledWith(file, expect.objectContaining({ ok: true }));
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

      // All files including .whl should be individually re-fetched and cached (full reset)
      for (const file of manifestWithWheels.files) {
        expect(mockCache.put).toHaveBeenCalledWith(file, expect.objectContaining({ ok: true }));
      }
    });

    it('should reject an empty manifest instead of activating an incomplete version', async () => {
      const emptyManifest = {
        files: [],
        app_version: { git_hash: 'v2-empty', version: '1.1.0', build_datetime_utc: '2024-02-01T00:00:00.000000+00:00' }
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(emptyManifest)
      });

      const result = await updateApp();

      expect(result).toEqual(emptyManifest);
      expect(mockCaches.delete).toHaveBeenCalledWith('app-assets');
      // Only the manifest itself was fetched — no per-file fetch for an empty list.
      expect(mockFetch).toHaveBeenCalledTimes(1);
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

    it('should abort the update and roll back the temp cache when a single file fails to precache', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/assets_list.json') {
          return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue(mockManifest) });
        }
        if (url === '/app.js') {
          return Promise.resolve({ ok: false, status: 502 });
        }
        return Promise.resolve({ ok: true, status: 200 });
      });

      await expect(updateApp()).rejects.toThrow('Precache failed for /app.js: HTTP 502');

      // The temp cache is cleaned up but the live cache must never be touched.
      expect(mockCaches.delete).toHaveBeenCalledWith('app-assets-tmp');
      expect(mockCaches.delete).not.toHaveBeenCalledWith('app-assets');
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
    let mockEvent: { data: { type: string }; source: { postMessage: vi.Mock } | null };

    beforeEach(() => {
      mockEvent = {
        data: { type: 'update' },
        source: { postMessage: vi.fn() }
      };
    });

    it('should handle update message type', async () => {
      const mockManifest = {
        files: ['/index.html', '/app.js'],
        app_version: {
          git_hash: 'msg-update-hash',
          version: '1.1.0',
          build_datetime_utc: '2024-01-01T00:00:00.000000+00:00'
        }
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockManifest)
      });

      await handleMessage(mockEvent as unknown as ExtendableMessageEvent);

      expect(mockEvent.source!.postMessage).toHaveBeenCalledWith({
        message: 'update_complete',
        latest_version: mockManifest.app_version,
        data_hashes: {}
      });
    });

    it('should handle install message type', async () => {
      mockEvent.data.type = 'install';
      const mockManifest = {
        files: ['/index.html', '/app.js'],
        app_version: {
          git_hash: 'msg-install-hash',
          version: '1.0.0',
          build_datetime_utc: '2024-01-01T00:00:00.000000+00:00'
        }
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockManifest)
      });

      await handleMessage(mockEvent as unknown as ExtendableMessageEvent);

      expect(mockEvent.source!.postMessage).toHaveBeenCalledWith({
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
});
