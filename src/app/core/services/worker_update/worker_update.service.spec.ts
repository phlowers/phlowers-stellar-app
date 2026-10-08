import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { UpdateService } from './worker_update.service';
import { MessageService } from 'primeng/api';
import { AuthService } from '@services/auth/auth.service';
import { LoggerService } from '@services/logger/logger.service';
import { User } from '@shared/domain';

import { TranslocoTestingModule } from '@jsverse/transloco';
vi.mock('@src/environments/environment', () => ({
  environment: {
    version: '1.0.0',
    buildTime: '2024-01-01T00:00:00.000000',
    gitHash: 'e1e1e1e1'
  }
}));

describe('UpdateService', () => {
  let service: UpdateService;
  let mockServiceWorker: {
    addEventListener: vi.Mock;
    getRegistration: vi.Mock;
    ready: Promise<ServiceWorkerRegistration>;
  };
  let mockCaches: { open: vi.Mock; delete: vi.Mock; keys: vi.Mock };
  let mockCache: { match: vi.Mock };
  let mockFetch: vi.Mock & typeof fetch;
  let originalServiceWorker: ServiceWorkerContainer;
  let originalCaches: CacheStorage;
  let originalFetch: typeof fetch;
  let mockMessageService: MessageService;
  let mockPostMessage: vi.Mock;
  let mockLogger: { log: vi.Mock; info: vi.Mock; warn: vi.Mock; error: vi.Mock };
  /** Authenticated by default; individual tests set it to null to prove the auth guard. */
  let currentUser: ReturnType<typeof signal<User | null>>;

  beforeEach(() => {
    currentUser = signal<User | null>({ email: 'user@example.com' } as User);

    mockMessageService = {
      add: vi.fn()
    } as unknown as MessageService;

    mockPostMessage = vi.fn();
    mockLogger = { log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
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
      delete: vi.fn().mockResolvedValue(true),
      // Default: a legacy 'app-assets' cache exists; its content is driven
      // by mockCache.match in individual tests (populated vs. empty).
      keys: vi.fn().mockResolvedValue(['app-assets'])
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
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        })
      ],
      providers: [
        UpdateService,
        { provide: MessageService, useValue: mockMessageService },
        { provide: LoggerService, useValue: mockLogger },
        { provide: AuthService, useValue: { currentUser } }
      ]
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
      git_hash: 'e1e1e1e1'
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
        git_hash: 'abc1234',
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
        git_hash: 'abc1234',
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
        git_hash: 'e1e1e1e1',
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
        git_hash: 'eee1234',
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
        git_hash: 'e1e1e1e1',
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
        git_hash: 'e1e1e1e1',
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

    it('should log current and server versions with the update decision', async () => {
      const serverVersion = {
        git_hash: 'fed1234',
        build_datetime_utc: '2025-01-01',
        version: '1.0.0'
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({ app_version: serverVersion, files: [] })
      });

      await service.checkAppVersion({ silent: true });

      expect(mockLogger.info).toHaveBeenCalledWith('[UPDATE page] version check', {
        current: service.currentVersion(),
        latest: serverVersion,
        updateAvailable: true
      });
    });

    it('should log a warning when the server version is unavailable', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 502 });

      await service.checkAppVersion({ silent: true });

      expect(mockLogger.warn).toHaveBeenCalledWith('[UPDATE page] assets_list.json fetch failed', { status: 502 });
      expect(mockLogger.warn).toHaveBeenCalledWith('[UPDATE page] version check: server version unavailable');
    });

    it('should log a timeout when the manifest fetch is aborted by its timeout', async () => {
      mockFetch.mockRejectedValueOnce(new DOMException('assets_list.json fetch timeout', 'TimeoutError'));

      await service.checkAppVersion({ silent: true });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[UPDATE page] assets_list.json fetch failed: timeout',
        expect.any(DOMException)
      );
    });

    it('should log a network error when the manifest fetch rejects', async () => {
      mockFetch.mockRejectedValueOnce(new Error('offline'));

      await service.checkAppVersion({ silent: true });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[UPDATE page] assets_list.json fetch failed: network error',
        expect.any(Error)
      );
    });
  });

  describe('loadCurrentVersion', () => {
    it('should update currentVersion from /version.json when fetch succeeds', async () => {
      const serverVersion = {
        git_hash: '5e5e456',
        build_datetime_utc: '2025-06-01T00:00:00.000000',
        version: '2.0.0'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce(serverVersion)
      });

      await service.loadCurrentVersion();

      expect(mockFetch).toHaveBeenCalledWith('/version.json', expect.objectContaining({ signal: expect.anything() }));
      expect(service.currentVersion()).toEqual(serverVersion);
    });

    it('should pass an AbortSignal so a hanging network never blocks startup indefinitely', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          git_hash: '5e5e456',
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
        git_hash: 'e1e1e1e1'
      });
    });

    it('should keep environment fallback when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      await service.loadCurrentVersion();

      expect(service.currentVersion()).toEqual({
        version: '1.0.0',
        build_datetime_utc: '2024-01-01T00:00:00.000000',
        git_hash: 'e1e1e1e1'
      });
    });
  });

  describe('isCachePopulated', () => {
    it('should return true when a versioned app-assets cache has an app_version entry', async () => {
      mockCaches.keys.mockResolvedValueOnce(['app-assets-v-abc123']);
      mockCache.match.mockResolvedValueOnce(new Response('{}'));

      const result = await service.isCachePopulated();

      expect(result).toBe(true);
      expect(mockCaches.open).toHaveBeenCalledWith('app-assets-v-abc123');
      expect(mockCache.match).toHaveBeenCalledWith('/app_version');
    });

    it('should return true when the legacy app-assets cache has an app_version entry', async () => {
      mockCaches.keys.mockResolvedValueOnce(['app-assets']);
      mockCache.match.mockResolvedValueOnce(new Response('{}'));

      const result = await service.isCachePopulated();

      expect(result).toBe(true);
      expect(mockCaches.open).toHaveBeenCalledWith('app-assets');
    });

    it('should return false when no app-assets cache exists at all', async () => {
      mockCaches.keys.mockResolvedValueOnce(['some-other-cache', 'app-assets-control']);

      const result = await service.isCachePopulated();

      expect(result).toBe(false);
      expect(mockCaches.open).not.toHaveBeenCalled();
    });

    it('should return false when cache has no app_version entry', async () => {
      mockCaches.keys.mockResolvedValueOnce(['app-assets']);
      mockCache.match.mockResolvedValueOnce(undefined);

      const result = await service.isCachePopulated();

      expect(result).toBe(false);
    });

    it('should return false when cache API throws', async () => {
      mockCaches.keys.mockRejectedValueOnce(new Error('Cache API unavailable'));

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
          app_version: { git_hash: 'abc0001', build_datetime_utc: '2024', version: '1.0.0' },
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
      const latest = { git_hash: 'fed0001', build_datetime_utc: '2025', version: '2.0.0' };
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
      const version = {
        git_hash: 'e1e1e1e1',
        build_datetime_utc: '2024',
        version: '1.0.0'
      };
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

      const version = {
        git_hash: 'e1e1e1e1',
        build_datetime_utc: '2024',
        version: '1.0.0'
      };
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

  describe('confirmUpdate', () => {
    it('should post an update message when pendingAction is update-available', async () => {
      service.pendingAction.set('update-available');

      const result = await service.confirmUpdate();

      expect(result).toBe(true);
      expect(service.updateLoading()).toBe(true);
      expect(mockServiceWorker.getRegistration).toHaveBeenCalled();
      expect(mockPostMessage).toHaveBeenCalledWith({ type: 'update' });
    });

    it('should post an install message when pendingAction is first-install', async () => {
      service.pendingAction.set('first-install');

      const result = await service.confirmUpdate();

      expect(result).toBe(true);
      expect(mockPostMessage).toHaveBeenCalledWith({ type: 'install' });
    });

    it('should do nothing when pendingAction is none', async () => {
      service.pendingAction.set('none');

      const result = await service.confirmUpdate();

      expect(result).toBe(false);
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('should refuse when the user is not authenticated', async () => {
      currentUser.set(null);
      service.pendingAction.set('update-available');

      const result = await service.confirmUpdate();

      expect(result).toBe(false);
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('should reset updateLoading when no registration is found', async () => {
      mockServiceWorker.getRegistration.mockResolvedValueOnce(null);
      service.pendingAction.set('update-available');

      await service.confirmUpdate();

      expect(service.updateLoading()).toBe(false);
    });

    it('should log why the update was refused', async () => {
      currentUser.set(null);
      service.pendingAction.set('update-available');

      await service.confirmUpdate();

      expect(mockLogger.warn).toHaveBeenCalledWith('[UPDATE page] confirmUpdate refused: no authenticated user');
    });

    it('should log the refusal when no service worker registration exists', async () => {
      mockServiceWorker.getRegistration.mockResolvedValueOnce(null);
      service.pendingAction.set('update-available');

      await service.confirmUpdate();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[UPDATE page] postMessageToSW refused: no service worker registration'
      );
    });

    it('should ping the service worker every 10 s until the run ends', async () => {
      vi.useFakeTimers();
      try {
        service.pendingAction.set('update-available');
        const messageHandler = mockServiceWorker.addEventListener.mock.calls[0][1] as (event: {
          data: Record<string, unknown>;
        }) => Promise<void>;

        const keepaliveCount = () =>
          mockPostMessage.mock.calls.filter(([message]) => (message as { type: string }).type === 'keepalive').length;

        await service.confirmUpdate();
        await vi.advanceTimersByTimeAsync(20000);
        expect(keepaliveCount()).toBe(2);

        await messageHandler({ data: { message: 'error', error: 'boom' } });
        await vi.advanceTimersByTimeAsync(30000);
        expect(keepaliveCount()).toBe(2);
      } finally {
        vi.useRealTimers();
      }
    });

    it('should log when the message is sent to the service worker', async () => {
      service.pendingAction.set('update-available');

      await service.confirmUpdate();

      expect(mockLogger.info).toHaveBeenCalledWith("[UPDATE page] 'update' message sent to SW");
    });

    it('should log an error when posting to the service worker throws', async () => {
      mockServiceWorker.getRegistration.mockRejectedValueOnce(new Error('boom'));
      service.pendingAction.set('update-available');

      const result = await service.confirmUpdate();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "[UPDATE page] could not post 'update' message to SW",
        expect.any(Error)
      );
    });
  });

  describe('forceUpdateFromAdmin', () => {
    it('should post an update message when authenticated and an update is available', async () => {
      service.pendingAction.set('update-available');

      const result = await service.forceUpdateFromAdmin();

      expect(result).toBe(true);
      expect(mockPostMessage).toHaveBeenCalledWith({ type: 'update' });
    });

    it('should refuse when the user is not authenticated', async () => {
      currentUser.set(null);
      service.pendingAction.set('update-available');

      const result = await service.forceUpdateFromAdmin();

      expect(result).toBe(false);
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('should refuse when no update is pending', async () => {
      service.pendingAction.set('none');

      const result = await service.forceUpdateFromAdmin();

      expect(result).toBe(false);
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('should refuse a first-install pending action (not its purpose)', async () => {
      service.pendingAction.set('first-install');

      const result = await service.forceUpdateFromAdmin();

      expect(result).toBe(false);
      expect(mockPostMessage).not.toHaveBeenCalled();
    });
  });

  describe('installFirstLaunch', () => {
    beforeEach(() => {
      service.pendingAction.set('first-install');
    });

    it('should post an install message when authenticated and first-install is pending', async () => {
      const result = await service.installFirstLaunch();

      expect(result).toBe(true);
      expect(mockPostMessage).toHaveBeenCalledWith({ type: 'install' });
    });

    it('should refuse when the user is not authenticated', async () => {
      currentUser.set(null);

      const result = await service.installFirstLaunch();

      expect(result).toBe(false);
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('should refuse when pendingAction is not first-install', async () => {
      service.pendingAction.set('update-available');

      const result = await service.installFirstLaunch();

      expect(result).toBe(false);
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('should reset updateLoading when no registration is found', async () => {
      mockServiceWorker.getRegistration.mockResolvedValueOnce(null);

      await service.installFirstLaunch();

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
      expect(mockMessageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', detail: 'Update failed: network error' })
      );
    });

    it('should log SW-relayed entries with the same [UPDATE <runId>] line as the SW console', async () => {
      await messageHandler({
        data: {
          message: 'log',
          entry: { runId: 'abc12345', level: 'warn', step: 'file-failed', elapsedMs: 42, details: { path: '/a.js' } }
        }
      });

      expect(mockLogger.warn).toHaveBeenCalledWith('[UPDATE abc12345] file-failed +42ms', { path: '/a.js' });
      expect(mockMessageService.add).not.toHaveBeenCalled();
    });

    it('should log every non-log message received from the service worker', async () => {
      await messageHandler({ data: { message: 'error', error: 'boom' } });

      expect(mockLogger.info).toHaveBeenCalledWith('[UPDATE page] message received from SW', {
        message: 'error',
        error: 'boom'
      });
    });

    it('should show the re-login message when the SW reports an expired session (redirect to login)', async () => {
      await messageHandler({
        data: { message: 'error', error: 'Precache failed for /main.js: authentication required (redirected to login)' }
      });

      expect(mockMessageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', detail: 'shared.update-service.update-failed-auth-detail' })
      );
    });

    it('should show the re-login message when the error reports an auth-like HTTP status', async () => {
      service.updateLoading.set(true);

      await messageHandler({
        data: {
          message: 'error',
          error: 'Precache failed for /main.js: HTTP 401'
        }
      });

      expect(service.updateLoading()).toBe(false);
      // TranslocoTestingModule returns the key itself for unknown translations.
      expect(mockMessageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', detail: 'shared.update-service.update-failed-auth-detail' })
      );
    });

    it('should show the generic error, not the re-login message, for an HTTP 502', async () => {
      await messageHandler({
        data: { message: 'error', error: 'Precache failed for /main.js: HTTP 502' }
      });

      expect(mockMessageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', detail: 'Precache failed for /main.js: HTTP 502' })
      );
      expect(mockMessageService.add).not.toHaveBeenCalledWith(
        expect.objectContaining({ detail: 'shared.update-service.update-failed-auth-detail' })
      );
    });
  });

  describe('update monitoring', () => {
    let messageHandler: (event: { data: Record<string, unknown> }) => Promise<void>;

    beforeEach(() => {
      messageHandler = mockServiceWorker.addEventListener.mock.calls[0][1] as typeof messageHandler;
      service.pendingAction.set('update-available');
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const startUpdate = () => service.confirmUpdate();
    const interruptedToast = () =>
      expect(mockMessageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: 'shared.update-service.update-interrupted-summary',
          detail: 'shared.update-service.update-interrupted-detail'
        })
      );

    it('should give up when the service worker never becomes ready', async () => {
      mockServiceWorker.ready = new Promise(() => undefined);

      const result = startUpdate();
      await vi.advanceTimersByTimeAsync(10000);

      await expect(result).resolves.toBe(false);
      expect(service.updateLoading()).toBe(false);
      expect(mockPostMessage).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        "[UPDATE page] service worker not ready after 10s, 'update' not sent"
      );
    });

    it('should show the SW progress as a percentage and restart it at 0 for each update', async () => {
      await startUpdate();
      expect(service.updateProgress()).toBe(0);

      await messageHandler({
        data: { message: 'progress', run: { runId: 'r1', type: 'update', filesTotal: 8, filesDone: 6 } }
      });

      expect(service.updateProgress()).toBe(75);
    });

    it('should leave the loading state at once when the SW answers a keepalive without a run', async () => {
      await startUpdate();

      await messageHandler({ data: { message: 'progress', run: null } });

      expect(service.updateLoading()).toBe(false);
      interruptedToast();
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[UPDATE page] update interrupted: the service worker has no update in progress (it was stopped)'
      );
    });

    it('should stop pinging the SW once the update is interrupted', async () => {
      await startUpdate();
      await messageHandler({ data: { message: 'progress', run: null } });
      mockPostMessage.mockClear();

      await vi.advanceTimersByTimeAsync(60000);

      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('should ignore a progress message when this tab is not updating', async () => {
      await messageHandler({ data: { message: 'progress', run: null } });
      await messageHandler({
        data: { message: 'progress', run: { runId: 'r1', type: 'update', filesTotal: 2, filesDone: 1 } }
      });

      expect(service.updateProgress()).toBe(0);
      expect(mockMessageService.add).not.toHaveBeenCalled();
    });

    it('should declare the update interrupted after 45 s without any SW message', async () => {
      await startUpdate();

      await vi.advanceTimersByTimeAsync(44999);
      expect(service.updateLoading()).toBe(true);
      await vi.advanceTimersByTimeAsync(1);

      expect(service.updateLoading()).toBe(false);
      interruptedToast();
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[UPDATE page] update interrupted: no message from the service worker for 45s'
      );
    });

    it('should restart the 45 s countdown on every SW message', async () => {
      await startUpdate();

      await vi.advanceTimersByTimeAsync(30000);
      await messageHandler({
        data: { message: 'log', entry: { runId: 'r1', level: 'info', step: 'progress', elapsedMs: 1 } }
      });
      await vi.advanceTimersByTimeAsync(30000);
      expect(service.updateLoading()).toBe(true);

      await vi.advanceTimersByTimeAsync(15000);
      expect(service.updateLoading()).toBe(false);
    });

    it('should not start a countdown when the update could not be sent', async () => {
      mockServiceWorker.getRegistration.mockResolvedValueOnce(null);
      await startUpdate();

      await vi.advanceTimersByTimeAsync(60000);

      expect(mockMessageService.add).not.toHaveBeenCalled();
    });

    it('should stop the countdown when the SW reports the end of the update', async () => {
      await startUpdate();
      await messageHandler({ data: { message: 'error', error: 'boom' } });
      vi.mocked(mockMessageService.add).mockClear();

      await vi.advanceTimersByTimeAsync(60000);

      expect(mockMessageService.add).not.toHaveBeenCalled();
    });

    it('should allow a new attempt after an interruption', async () => {
      await startUpdate();
      await messageHandler({ data: { message: 'progress', run: null } });
      mockPostMessage.mockClear();

      const retried = await service.confirmUpdate();

      expect(retried).toBe(true);
      expect(service.updateLoading()).toBe(true);
      expect(mockPostMessage).toHaveBeenCalledWith({ type: 'update' });
    });

    describe('no-progress countdown', () => {
      const progress = (filesDone: number) =>
        messageHandler({
          data: { message: 'progress', run: { runId: 'r1', type: 'update', filesTotal: 100, filesDone } }
        });

      it('should declare the update interrupted when the SW keeps answering but no file is cached for 180 s', async () => {
        await startUpdate();
        await progress(3);

        for (let elapsed = 0; elapsed < 170000; elapsed += 10000) {
          await vi.advanceTimersByTimeAsync(10000);
          await progress(3);
        }
        expect(service.updateLoading()).toBe(true);
        await vi.advanceTimersByTimeAsync(10000);

        expect(service.updateLoading()).toBe(false);
        interruptedToast();
        expect(mockLogger.error).toHaveBeenCalledWith('[UPDATE page] update interrupted: no file cached for 180s');
      });

      it('should never interrupt a slow update that keeps caching files', async () => {
        await startUpdate();

        for (let filesDone = 1; filesDone <= 10; filesDone++) {
          for (let tick = 0; tick < 6; tick++) {
            await vi.advanceTimersByTimeAsync(10000);
            await progress(filesDone);
          }
        }

        expect(service.updateLoading()).toBe(true);
        expect(mockMessageService.add).not.toHaveBeenCalled();
      });

      it('should stop the no-progress countdown once the SW reports the end of the update', async () => {
        await startUpdate();
        await progress(3);
        await messageHandler({ data: { message: 'error', error: 'boom' } });
        vi.mocked(mockMessageService.add).mockClear();

        await vi.advanceTimersByTimeAsync(300000);

        expect(mockMessageService.add).not.toHaveBeenCalled();
      });
    });

    it('should notify success without being in the loading state for an update done by another tab', async () => {
      await messageHandler({ data: { message: 'update_complete' } });

      expect(service.updateLoading()).toBe(false);
      expect(mockMessageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    });
  });

  describe('manifest caching', () => {
    it('should return the same promise on subsequent calls to getLatestAssetList', async () => {
      const mockAssetList = {
        app_version: { git_hash: 'aaa0001', build_datetime_utc: '2024', version: '1.0.0' },
        files: []
      };
      mockFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(mockAssetList) });

      const first = await service.getLatestAssetList();
      const second = await service.getLatestAssetList();

      expect(first).toStrictEqual(second);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should re-fetch after clearManifestCache is called', async () => {
      const mockAssetList = {
        app_version: { git_hash: 'aaa0001', build_datetime_utc: '2024', version: '1.0.0' },
        files: []
      };
      mockFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(mockAssetList) });

      await service.getLatestAssetList();
      service.clearManifestCache();
      await service.getLatestAssetList();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should auto-invalidate cache after checkAppVersion completes', async () => {
      const mockVersion = {
        git_hash: 'e1e1e1e1',
        build_datetime_utc: '2024',
        version: '1.0.0'
      };
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
    /** Answers the next manifest fetch with `appVersion`. */
    function serveVersion(appVersion: Record<string, unknown>): void {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({ app_version: appVersion, files: ['file1.js'] })
      });
    }

    it('should compare only git_hash: a rebuild of the same commit is not an update', async () => {
      serveVersion({ git_hash: 'e1e1e1e1', build_datetime_utc: '9999-12-31T23:59:59.999999', version: '9.9.9' });

      await service.checkAppVersion({ silent: true });

      expect(service.needUpdate()).toBe(false);
    });

    it('should detect update when git_hash differs', async () => {
      serveVersion({ git_hash: 'd1ff3e7', build_datetime_utc: '2024-01-01T00:00:00.000000', version: '1.0.0' });

      await service.checkAppVersion({ silent: true });

      expect(service.needUpdate()).toBe(true);
    });

    it.each([
      ['missing', undefined],
      ['unknown', 'unknown'],
      ['an unreplaced placeholder', '{GIT_HASH}']
    ])('should not propose an update when the server git_hash is %s', async (_label, gitHash) => {
      serveVersion({ git_hash: gitHash, build_datetime_utc: '2024-01-01T00:00:00.000000', version: '2.0.0' });

      await service.checkAppVersion({ silent: true });

      expect(service.pendingAction()).toBe('none');
      expect(mockLogger.warn).toHaveBeenCalledWith('[UPDATE page] server manifest has no valid git_hash', {
        gitHash
      });
    });

    it('should not propose a first install when the server git_hash is invalid', async () => {
      vi.spyOn(service, 'loadCurrentVersion').mockResolvedValue();
      mockCache.match.mockResolvedValue(undefined);
      serveVersion({ git_hash: 'unknown', build_datetime_utc: '2024', version: '2.0.0' });

      await service.checkForUpdateOnce();

      expect(service.pendingAction()).toBe('none');
    });
  });
});
