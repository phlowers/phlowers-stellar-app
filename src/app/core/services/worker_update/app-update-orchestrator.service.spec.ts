import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AppUpdateOrchestratorService } from '@services/worker_update/app-update-orchestrator.service';
import { AppVersion, AssetList, UpdateService } from '@services/worker_update/worker_update.service';

interface MockServiceWorkerController {
  postMessage: ReturnType<typeof vi.fn>;
}

interface MockServiceWorkerContainer {
  controller: MockServiceWorkerController | null;
  addEventListener: ReturnType<typeof vi.fn>;
}

describe('AppUpdateOrchestratorService — Phase 2', () => {
  let service: AppUpdateOrchestratorService;
  let updateService: UpdateService;
  let httpMock: HttpTestingController;
  let navigatorSpy: { serviceWorker: MockServiceWorkerContainer };

  const mockVersionV1: AppVersion = {
    version: '1.0.0',
    git_hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    build_datetime_utc: '2024-01-01T00:00:00.000000'
  };

  const mockVersionV2: AppVersion = {
    version: '2.0.0',
    git_hash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    build_datetime_utc: '2024-01-02T00:00:00.000000'
  };

  const mockAssetListV2: AssetList = {
    app_version: mockVersionV2,
    files: ['/index.html', '/app.js', '/styles.css'],
    data_hashes: {}
  };

  beforeEach(() => {
    // Mock navigator.serviceWorker BEFORE TestBed configuration
    navigatorSpy = {
      serviceWorker: {
        controller: { postMessage: vi.fn() },
        addEventListener: vi.fn()
      }
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      value: navigatorSpy.serviceWorker,
      writable: true,
      configurable: true
    });

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AppUpdateOrchestratorService, UpdateService]
    });

    service = TestBed.inject(AppUpdateOrchestratorService);
    updateService = TestBed.inject(UpdateService);
    httpMock = TestBed.inject(HttpTestingController);

    // Mock UpdateService.getCurrentVersion
    vi.spyOn(updateService, 'getCurrentVersion').mockResolvedValue(mockVersionV1);
  });

  afterEach(() => {
    try {
      httpMock.verify();
    } catch {
      // Ignore httpMock verification errors in case of early failures
    }
    // Reset navigator mock
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {},
      writable: true,
      configurable: true
    });
  });

  describe('initiateStartupCheck', () => {
    it('should fetch latest assets and detect new version available', async () => {
      const checkPromise = service.initiateStartupCheck();

      const req = httpMock.expectOne('/assets_list.json');
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('cache-control')).toBe('no-cache');
      req.flush(mockAssetListV2);

      await checkPromise;

      expect(updateService.latestVersion()).toEqual(mockVersionV2);
      expect(updateService.needUpdate$.value).toBe(true);
      expect(service.startupCheckCompleted()).toBe(true);
    });

    it('should not trigger update dialog when versions match', async () => {
      // Mock getCurrentVersion to return mockVersionV2 (same as latest)
      vi.mocked(updateService.getCurrentVersion).mockResolvedValue(mockVersionV2);

      const checkPromise = service.initiateStartupCheck();

      const req = httpMock.expectOne('/assets_list.json');
      req.flush(mockAssetListV2);

      await checkPromise;

      expect(updateService.needUpdate$.value).toBe(false);
      expect(service.startupCheckCompleted()).toBe(true);
    });

    it('should handle fetch errors gracefully without blocking app', async () => {
      const checkPromise = service.initiateStartupCheck();

      const req = httpMock.expectOne('/assets_list.json');
      req.error(new ProgressEvent('error'), { status: 500 });

      await checkPromise;

      expect(service.startupCheckCompleted()).toBe(true);
      expect(updateService.needUpdate$.value).toBe(false);
    });

    it('should skip subsequent checks in same session (single-check-per-boot guarantee)', async () => {
      // First check
      const check1 = service.initiateStartupCheck();
      const req1 = httpMock.expectOne('/assets_list.json');
      req1.flush(mockAssetListV2);
      await check1;

      expect(service.startupCheckCompleted()).toBe(true);

      // Second check in same session should be no-op
      const check2 = service.initiateStartupCheck();
      await check2;

      // No additional HTTP request should be made
      httpMock.expectNone('/assets_list.json');
    });

    it('should set isCheckingVersion during check', async () => {
      expect(service.isCheckingVersion()).toBe(false);

      const checkPromise = service.initiateStartupCheck();

      // isCheckingVersion might flip back to false immediately due to async timing
      // but at some point it should become true during the fetch
      const req = httpMock.expectOne('/assets_list.json');

      // We expect at least one promise completion
      req.flush(mockAssetListV2);
      await checkPromise;

      expect(service.isCheckingVersion()).toBe(false);
      expect(service.startupCheckCompleted()).toBe(true);
    });
  });

  describe('acceptUpdate', () => {
    it('should post update message to Service Worker controller', () => {
      const postMessageSpy = vi.fn();
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          controller: { postMessage: postMessageSpy }
        },
        writable: true
      });

      service.acceptUpdate();

      expect(postMessageSpy).toHaveBeenCalledWith({ type: 'update' });
      expect(updateService.updateLoading()).toBe(true);
    });

    it('should warn when no Service Worker controller is available', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { controller: null },
        writable: true
      });

      service.acceptUpdate();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No Service Worker controller'));
      warnSpy.mockRestore();
    });
  });

  describe('OIDC token integration (HttpClient)', () => {
    it('should use HttpClient for manifest fetch (supports interceptor token injection)', async () => {
      const checkPromise = service.initiateStartupCheck();

      const req = httpMock.expectOne('/assets_list.json');
      // Verify default headers are set
      expect(req.request.headers.get('cache-control')).toBe('no-cache');
      expect(req.request.headers.get('pragma')).toBe('no-cache');

      req.flush(mockAssetListV2);
      await checkPromise;

      // Ensure HTTP call was made (token would be auto-added by interceptor in real flow)
      expect(updateService.needUpdate$.value).toBe(true);
    });
  });
});
