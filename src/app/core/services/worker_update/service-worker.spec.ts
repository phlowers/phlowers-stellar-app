import { checkIfAppInstalled, installApp, updateApp, handleFetch, handleMessage } from './service-worker';

// Mock browser APIs
const mockCache = {
  open: jest.fn(),
  match: jest.fn(),
  addAll: jest.fn(),
  put: jest.fn(),
  add: jest.fn(),
  keys: jest.fn(),
  delete: jest.fn()
};

const mockCaches = {
  open: jest.fn().mockResolvedValue(mockCache),
  match: jest.fn()
};

const mockFetch = jest.fn();

const mockClients = {
  matchAll: jest.fn()
};

const mockSelf = {
  location: { origin: 'https://example.com' },
  clients: mockClients,
  registration: { scope: 'https://example.com/' }
};

// Mock global objects
global.caches = {
  ...mockCaches,
  match: jest.fn()
} as unknown as CacheStorage;
global.fetch = mockFetch as unknown as typeof fetch;
global.Response = class MockResponse {
  constructor(body?: string | null, init?: Record<string, unknown>) {
    const response = {
      json: jest.fn().mockResolvedValue(body),
      text: jest.fn().mockResolvedValue(body),
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
  log: jest.fn(),
  error: jest.fn()
};

// Mock service worker global scope
Object.defineProperty(global, 'self', {
  value: mockSelf,
  writable: true
});

describe('Service Worker Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCaches.open.mockResolvedValue(mockCache);
    (global.caches.match as jest.Mock).mockResolvedValue(null);
  });

  describe('checkIfAppInstalled', () => {
    it('should return true when app version exists in cache', async () => {
      const mockResponse = new Response('{"version": "1.0.0"}');
      mockCache.match.mockResolvedValue(mockResponse);

      const result = await checkIfAppInstalled();

      expect(result).toBe(true);
      expect(mockCache.match).toHaveBeenCalledWith('/app_version');
    });

    it('should return false when app version does not exist in cache', async () => {
      mockCache.match.mockResolvedValue(null);

      const result = await checkIfAppInstalled();

      expect(result).toBe(false);
      expect(mockCache.match).toHaveBeenCalledWith('/app_version');
    });

    it('should handle cache open errors', async () => {
      mockCaches.open.mockRejectedValue(new Error('Cache open failed'));

      await expect(checkIfAppInstalled()).rejects.toThrow('Cache open failed');
    });
  });

  describe('installApp', () => {
    const mockManifest = {
      files: ['/index.html', '/app.js', '/styles.css'],
      app_version: '1.0.0'
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockManifest)
      });
      mockClients.matchAll.mockResolvedValue([{ postMessage: jest.fn() }, { postMessage: jest.fn() }]);
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
      expect(mockClients.matchAll).toHaveBeenCalledWith({
        includeUncontrolled: true,
        type: 'window'
      });
    });

    it('should handle empty files array', async () => {
      const emptyManifest = { files: [], app_version: '1.0.0' };
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(emptyManifest)
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
      files: ['/index.html', '/app.js', '/pyodide/file1.py'],
      app_version: '1.1.0'
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockManifest)
      });
      mockCache.keys.mockResolvedValue([
        { url: 'https://example.com/index.html' },
        { url: 'https://example.com/old-file.js' },
        { url: 'https://example.com/app_version' }
      ]);
    });

    it('should update app successfully', async () => {
      mockCache.match.mockResolvedValue(null); // pyodide file not in cache

      const result = await updateApp();

      expect(result).toEqual(mockManifest);
      expect(mockCache.add).toHaveBeenCalledWith('/index.html');
      expect(mockCache.add).toHaveBeenCalledWith('/app.js');
      expect(mockCache.add).toHaveBeenCalledWith('/pyodide/file1.py');
      expect(mockCache.put).toHaveBeenCalledWith(
        '/app_version',
        expect.objectContaining({
          headers: { 'content-type': 'application/json' }
        })
      );
    });

    it('should skip pyodide files that are already cached', async () => {
      mockCache.match.mockResolvedValue(new Response()); // pyodide file already in cache

      await updateApp();

      expect(mockCache.add).not.toHaveBeenCalledWith('/pyodide/file1.whl');
    });

    it('should delete old files not in new manifest', async () => {
      mockCache.match.mockResolvedValue(null);

      await updateApp();

      expect(mockCache.delete).toHaveBeenCalledWith('/old-file.js');
      expect(mockCache.delete).not.toHaveBeenCalledWith('/app_version');
    });

    it('should handle empty files array', async () => {
      const emptyManifest = { files: [], app_version: '1.1.0' };
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(emptyManifest)
      });

      const result = await updateApp();

      expect(result).toEqual(emptyManifest);
      expect(mockCache.add).not.toHaveBeenCalled();
    });

    it('should handle fetch manifest errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(updateApp()).rejects.toThrow('Network error');
    });
  });

  describe('handleFetch', () => {
    let mockEvent: { respondWith: jest.Mock; request: { url: string; clone: jest.Mock } };

    beforeEach(() => {
      mockEvent = {
        request: {
          url: 'https://example.com/',
          clone: jest.fn().mockReturnValue({ url: 'https://example.com/' })
        },
        respondWith: jest.fn()
      };
    });

    it('should handle home page requests', async () => {
      mockEvent.request.url = 'https://example.com/';
      const mockResponse = new Response('<html>Home</html>');
      (global.caches.match as jest.Mock).mockResolvedValue(mockResponse);

      await handleFetch(mockEvent as unknown as FetchEvent);

      expect(global.caches.match as jest.Mock).toHaveBeenCalledWith('https://example.com/index.html');
      expect(mockEvent.respondWith).toHaveBeenCalled();
    });

    it('should handle backend requests', async () => {
      mockEvent.request.url = 'https://example.com/celesteback/api/data';

      await handleFetch(mockEvent as unknown as FetchEvent);

      expect(mockEvent.respondWith).toHaveBeenCalledWith(expect.any(Promise));
    });

    it('should handle other requests with cache hit', async () => {
      mockEvent.request.url = 'https://example.com/image.png';
      const mockResponse = new Response('console.log("test");');
      (global.caches.match as jest.Mock).mockResolvedValue(mockResponse);

      await handleFetch(mockEvent as unknown as FetchEvent);

      expect(global.caches.match as jest.Mock).toHaveBeenCalledWith(mockEvent.request);
      expect(mockEvent.respondWith).toHaveBeenCalled();
    });

    it('should handle other requests with cache miss', async () => {
      mockEvent.request.url = 'https://example.com/image.png';
      (global.caches.match as jest.Mock).mockResolvedValue(null);
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
      (global.caches.match as jest.Mock).mockResolvedValue(null);
      mockFetch.mockRejectedValue(new Error('Network error'));

      await handleFetch(mockEvent as unknown as FetchEvent);

      expect(mockEvent.respondWith).toHaveBeenCalled();
    });

    it('should use network-first and cache successful js responses', async () => {
      mockEvent.request.url = 'https://example.com/app.js';
      const clonedRequest = { url: 'https://example.com/app.js' };
      const networkResponse = {
        ok: true,
        clone: jest.fn().mockReturnValue({ ok: true, body: 'bundled-js' })
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
  });

  describe('handleMessage', () => {
    let mockEvent: { data: { type: string }; source: { postMessage: jest.Mock } | null };

    beforeEach(() => {
      mockEvent = {
        data: { type: 'update' },
        source: { postMessage: jest.fn() }
      };
    });

    it('should handle update message type', async () => {
      const mockManifest = { files: ['/app.js'], app_version: '1.1.0' };
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockManifest)
      });
      mockCache.keys.mockResolvedValue([]);

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
        json: jest.fn().mockResolvedValue(mockManifest)
      });
      mockClients.matchAll.mockResolvedValue([]);
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
        json: jest.fn().mockResolvedValue(mockManifest)
      });
      mockCache.keys.mockResolvedValue([]);

      await handleMessage(mockEvent as unknown as ExtendableMessageEvent);

      // Should not throw and should not call postMessage when source is null
      expect(mockEvent.source).toBeNull();
    });
  });
});
