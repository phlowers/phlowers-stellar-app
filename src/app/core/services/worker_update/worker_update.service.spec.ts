import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { UpdateService } from '@services/worker_update/worker_update.service';
import { MessageService } from 'primeng/api';

async function expectManifestRequest(httpMock: HttpTestingController): Promise<TestRequest> {
  let request: TestRequest | null = null;

  await vi.waitFor(() => {
    request = httpMock.expectOne('/assets_list.json');
    expect(request.request.url).toBe('/assets_list.json');
  });

  return request as TestRequest;
}

describe('UpdateService', () => {
  let service: UpdateService;
  let mockServiceWorker: { addEventListener: vi.Mock; getRegistration: vi.Mock };
  let mockCaches: { open: vi.Mock };
  let mockCache: { match: vi.Mock };
  let httpMock: HttpTestingController;
  let originalServiceWorker: ServiceWorkerContainer;
  let originalCaches: CacheStorage;
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

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        UpdateService,
        { provide: MessageService, useValue: mockMessageService }
      ]
    });
    service = TestBed.inject(UpdateService);
    httpMock = TestBed.inject(HttpTestingController);
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
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should register service worker event listener on initialization', () => {
    expect(mockServiceWorker.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
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
      service.latestVersion.set(null);
      service.currentVersion.set(null);
      service.needUpdate$.next(false);

      const checkPromise = service.checkAppVersion();
      const req = await expectManifestRequest(httpMock);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('cache-control')).toBe('no-cache');
      expect(req.request.headers.get('pragma')).toBe('no-cache');
      req.flush(mockAssetList);

      await checkPromise;

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

      mockCache.match.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValueOnce(mockCurrentVersion)
      });

      const checkPromise = service.checkAppVersion();
      (await expectManifestRequest(httpMock)).flush({
        app_version: mockLatestVersion,
        files: ['file1.js', 'file2.css']
      });

      await checkPromise;

      expect(mockCaches.open).toHaveBeenCalledWith('app-assets');
      expect(mockCache.match).toHaveBeenCalledWith('/app_version');
      expect(service.currentVersion()).toEqual(mockCurrentVersion);
      expect(service.latestVersion()).toEqual(mockLatestVersion);
      expect(service.needUpdate$.value).toBe(true);
    });

    it('should handle fetch errors gracefully', async () => {
      mockCache.match.mockResolvedValueOnce(null);

      const checkPromise = service.checkAppVersion();
      (await expectManifestRequest(httpMock)).error(new ProgressEvent('error'), { status: 500 });

      await expect(checkPromise).resolves.toBeUndefined();
      expect(service.currentVersion()).toBeNull();
      expect(service.latestVersion()).toBeNull();
      expect(service.needUpdate$.value).toBe(false);
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
      expect(service.needUpdate$.value).toBe(false);
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
      const checkPromise = service.checkAppVersion();
      (await expectManifestRequest(httpMock)).error(new ProgressEvent('error'), { status: 500 });

      await checkPromise;

      expect(service.currentVersion()).toEqual(existingCurrent);
      expect(service.latestVersion()).toEqual(existingLatest);
      expect(service.needUpdate$.value).toBe(false);
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
      const checkPromise = service.checkAppVersion();
      (await expectManifestRequest(httpMock)).error(new ProgressEvent('error'), { status: 500 });

      await checkPromise;

      expect(service.currentVersion()).toEqual(mockCurrentVersion);
      expect(service.latestVersion()).toBeNull();
      expect(service.needUpdate$.value).toBe(false);
    });

    it('should still set latestVersion signal when currentVersion is unavailable', async () => {
      const mockLatestVersion = {
        git_hash: 'abc123',
        build_datetime_utc: '2023-01-01T00:00:00.000000',
        version: '1.0.1'
      };

      mockCache.match.mockResolvedValueOnce(null);
      const checkPromise = service.checkAppVersion();
      (await expectManifestRequest(httpMock)).flush({
        app_version: mockLatestVersion,
        files: ['file1.js']
      });

      await checkPromise;

      expect(service.currentVersion()).toBeNull();
      expect(service.latestVersion()).toEqual(mockLatestVersion);
      expect(service.needUpdate$.value).toBe(false);
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
      const checkPromise = service.checkAppVersion();
      (await expectManifestRequest(httpMock)).flush({
        app_version: mockVersion,
        files: ['file1.js']
      });

      await checkPromise;

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
      const checkPromise = service.checkAppVersion({ silent: true });
      (await expectManifestRequest(httpMock)).flush({
        app_version: mockVersion,
        files: ['file1.js']
      });

      await checkPromise;

      expect(mockMessageService.add).not.toHaveBeenCalled();
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

      mockCache.match.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValueOnce(mockCurrentVersion)
      });

      service.updateLoading.set(true);

      const messagePromise = messageHandler({
        data: {
          message: 'update_complete',
          current_version: mockCurrentVersion
        }
      });

      (await expectManifestRequest(httpMock)).flush({
        app_version: mockCurrentVersion,
        files: ['file1.js', 'file2.css']
      });

      await messagePromise;

      expect(service.updateLoading()).toBe(false);
      expect(service.currentVersion()).toEqual(mockCurrentVersion);
    });

    it('should handle install_complete message', async () => {
      const mockVersion = {
        git_hash: 'abc123',
        build_datetime_utc: '2023-01-01T00:00:00.000000'
      };

      mockCache.match.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValueOnce(mockVersion)
      });

      service.updateLoading.set(true);

      const messagePromise = messageHandler({
        data: {
          message: 'install_complete',
          latest_version: mockVersion
        }
      });

      (await expectManifestRequest(httpMock)).flush({
        app_version: mockVersion,
        files: ['file1.js', 'file2.css']
      });

      await messagePromise;

      expect(service.updateLoading()).toBe(false);
      expect(service.currentVersion()).toEqual(mockVersion);
      expect(service.latestVersion()).toEqual(mockVersion);
      expect(service.needUpdate$.value).toBe(false);
    });
  });
});
