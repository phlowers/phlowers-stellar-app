import { TestBed } from '@angular/core/testing';
import { UpdateService } from './worker_update.service';
import { MessageService } from 'primeng/api';

describe('UpdateService', () => {
  let service: UpdateService;
  let mockServiceWorker: { addEventListener: vi.Mock; getRegistration: vi.Mock };
  let mockCaches: { open: vi.Mock };
  let mockCache: { match: vi.Mock };
  let mockFetch: vi.Mock;
  let originalServiceWorker: ServiceWorkerContainer;
  let originalCaches: CacheStorage;
  let originalFetch: typeof fetch;
  let mockMessageService: MessageService;

  beforeEach(() => {
    mockMessageService = {
      add: vi.fn()
    } as unknown as MessageService;
    // Mock service worker
    mockServiceWorker = {
      addEventListener: vi.fn(),
      getRegistration: vi.fn().mockResolvedValue({
        active: {
          postMessage: vi.fn()
        }
      })
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
      open: vi.fn().mockResolvedValue(mockCache)
    };
    originalCaches = globalThis.caches;
    Object.defineProperty(globalThis, 'caches', {
      value: mockCaches,
      writable: true
    });

    // Mock fetch
    mockFetch = vi.fn();
    originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;

    TestBed.configureTestingModule({
      providers: [UpdateService, { provide: MessageService, useValue: mockMessageService }]
    });
    service = TestBed.inject(UpdateService);
    service.latestVersion.set(null);
    service.currentVersion.set(null);
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

  it('should register service worker event listener on initialization', () => {
    expect(mockServiceWorker.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('should NOT handle worker_ready message (listener removed in V2)', () => {
    const messageHandler: (event: { data: Record<string, unknown> }) => void =
      mockServiceWorker.addEventListener.mock.calls[0][1];
    const checkAppVersionSpy = vi.spyOn(service, 'checkAppVersion');

    messageHandler({ data: { message: 'worker_ready' } });

    // worker_ready no longer triggers checkAppVersion
    expect(checkAppVersionSpy).not.toHaveBeenCalled();
  });

  describe('getAppVersion', () => {
    it('should fetch latest version from assets_list.json', async () => {
      const mockLatestVersion = {
        git_hash: 'abc123',
        build_datetime_utc: '2023-01-01T00:00:00.000000'
      };
      const mockAssetList = {
        app_version: mockLatestVersion,
        files: ['file1.js', 'file2.css']
      };

      mockCache.match.mockReset();
      mockCache.match.mockResolvedValue(null);
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce(mockAssetList)
      });

      service.latestVersion.set(null);
      service.currentVersion.set(null);
      service.needUpdate.set(false);

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
      expect(service.currentVersion()).toBeNull();
    });

    it('should get current version from cache', async () => {
      const mockLatestVersion = {
        git_hash: 'abc123',
        build_datetime_utc: '2023-01-01T00:00:00.000000'
      };
      const mockCurrentVersion = {
        git_hash: 'def456',
        build_datetime_utc: '2022-12-31T00:00:00.000000'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          app_version: mockLatestVersion,
          files: ['file1.js', 'file2.css']
        })
      });

      mockCache.match.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValueOnce(mockCurrentVersion)
      });

      await service.checkAppVersion();

      expect(mockCaches.open).toHaveBeenCalledWith('app-assets');
      expect(mockCache.match).toHaveBeenCalledWith('/app_version');
      expect(service.currentVersion()).toEqual(mockCurrentVersion);
      expect(service.latestVersion()).toEqual(mockLatestVersion);
      expect(service.needUpdate()).toBe(true);
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      mockCache.match.mockResolvedValueOnce(null);

      await expect(service.checkAppVersion()).resolves.toBeUndefined();
      expect(service.currentVersion()).toBeNull();
      expect(service.latestVersion()).toBeNull();
      expect(service.needUpdate()).toBe(false);
    });

    it('should handle Cache API errors gracefully and preserve existing signals', async () => {
      const existingCurrent = {
        git_hash: 'existing',
        build_datetime_utc: '2023-06-01T00:00:00.000000',
        version: '2.0.0'
      };
      service.currentVersion.set(existingCurrent);

      mockCaches.open.mockRejectedValueOnce(new Error('Cache API unavailable'));

      await expect(service.checkAppVersion()).resolves.toBeUndefined();
      expect(service.currentVersion()).toEqual(existingCurrent);
      expect(service.needUpdate()).toBe(false);
    });

    it('should not overwrite existing signal values with null', async () => {
      const existingCurrent = {
        git_hash: 'existing',
        build_datetime_utc: '2023-06-01T00:00:00.000000',
        version: '2.0.0'
      };
      const existingLatest = {
        git_hash: 'existing-latest',
        build_datetime_utc: '2023-06-02T00:00:00.000000',
        version: '2.1.0'
      };

      service.currentVersion.set(existingCurrent);
      service.latestVersion.set(existingLatest);

      mockCache.match.mockResolvedValueOnce(null);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await service.checkAppVersion();

      expect(service.currentVersion()).toEqual(existingCurrent);
      expect(service.latestVersion()).toEqual(existingLatest);
      expect(service.needUpdate()).toBe(false);
    });

    it('should still set currentVersion signal when latestVersion is unavailable', async () => {
      const mockCurrentVersion = {
        git_hash: 'def456',
        build_datetime_utc: '2022-12-31T00:00:00.000000',
        version: '1.0.0'
      };

      mockCache.match.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValueOnce(mockCurrentVersion)
      });
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await service.checkAppVersion();

      expect(service.currentVersion()).toEqual(mockCurrentVersion);
      expect(service.latestVersion()).toBeNull();
      expect(service.needUpdate()).toBe(false);
    });

    it('should still set latestVersion signal when currentVersion is unavailable', async () => {
      const mockLatestVersion = {
        git_hash: 'abc123',
        build_datetime_utc: '2023-01-01T00:00:00.000000',
        version: '1.0.1'
      };

      mockCache.match.mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          app_version: mockLatestVersion,
          files: ['file1.js']
        })
      });

      await service.checkAppVersion();

      expect(service.currentVersion()).toBeNull();
      expect(service.latestVersion()).toEqual(mockLatestVersion);
      expect(service.needUpdate()).toBe(false);
    });

    it('should show toast when silent is false (default)', async () => {
      const mockVersion = {
        git_hash: 'abc123',
        build_datetime_utc: '2023-01-01T00:00:00.000000',
        version: '1.0.0'
      };

      mockCache.match.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValueOnce(mockVersion)
      });
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
        git_hash: 'abc123',
        build_datetime_utc: '2023-01-01T00:00:00.000000',
        version: '1.0.0'
      };

      mockCache.match.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValueOnce(mockVersion)
      });
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

  describe('checkForUpdateOnce', () => {
    it('should call install() when currentVersion is null (first launch)', async () => {
      mockCache.match.mockResolvedValue(null); // no cached version
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          app_version: { git_hash: 'abc', build_datetime_utc: '2024', version: '1.0.0' },
          files: []
        })
      });
      const mockRegistration = { active: { postMessage: vi.fn() } };
      mockServiceWorker.getRegistration.mockResolvedValue(mockRegistration);

      await service.checkForUpdateOnce();

      expect(mockRegistration.active.postMessage).toHaveBeenCalledWith({ type: 'install' });
    });

    it('should set needUpdate true when versions differ', async () => {
      const current = { git_hash: 'old', build_datetime_utc: '2024', version: '1.0.0' };
      const latest = { git_hash: 'new', build_datetime_utc: '2025', version: '2.0.0' };
      mockCache.match.mockResolvedValue({ json: vi.fn().mockResolvedValue(current) });
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ app_version: latest, files: [] })
      });

      await service.checkForUpdateOnce();

      expect(service.needUpdate()).toBe(true);
    });

    it('should not set needUpdate when versions are equal', async () => {
      const version = { git_hash: 'abc', build_datetime_utc: '2024', version: '1.0.0' };
      mockCache.match.mockResolvedValue({ json: vi.fn().mockResolvedValue(version) });
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ app_version: version, files: [] })
      });

      await service.checkForUpdateOnce();

      expect(service.needUpdate()).toBe(false);
    });

    it('should not throw when server is unreachable', async () => {
      mockCache.match.mockResolvedValue(null);
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(service.checkForUpdateOnce()).resolves.toBeUndefined();
    });
  });

  describe('update', () => {
    it('should set updateLoading to true and send message to service worker', async () => {
      const mockCurrentVersion = {
        git_hash: 'def456',
        build_datetime_utc: '2022-12-31T00:00:00.000000',
        version: '1.0.0'
      };
      const mockLatestVersion = {
        git_hash: 'abc123',
        build_datetime_utc: '2023-01-01T00:00:00.000000',
        version: '1.0.1'
      };

      service.currentVersion.set(mockCurrentVersion);
      service.latestVersion.set(mockLatestVersion);

      const mockPostMessage = vi.fn();
      mockServiceWorker.getRegistration.mockResolvedValueOnce({
        active: {
          postMessage: mockPostMessage
        }
      });

      await service.update();

      expect(service.updateLoading()).toBe(true);
      expect(mockServiceWorker.getRegistration).toHaveBeenCalled();
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'update'
      });
    });

    it('should reset updateLoading when no active registration is found', async () => {
      mockServiceWorker.getRegistration.mockResolvedValueOnce(null);

      await service.update();

      expect(service.updateLoading()).toBe(false);
    });

    it('should reset updateLoading when registration has no active worker', async () => {
      mockServiceWorker.getRegistration.mockResolvedValueOnce({ active: null });

      await service.update();

      expect(service.updateLoading()).toBe(false);
    });
  });

  describe('install', () => {
    it('should reset updateLoading when no active registration is found', async () => {
      mockServiceWorker.getRegistration.mockResolvedValueOnce(null);

      await service.install();

      expect(service.updateLoading()).toBe(false);
    });
  });

  describe('service worker message handling', () => {
    let messageHandler: (event: { data: Record<string, unknown> }) => void;

    beforeEach(() => {
      // Extract the message handler function
      messageHandler = mockServiceWorker.addEventListener.mock.calls[0][1];
    });

    it('should handle update_complete message', async () => {
      const mockCurrentVersion = {
        git_hash: 'abc123',
        build_datetime_utc: '2023-01-01T00:00:00.000000'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          app_version: mockCurrentVersion,
          files: ['file1.js', 'file2.css']
        })
      });

      mockCache.match.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValueOnce(mockCurrentVersion)
      });

      service.updateLoading.set(true);

      await messageHandler({
        data: {
          message: 'update_complete',
          current_version: mockCurrentVersion
        }
      });

      expect(service.updateLoading()).toBe(false);
      expect(service.currentVersion()).toEqual(mockCurrentVersion);
    });

    it('should handle install_complete message', async () => {
      const mockVersion = {
        git_hash: 'abc123',
        build_datetime_utc: '2023-01-01T00:00:00.000000'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          app_version: mockVersion,
          files: ['file1.js', 'file2.css']
        })
      });

      mockCache.match.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValueOnce(mockVersion)
      });

      service.updateLoading.set(true);

      await messageHandler({
        data: {
          message: 'install_complete',
          latest_version: mockVersion
        }
      });

      expect(service.updateLoading()).toBe(false);
      expect(service.currentVersion()).toEqual(mockVersion);
      expect(service.latestVersion()).toEqual(mockVersion);
      expect(service.needUpdate()).toBe(false);
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
      const mockVersion = { git_hash: 'abc', build_datetime_utc: '2024', version: '1.0.0' };
      mockCache.match.mockResolvedValue({ json: vi.fn().mockResolvedValue(mockVersion) });
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
});
