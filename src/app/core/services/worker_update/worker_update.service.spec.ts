import { TestBed } from '@angular/core/testing';
import { UpdateService } from './worker_update.service';
import { MessageService } from 'primeng/api';

vi.mock('@src/environments/environment', () => ({
  environment: {
    version: '1.0.0',
    buildTime: '2024-01-01T00:00:00.000000',
    gitHash: 'env-hash-123'
  }
}));

describe('UpdateService', () => {
  let service: UpdateService;
  let mockServiceWorker: {
    addEventListener: vi.Mock;
    getRegistration: vi.Mock;
    ready: Promise<ServiceWorkerRegistration>;
  };
  let mockCaches: { open: vi.Mock; delete: vi.Mock };
  let mockCache: { match: vi.Mock };
  let mockFetch: vi.Mock & typeof fetch;
  let originalServiceWorker: ServiceWorkerContainer;
  let originalCaches: CacheStorage;
  let originalFetch: typeof fetch;
  let mockMessageService: MessageService;
  let mockPostMessage: vi.Mock;

  beforeEach(() => {
    mockMessageService = {
      add: vi.fn()
    } as unknown as MessageService;

    mockPostMessage = vi.fn();
    const mockRegistration = { active: { postMessage: mockPostMessage } };

    // Mock service worker
    mockServiceWorker = {
      addEventListener: vi.fn(),
      getRegistration: vi.fn().mockResolvedValue(mockRegistration),
      ready: Promise.resolve(mockRegistration as unknown as ServiceWorkerRegistration)
    };
    originalServiceWorker = navigator.serviceWorker;
    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockServiceWorker,
      writable: true
    });

    // Mock caches
    mockCache = {
      match: vi.fn()
    };
    mockCaches = {
      open: vi.fn().mockResolvedValue(mockCache),
      delete: vi.fn().mockResolvedValue(true)
    };
    originalCaches = globalThis.caches;
    Object.defineProperty(globalThis, 'caches', {
      value: mockCaches,
      writable: true
    });

    // Mock fetch
    mockFetch = vi.fn() as vi.Mock & typeof fetch;
    originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;

    TestBed.configureTestingModule({
      providers: [UpdateService, { provide: MessageService, useValue: mockMessageService }]
    });
    service = TestBed.inject(UpdateService);
    service.latestVersion.set(null);
  });

  afterEach(() => {
    // Restore original objects
    Object.defineProperty(navigator, 'serviceWorker', {
      value: originalServiceWorker,
      writable: true
    });
    Object.defineProperty(globalThis, 'caches', {
      value: originalCaches,
      writable: true
    });
    globalThis.fetch = originalFetch;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize currentVersion from environment', () => {
    expect(service.currentVersion()).toEqual({
      version: '1.0.0',
      build_datetime_utc: '2024-01-01T00:00:00.000000',
      git_hash: 'env-hash-123'
    });
  });

  it('should register service worker event listener on initialization', () => {
    expect(mockServiceWorker.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('should NOT handle worker_ready message (listener removed in V2)', () => {
    const messageHandler: (event: { data: Record<string, unknown> }) => void = mockServiceWorker.addEventListener.mock
      .calls[0][1] as (event: { data: Record<string, unknown> }) => void;
    const checkAppVersionSpy = vi.spyOn(service, 'checkAppVersion');

    messageHandler({ data: { message: 'worker_ready' } });

    // worker_ready no longer triggers checkAppVersion
    expect(checkAppVersionSpy).not.toHaveBeenCalled();
  });

  describe('checkAppVersion', () => {
    it('should fetch latest version from assets_list.json', async () => {
      const mockLatestVersion = {
        git_hash: 'abc123',
        build_datetime_utc: '2023-01-01T00:00:00.000000',
        version: '2.0.0'
      };
      const mockAssetList = {
        app_version: mockLatestVersion,
        files: ['file1.js', 'file2.css']
      };

      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce(mockAssetList)
      });

      service.pendingAction.set('none');

      await service.checkAppVersion();

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
      expect(service.latestVersion()).toEqual(mockLatestVersion);
    });

    it('should detect update needed when server version differs', async () => {
      const mockLatestVersion = {
        git_hash: 'abc123',
        build_datetime_utc: '2023-01-01T00:00:00.000000',
        version: '2.0.0'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          app_version: mockLatestVersion,
          files: ['file1.js', 'file2.css']
        })
      });

      await service.checkAppVersion();

      expect(service.latestVersion()).toEqual(mockLatestVersion);
      expect(service.needUpdate()).toBe(true);
    });

    it('should detect no update needed when versions match', async () => {
      const mockLatestVersion = {
        git_hash: 'env-hash-123',
        build_datetime_utc: '2024-01-01T00:00:00.000000',
        version: '1.0.0'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          app_version: mockLatestVersion,
          files: ['file1.js']
        })
      });

      await service.checkAppVersion();

      expect(service.needUpdate()).toBe(false);
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.checkAppVersion()).resolves.toBeUndefined();
      expect(service.latestVersion()).toBeNull();
      expect(service.needUpdate()).toBe(false);
    });

    it('should preserve existing latestVersion when fetch fails', async () => {
      const existingLatest = {
        git_hash: 'existing-latest',
        build_datetime_utc: '2023-06-02T00:00:00.000000',
        version: '2.1.0'
      };

      service.latestVersion.set(existingLatest);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await service.checkAppVersion();

      expect(service.latestVersion()).toEqual(existingLatest);
      expect(service.needUpdate()).toBe(false);
    });

    it('should set needUpdate to false when latestVersion is unavailable', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      await service.checkAppVersion();

      expect(service.needUpdate()).toBe(false);
    });

    it('should show toast when silent is false (default)', async () => {
      const mockVersion = {
        git_hash: 'env-hash-123',
        build_datetime_utc: '2024-01-01T00:00:00.000000',
        version: '1.0.0'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          app_version: mockVersion,
          files: ['file1.js']
        })
      });

      await service.checkAppVersion();

      expect(mockMessageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'info' }));
    });

    it('should not show toast when silent is true', async () => {
      const mockVersion = {
        git_hash: 'env-hash-123',
        build_datetime_utc: '2024-01-01T00:00:00.000000',
        version: '1.0.0'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          app_version: mockVersion,
          files: ['file1.js']
        })
      });

      await service.checkAppVersion({ silent: true });

      expect(mockMessageService.add).not.toHaveBeenCalled();
    });
  });

  describe('loadCurrentVersion', () => {
    it('should update currentVersion from /version.json when fetch succeeds', async () => {
      const serverVersion = {
        git_hash: 'server-hash-456',
        build_datetime_utc: '2025-06-01T00:00:00.000000',
        version: '2.0.0'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce(serverVersion)
      });

      await service.loadCurrentVersion();

      expect(mockFetch).toHaveBeenCalledWith(
        '/version.json',
        expect.objectContaining({
          cache: 'no-store',
          headers: expect.objectContaining({
            'cache-control': 'no-cache',
            pragma: 'no-cache'
          })
        })
      );
      expect(service.currentVersion()).toEqual(serverVersion);
    });

    it('should pass an AbortSignal so a hanging network never blocks startup indefinitely', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          git_hash: 'server-hash-456',
          build_datetime_utc: '2025-06-01T00:00:00.000000',
          version: '2.0.0'
        })
      });

      await service.loadCurrentVersion();

      expect(mockFetch).toHaveBeenCalledWith(
        '/version.json',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('should keep environment fallback when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await service.loadCurrentVersion();

      expect(service.currentVersion()).toEqual({
        version: '1.0.0',
        build_datetime_utc: '2024-01-01T00:00:00.000000',
        git_hash: 'env-hash-123'
      });
    });

    it('should keep environment fallback when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      await service.loadCurrentVersion();

      expect(service.currentVersion()).toEqual({
        version: '1.0.0',
        build_datetime_utc: '2024-01-01T00:00:00.000000',
        git_hash: 'env-hash-123'
      });
    });
  });

  describe('isCachePopulated', () => {
    it('should return true when cache has app_version entry', async () => {
      mockCache.match.mockResolvedValueOnce(new Response('{}'));

      const result = await service.isCachePopulated();

      expect(result).toBe(true);
      expect(mockCaches.open).toHaveBeenCalledWith('app-assets');
      expect(mockCache.match).toHaveBeenCalledWith('/app_version');
    });

    it('should return false when cache has no app_version entry', async () => {
      mockCache.match.mockResolvedValueOnce(undefined);

      const result = await service.isCachePopulated();

      expect(result).toBe(false);
    });

    it('should return false when cache API throws', async () => {
      mockCaches.open.mockRejectedValueOnce(new Error('Cache API unavailable'));

      const result = await service.isCachePopulated();

      expect(result).toBe(false);
    });
  });

  describe('checkForUpdateOnce', () => {
    beforeEach(() => {
      // Stub loadCurrentVersion so tests only need to mock assets_list.json fetch
      vi.spyOn(service, 'loadCurrentVersion').mockResolvedValue();
    });

    it('should set needUpdate and isFirstLaunch when cache is empty (first launch)', async () => {
      mockCache.match.mockResolvedValue(undefined); // no cached version
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          app_version: { git_hash: 'abc', build_datetime_utc: '2024', version: '1.0.0' },
          files: []
        })
      });

      await service.checkForUpdateOnce();

      expect(service.pendingAction()).toBe('first-install');
      expect(service.needUpdate()).toBe(true);
      expect(service.isFirstLaunch()).toBe(true);
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('should set needUpdate true when versions differ and cache is populated', async () => {
      const latest = { git_hash: 'new', build_datetime_utc: '2025', version: '2.0.0' };
      mockCache.match.mockResolvedValue(new Response('{}')); // cache populated
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ app_version: latest, files: [] })
      });

      await service.checkForUpdateOnce();

      expect(service.pendingAction()).toBe('update-available');
      expect(service.needUpdate()).toBe(true);
      expect(service.isFirstLaunch()).toBe(false);
    });

    it('should not set needUpdate when versions are equal', async () => {
      const version = { git_hash: 'env-hash-123', build_datetime_utc: '2024', version: '1.0.0' };
      mockCache.match.mockResolvedValue(new Response('{}')); // cache populated
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ app_version: version, files: [] })
      });

      await service.checkForUpdateOnce();

      expect(service.pendingAction()).toBe('none');
      expect(service.needUpdate()).toBe(false);
      expect(service.isFirstLaunch()).toBe(false);
    });

    it('should not throw when server is unreachable', async () => {
      mockCache.match.mockResolvedValue(undefined);
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(service.checkForUpdateOnce()).resolves.toBeUndefined();
    });

    it('should reset a stale update-available pendingAction when versions become equal', async () => {
      // Simulate a previous run that left pendingAction in 'update-available'.
      service.pendingAction.set('update-available');

      const version = { git_hash: 'env-hash-123', build_datetime_utc: '2024', version: '1.0.0' };
      mockCache.match.mockResolvedValue(new Response('{}'));
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ app_version: version, files: [] })
      });

      await service.checkForUpdateOnce();

      expect(service.pendingAction()).toBe('none');
      expect(service.needUpdate()).toBe(false);
    });
  });

  describe('update', () => {
    it('should set updateLoading to true and send message to service worker', async () => {
      await service.update();

      expect(service.updateLoading()).toBe(true);
      expect(mockServiceWorker.getRegistration).toHaveBeenCalled();
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'update'
      });
    });

    it('should reset updateLoading when no registration is found', async () => {
      mockServiceWorker.getRegistration.mockResolvedValueOnce(null);

      await service.update();

      expect(service.updateLoading()).toBe(false);
    });
  });

  describe('install', () => {
    it('should reset updateLoading when no registration is found', async () => {
      mockServiceWorker.getRegistration.mockResolvedValueOnce(null);

      await service.install();

      expect(service.updateLoading()).toBe(false);
    });
  });

  describe('service worker message handling', () => {
    let messageHandler: (event: { data: Record<string, unknown> }) => void;

    beforeEach(() => {
      // Extract the message handler function
      messageHandler = mockServiceWorker.addEventListener.mock.calls[0][1] as (event: {
        data: Record<string, unknown>;
      }) => void;
    });

    it('should handle update_complete message', async () => {
      service.updateLoading.set(true);

      await messageHandler({
        data: {
          message: 'update_complete'
        }
      });

      expect(service.updateLoading()).toBe(false);
      expect(mockMessageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    });

    it('should handle install_complete message', async () => {
      service.updateLoading.set(true);
      service.pendingAction.set('first-install');

      await messageHandler({
        data: {
          message: 'install_complete'
        }
      });

      expect(service.updateLoading()).toBe(false);
      expect(service.pendingAction()).toBe('none');
      expect(service.isFirstLaunch()).toBe(false);
      expect(service.needUpdate()).toBe(false);
      expect(mockMessageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    });

    it('should handle error message from service worker', async () => {
      service.updateLoading.set(true);

      await messageHandler({
        data: {
          message: 'error',
          error: 'Update failed: network error'
        }
      });

      expect(service.updateLoading()).toBe(false);
      expect(mockMessageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    });
  });

  describe('manifest caching', () => {
    it('should return the same promise on subsequent calls to getLatestAssetList', async () => {
      const mockAssetList = { app_version: { git_hash: 'a', build_datetime_utc: '2024', version: '1.0.0' }, files: [] };
      mockFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(mockAssetList) });

      const first = await service.getLatestAssetList();
      const second = await service.getLatestAssetList();

      expect(first).toStrictEqual(second);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should re-fetch after clearManifestCache is called', async () => {
      const mockAssetList = { app_version: { git_hash: 'a', build_datetime_utc: '2024', version: '1.0.0' }, files: [] };
      mockFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(mockAssetList) });

      await service.getLatestAssetList();
      service.clearManifestCache();
      await service.getLatestAssetList();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should auto-invalidate cache after checkAppVersion completes', async () => {
      const mockVersion = { git_hash: 'env-hash-123', build_datetime_utc: '2024', version: '1.0.0' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ app_version: mockVersion, files: [] })
      });

      await service.checkAppVersion({ silent: true });

      // After checkAppVersion, a new call to getLatestAssetList should trigger a fresh fetch
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ app_version: mockVersion, files: [] })
      });
      await service.getLatestAssetList();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('areVersionsEqual (via checkAppVersion)', () => {
    it('should compare only version and git_hash, ignoring build_datetime_utc', async () => {
      const mockLatestVersion = {
        git_hash: 'env-hash-123',
        build_datetime_utc: '9999-12-31T23:59:59.999999',
        version: '1.0.0'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          app_version: mockLatestVersion,
          files: ['file1.js']
        })
      });

      await service.checkAppVersion({ silent: true });

      // Same git_hash and version but different build_datetime_utc → should be equal
      expect(service.needUpdate()).toBe(false);
    });

    it('should detect update when git_hash differs', async () => {
      const mockLatestVersion = {
        git_hash: 'different-hash',
        build_datetime_utc: '2024-01-01T00:00:00.000000',
        version: '1.0.0'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          app_version: mockLatestVersion,
          files: ['file1.js']
        })
      });

      await service.checkAppVersion({ silent: true });

      expect(service.needUpdate()).toBe(true);
    });

    it('should detect update when version differs', async () => {
      const mockLatestVersion = {
        git_hash: 'env-hash-123',
        build_datetime_utc: '2024-01-01T00:00:00.000000',
        version: '2.0.0'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          app_version: mockLatestVersion,
          files: ['file1.js']
        })
      });

      await service.checkAppVersion({ silent: true });

      expect(service.needUpdate()).toBe(true);
    });
  });
});
