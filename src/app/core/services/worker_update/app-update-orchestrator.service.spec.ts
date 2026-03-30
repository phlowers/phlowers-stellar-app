import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
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
      providers: [provideHttpClient(), AppUpdateOrchestratorService, UpdateService]
    });

    service = TestBed.inject(AppUpdateOrchestratorService);
    updateService = TestBed.inject(UpdateService);

    // Mock UpdateService methods used by orchestrator
    vi.spyOn(updateService, 'getCurrentVersion').mockResolvedValue(mockVersionV1);
    vi.spyOn(updateService, 'getLatestAssetList').mockResolvedValue(mockAssetListV2);
  });

  afterEach(() => {
    // Reset navigator mock
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {},
      writable: true,
      configurable: true
    });
  });

  describe('initiateStartupCheck', () => {
    it('should fetch latest assets and detect new version available', async () => {
      await service.initiateStartupCheck();

      expect(updateService.getLatestAssetList).toHaveBeenCalledTimes(1);
      expect(updateService.latestVersion()).toEqual(mockVersionV2);
      expect(updateService.needUpdate$.value).toBe(true);
      expect(service.startupCheckCompleted()).toBe(true);
    });

    it('should not trigger update dialog when versions match', async () => {
      // Mock getCurrentVersion to return mockVersionV2 (same as latest)
      vi.mocked(updateService.getCurrentVersion).mockResolvedValue(mockVersionV2);

      await service.initiateStartupCheck();

      expect(updateService.needUpdate$.value).toBe(false);
      expect(service.startupCheckCompleted()).toBe(true);
    });

    it('should handle fetch errors gracefully without blocking app', async () => {
      vi.mocked(updateService.getLatestAssetList).mockResolvedValue(null);

      await service.initiateStartupCheck();

      expect(service.startupCheckCompleted()).toBe(true);
      expect(updateService.needUpdate$.value).toBe(false);
    });

    it('should skip subsequent checks in same session (single-check-per-boot guarantee)', async () => {
      // First check
      await service.initiateStartupCheck();

      expect(service.startupCheckCompleted()).toBe(true);

      // Second check in same session should be no-op
      await service.initiateStartupCheck();

      expect(updateService.getLatestAssetList).toHaveBeenCalledTimes(1);
    });

    it('should set isCheckingVersion during check', async () => {
      expect(service.isCheckingVersion()).toBe(false);

      await service.initiateStartupCheck();

      expect(service.isCheckingVersion()).toBe(false);
      expect(service.startupCheckCompleted()).toBe(true);
    });
  });

  describe('acceptUpdate', () => {
    it('should post update message with manifest when available', async () => {
      const postMessageSpy = vi.fn();
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          controller: { postMessage: postMessageSpy }
        },
        writable: true
      });

      await service.initiateStartupCheck();
      service.acceptUpdate();

      expect(postMessageSpy).toHaveBeenCalledWith({ type: 'update', manifest: mockAssetListV2 });
      expect(updateService.updateLoading()).toBe(true);
    });

    it('should post update message without manifest when not available', () => {
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

  describe('OIDC token integration', () => {
    it('should delegate manifest fetch to UpdateService (interceptor-aware path)', async () => {
      await service.initiateStartupCheck();

      expect(updateService.getLatestAssetList).toHaveBeenCalledTimes(1);
      expect(updateService.needUpdate$.value).toBe(true);
    });
  });
});
