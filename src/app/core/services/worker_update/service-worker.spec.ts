import { installApp, updateApp, handleFetch, handleMessage } from './service-worker';

// Mock browser APIs
const mockCache = {
  open: vi.fn(),
  match: vi.fn(),
  addAll: vi.fn(),
  put: vi.fn(),
  add: vi.fn(),
  keys: vi.fn(),
  delete: vi.fn()
};

const mockCaches = {
  open: vi.fn().mockResolvedValue(mockCache),
  match: vi.fn(),
  delete: vi.fn().mockResolvedValue(true)
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
global.caches = {
  ...mockCaches,
  match: vi.fn(),
  delete: mockCaches.delete
} as unknown as CacheStorage;
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

describe('Service Worker Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCaches.open.mockResolvedValue(mockCache);
    mockCaches.delete.mockResolvedValue(true);
    mockCache.addAll.mockResolvedValue(undefined);
    mockCache.keys.mockResolvedValue([]);
    (global.caches.match as vi.Mock).mockResolvedValue(null);
  });

  describe('installApp', () => {
    const mockManifest = {
      files: ['/index.html', '/app.js', '/styles.css'],
      app_version: '1.0.0'
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockManifest)
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
      expect(mockCache.addAll).toHaveBeenCalledWith(mockManifest.files);
      expect(mockCache.put).toHaveBeenCalledWith(
        '/app_version',
        expect.objectContaining({
          headers: { 'content-type': 'application/json' }
        })
      );
    });

    it('should throw when manifest response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404
      });

      await expect(installApp()).rejects.toThrow('Manifest fetch failed with status 404');
    });

    it('should handle empty files array', async () => {
      const emptyManifest = { files: [], app_version: '1.0.0' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(emptyManifest)
      });

      await installApp();

      expect(mockCache.addAll).toHaveBeenCalledWith([]);
    });

    it('should handle fetch manifest errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(installApp()).rejects.toThrow('Network error');
    });

    it('should handle cache operations errors', async () => {
      mockCache.addAll.mockRejectedValue(new Error('Cache add failed'));

      await expect(installApp()).rejects.toThrow('Cache add failed');
    });
  });

  describe('updateApp', () => {
    const mockManifest = {
      files: ['/index.html', '/app.js', '/pyodide/file1.whl'],
      app_version: '1.1.0'
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockManifest)
      });
    });

    it('should perform a full cache reset and re-cache all files', async () => {
      const result = await updateApp();

      expect(result).toEqual(mockManifest);
      // Must delete the entire cache first
      expect(mockCaches.delete).toHaveBeenCalledWith('app-assets');
      // Then reopen and addAll
      expect(mockCaches.open).toHaveBeenCalledWith('app-assets');
      expect(mockCache.addAll).toHaveBeenCalledWith(mockManifest.files);
      // Store new version
      expect(mockCache.put).toHaveBeenCalledWith(
        '/app_version',
        expect.objectContaining({
          headers: { 'content-type': 'application/json' }
        })
      );
    });

    it('should re-download Python wheels (no incremental caching)', async () => {
      const manifestWithWheels = {
        files: ['/index.html', '/pyodide/numpy.whl', '/pyodide/pandas.whl'],
        app_version: '1.1.0'
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(manifestWithWheels)
      });

      await updateApp();

      // All files including .whl should be in addAll (full reset)
      expect(mockCache.addAll).toHaveBeenCalledWith(manifestWithWheels.files);
    });

    it('should handle empty files array', async () => {
      const emptyManifest = { files: [], app_version: '1.1.0' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(emptyManifest)
      });

      const result = await updateApp();

      expect(result).toEqual(emptyManifest);
      expect(mockCaches.delete).toHaveBeenCalledWith('app-assets');
      expect(mockCache.addAll).toHaveBeenCalledWith([]);
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

    it('should bypass /auth/userinfo completely (no cache access)', async () => {
      mockEvent.request.url = 'https://example.com/auth/userinfo';
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      await handleFetch(mockEvent as unknown as FetchEvent);

      expect(mockEvent.respondWith).toHaveBeenCalled();
      // Cache must not be accessed for bypass routes
      expect(mockCaches.open).not.toHaveBeenCalled();
    });

    it('should bypass /auth/callback completely', async () => {
      mockEvent.request.url = 'https://example.com/auth/callback';
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      await handleFetch(mockEvent as unknown as FetchEvent);

      expect(mockEvent.respondWith).toHaveBeenCalled();
      expect(mockCaches.open).not.toHaveBeenCalled();
    });

    it('should bypass /assets_list.json completely (no cache access)', async () => {
      mockEvent.request.url = 'https://example.com/assets_list.json';
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      await handleFetch(mockEvent as unknown as FetchEvent);

      expect(mockEvent.respondWith).toHaveBeenCalled();
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

      expect(mockCache.put).not.toHaveBeenCalled();
    });
  });

  describe('handleFetch — home page network-first with 3xx passthrough', () => {
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
      expect(mockCache.put).not.toHaveBeenCalled();
    });

    it('should cache 200 home page response', async () => {
      const okResponse = { ok: true, status: 200, clone: vi.fn().mockReturnThis() };
      mockFetch.mockResolvedValue(okResponse);

      await handleFetch(mockEvent as unknown as FetchEvent);

      const responsePromise = mockEvent.respondWith.mock.calls[0][0];
      await responsePromise;

      expect(mockCache.put).toHaveBeenCalled();
    });

    it('should fall back to cache when network fails for home page', async () => {
      mockFetch.mockRejectedValue(new Error('Network down'));
      const cachedIndex = { ok: true, status: 200 };
      mockCache.match.mockResolvedValue(cachedIndex);

      await handleFetch(mockEvent as unknown as FetchEvent);

      const responsePromise = mockEvent.respondWith.mock.calls[0][0];
      const response = await responsePromise;

      expect(response).toBe(cachedIndex);
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
      (global.caches.match as vi.Mock).mockResolvedValue(mockResponse);

      await handleFetch(mockEvent as unknown as FetchEvent);

      expect(global.caches.match as vi.Mock).toHaveBeenCalledWith(mockEvent.request);
      expect(mockEvent.respondWith).toHaveBeenCalled();
    });

    it('should handle other requests with cache miss', async () => {
      mockEvent.request.url = 'https://example.com/image.png';
      (global.caches.match as vi.Mock).mockResolvedValue(null);
      mockFetch.mockResolvedValue(new Response('console.log("test");'));
      const clonedRequest = { url: 'https://example.com/image.png' };
      mockEvent.request.clone.mockReturnValue(clonedRequest);

      await handleFetch(mockEvent as unknown as FetchEvent);

      expect(mockFetch).toHaveBeenCalledWith(
        clonedRequest,
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Object)
        })
      );
      expect(mockEvent.respondWith).toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
      mockEvent.request.url = 'https://example.com/image.png';
      (global.caches.match as vi.Mock).mockResolvedValue(null);
      mockFetch.mockRejectedValue(new Error('Network error'));

      await handleFetch(mockEvent as unknown as FetchEvent);

      expect(mockEvent.respondWith).toHaveBeenCalled();
    });

    it('should use network-first and cache successful js responses', async () => {
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
      expect(mockCache.put).toHaveBeenCalledWith(mockEvent.request, expect.any(Object));
      expect(networkResponse.clone).toHaveBeenCalled();
    });

    it('should use network-first and fall back to cache on network failure', async () => {
      mockEvent.request.url = 'https://example.com/styles.css';
      const clonedRequest = { url: 'https://example.com/styles.css' };
      const cachedResponse = { from: 'cache' };
      mockEvent.request.clone.mockReturnValue(clonedRequest);
      mockFetch.mockRejectedValue(new Error('Network down'));
      mockCache.match.mockResolvedValue(cachedResponse as unknown as globalThis.Response);

      await handleFetch(mockEvent as unknown as FetchEvent);

      expect(mockEvent.respondWith).toHaveBeenCalled();
      const responsePromise = mockEvent.respondWith.mock.calls[0][0];
      const response = await responsePromise;

      expect(response).toBe(cachedResponse);
      expect(mockCache.match).toHaveBeenCalledWith(mockEvent.request);
    });

    it('should NOT pass an AbortSignal to fetch when there is no cached fallback', async () => {
      // Regression guard for the login-then-chunk-load bug: when the cache
      // is empty (first install), the SW must not artificially abort the
      // network request after 3s. It should issue a plain fetch that waits
      // for the real network response.
      mockEvent.request.url = 'https://example.com/chunk-KJVBLZQZ.js';
      const clonedRequest = { url: 'https://example.com/chunk-KJVBLZQZ.js' };
      const networkResponse = {
        ok: true,
        clone: vi.fn().mockReturnValue({ ok: true })
      };
      mockEvent.request.clone.mockReturnValue(clonedRequest);
      mockCache.match.mockResolvedValue(undefined);
      mockFetch.mockResolvedValue(networkResponse as unknown as globalThis.Response);

      await handleFetch(mockEvent as unknown as FetchEvent);
      await mockEvent.respondWith.mock.calls[0][0];

      const fetchInit = mockFetch.mock.calls[0][1] as RequestInit;
      expect(fetchInit.signal).toBeUndefined();
    });

    it('should pass an AbortSignal to fetch when a cached fallback exists', async () => {
      // The 3s timeout is still desirable when we have a safe cache fallback,
      // because it lets offline users get a fast response.
      mockEvent.request.url = 'https://example.com/styles.css';
      const clonedRequest = { url: 'https://example.com/styles.css' };
      const cachedResponse = { from: 'cache' };
      const networkResponse = {
        ok: true,
        clone: vi.fn().mockReturnValue({ ok: true })
      };
      mockEvent.request.clone.mockReturnValue(clonedRequest);
      mockCache.match.mockResolvedValue(cachedResponse as unknown as globalThis.Response);
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
      mockCache.match.mockResolvedValue(undefined);
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
      const mockManifest = { files: ['/app.js'], app_version: '1.1.0' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockManifest)
      });

      await handleMessage(mockEvent as unknown as ExtendableMessageEvent);

      expect(mockEvent.source!.postMessage).toHaveBeenCalledWith({
        message: 'update_complete',
        latest_version: '1.1.0',
        data_hashes: {}
      });
    });

    it('should handle install message type', async () => {
      mockEvent.data.type = 'install';
      const mockManifest = { files: ['/app.js'], app_version: '1.0.0' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockManifest)
      });
      mockCache.addAll.mockResolvedValue(undefined);

      await handleMessage(mockEvent as unknown as ExtendableMessageEvent);

      expect(mockEvent.source!.postMessage).toHaveBeenCalledWith({
        message: 'install_complete',
        latest_version: '1.0.0',
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
      const mockManifest = { files: ['/app.js'], app_version: '1.1.0' };
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
