import {
  checkIfAppInstalled,
  installApp,
  updateApp,
  handleFetch,
  handleMessage
} from './service-worker';

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
} as any;
global.fetch = mockFetch as any;
global.Response = class Response {
  constructor(body?: any, init?: any) {
    const response = {
      json: jest.fn().mockResolvedValue(body),
      text: jest.fn().mockResolvedValue(body),
      ...init
    };
    return response as any;
  }
  static error() {
    return new Response('Error', { status: 500 });
  }
} as any;
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
    (global.caches as any).match.mockResolvedValue(null);
  });

  describe('checkIfAppInstalled', () => {
    it('should return true when app version exists in cache', async () => {
      const mockResponse = new Response('{"version": "1.0.0"}');
      mockCache.match.mockResolvedValue(mockResponse);

      const result = await checkIfAppInstalled();

      expect(result).toBe(true);
      expect(mockCache.match).toHaveBeenCalledWith('app_version');
    });

    it('should return false when app version does not exist in cache', async () => {
      mockCache.match.mockResolvedValue(null);

      const result = await checkIfAppInstalled();

      expect(result).toBe(false);
      expect(mockCache.match).toHaveBeenCalledWith('app_version');
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
      mockClients.matchAll.mockResolvedValue([
        { postMessage: jest.fn() },
        { postMessage: jest.fn() }
      ]);
    });

    it('should install app successfully', async () => {
      await installApp();

      expect(mockFetch).toHaveBeenCalledWith('/assets_list.json');
      expect(mockCache.addAll).toHaveBeenCalledWith(mockManifest.files);
      expect(mockCache.put).toHaveBeenCalledWith(
        'app_version',
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

      expect(result).toBe('1.1.0');
      expect(mockCache.add).toHaveBeenCalledWith('/index.html');
      expect(mockCache.add).toHaveBeenCalledWith('/app.js');
      expect(mockCache.add).toHaveBeenCalledWith('/pyodide/file1.py');
      expect(mockCache.put).toHaveBeenCalledWith(
        'app_version',
        expect.objectContaining({
          headers: { 'content-type': 'application/json' }
        })
      );
    });

    it('should skip pyodide files that are already cached', async () => {
      mockCache.match.mockResolvedValue(new Response()); // pyodide file already in cache

      await updateApp();

      expect(mockCache.add).not.toHaveBeenCalledWith('/pyodide/file1.py');
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

      expect(result).toBe('1.1.0');
      expect(mockCache.add).not.toHaveBeenCalled();
    });

    it('should handle fetch manifest errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(updateApp()).rejects.toThrow('Network error');
    });
  });

  describe('handleFetch', () => {
    let mockEvent: any;

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
      (global.caches as any).match.mockResolvedValue(mockResponse);

      await handleFetch(mockEvent);

      expect((global.caches as any).match).toHaveBeenCalledWith(
        'https://example.com/index.html'
      );
      expect(mockEvent.respondWith).toHaveBeenCalled();
    });

    it('should handle backend requests', async () => {
      mockEvent.request.url = 'https://example.com/celesteback/api/data';

      await handleFetch(mockEvent);

      expect(mockEvent.respondWith).toHaveBeenCalledWith(expect.any(Promise));
    });

    it('should handle other requests with cache hit', async () => {
      mockEvent.request.url = 'https://example.com/app.js';
      const mockResponse = new Response('console.log("test");');
      (global.caches as any).match.mockResolvedValue(mockResponse);

      await handleFetch(mockEvent);

      expect((global.caches as any).match).toHaveBeenCalledWith(
        mockEvent.request
      );
      expect(mockEvent.respondWith).toHaveBeenCalled();
    });

    it('should handle other requests with cache miss', async () => {
      mockEvent.request.url = 'https://example.com/app.js';
      (global.caches as any).match.mockResolvedValue(null);
      mockFetch.mockResolvedValue(new Response('console.log("test");'));

      await handleFetch(mockEvent);

      expect(mockFetch).toHaveBeenCalledWith(mockEvent.request.clone());
      expect(mockEvent.respondWith).toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
      mockEvent.request.url = 'https://example.com/app.js';
      (global.caches as any).match.mockResolvedValue(null);
      mockFetch.mockRejectedValue(new Error('Network error'));

      await handleFetch(mockEvent);

      expect(mockEvent.respondWith).toHaveBeenCalled();
    });
  });

  describe('handleMessage', () => {
    let mockEvent: any;

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

      await handleMessage(mockEvent);

      expect(mockEvent.source.postMessage).toHaveBeenCalledWith({
        message: 'update_complete',
        latest_version: '1.1.0'
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

      await handleMessage(mockEvent);

      expect(mockEvent.source.postMessage).toHaveBeenCalledWith({
        message: 'install_complete',
        latest_version: '1.0.0'
      });
    });

    it('should handle unknown message type', async () => {
      mockEvent.data.type = 'unknown';

      await handleMessage(mockEvent);

      expect(mockEvent.source.postMessage).not.toHaveBeenCalled();
    });

    it('should handle errors and send error message', async () => {
      mockEvent.data.type = 'update';
      mockFetch.mockRejectedValue(new Error('Update failed'));

      await handleMessage(mockEvent);

      expect(mockEvent.source.postMessage).toHaveBeenCalledWith({
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

      await handleMessage(mockEvent);

      // Should not throw and should not call postMessage when source is null
      expect(mockEvent.source).toBeNull();
    });
  });
});
