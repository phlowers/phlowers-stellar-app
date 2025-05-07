import { TestBed } from '@angular/core/testing';
import { UpdateService } from './update.service';

describe('UpdateService', () => {
  let service: UpdateService;
  let mockServiceWorker: any;
  let mockCaches: any;
  let mockCache: any;
  let mockFetch: any;
  let originalServiceWorker: any;
  let originalCaches: any;
  let originalFetch: any;

  beforeEach(() => {
    // Mock service worker
    mockServiceWorker = {
      addEventListener: jest.fn(),
      getRegistration: jest.fn().mockResolvedValue({
        active: {
          postMessage: jest.fn()
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
      match: jest.fn()
    };
    mockCaches = {
      open: jest.fn().mockResolvedValue(mockCache)
    };
    originalCaches = window.caches;
    Object.defineProperty(window, 'caches', {
      value: mockCaches,
      writable: true
    });

    // Mock fetch
    mockFetch = jest.fn();
    originalFetch = window.fetch;
    window.fetch = mockFetch;

    TestBed.configureTestingModule({
      providers: [UpdateService]
    });
    service = TestBed.inject(UpdateService);
    service.latestVersion = null;
    service.currentVersion = null;
  });

  afterEach(() => {
    // Restore original objects
    Object.defineProperty(navigator, 'serviceWorker', {
      value: originalServiceWorker,
      writable: true
    });
    Object.defineProperty(window, 'caches', {
      value: originalCaches,
      writable: true
    });
    window.fetch = originalFetch;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should register service worker event listener on initialization', () => {
    expect(mockServiceWorker.addEventListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function)
    );
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

      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockAssetList)
      });

      mockCache.match.mockResolvedValueOnce(null);

      await service.getAppVersion();

      expect(mockFetch).toHaveBeenCalledWith('/assets_list.json');
      expect(service.latestVersion).toEqual(mockLatestVersion);
      expect(service.currentVersion).toBeNull();
      expect(service.needUpdate).toBe(false);
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
        json: jest.fn().mockResolvedValueOnce({
          app_version: mockLatestVersion,
          files: ['file1.js', 'file2.css']
        })
      });

      mockCache.match.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockCurrentVersion)
      });

      await service.getAppVersion();

      expect(mockCaches.open).toHaveBeenCalledWith('app-assets');
      expect(mockCache.match).toHaveBeenCalledWith('/app_version');
      expect(service.currentVersion).toEqual(mockCurrentVersion);
      expect(service.latestVersion).toEqual(mockLatestVersion);
      expect(service.needUpdate).toBe(true);
    });

    it('should handle fetch errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      mockCache.match.mockResolvedValueOnce(null);

      await service.getAppVersion();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching asset list:',
        expect.any(Error)
      );
      expect(service.latestVersion).toBeNull();
      expect(service.currentVersion).toBeNull();
      expect(service.needUpdate).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('update', () => {
    it('should set updateLoading to true and send message to service worker', async () => {
      const mockCurrentVersion = {
        git_hash: 'def456',
        build_datetime_utc: '2022-12-31T00:00:00.000000'
      };
      const mockLatestVersion = {
        git_hash: 'abc123',
        build_datetime_utc: '2023-01-01T00:00:00.000000'
      };

      service.currentVersion = mockCurrentVersion;
      service.latestVersion = mockLatestVersion;

      const mockPostMessage = jest.fn();
      mockServiceWorker.getRegistration.mockResolvedValueOnce({
        active: {
          postMessage: mockPostMessage
        }
      });

      await service.update();

      expect(service.updateLoading).toBe(true);
      expect(mockServiceWorker.getRegistration).toHaveBeenCalled();
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'update',
        currentVersion: mockCurrentVersion,
        latestVersion: mockLatestVersion
      });
    });
  });

  describe('service worker message handling', () => {
    let messageHandler: (event: any) => void;

    beforeEach(() => {
      // Extract the message handler function
      messageHandler = mockServiceWorker.addEventListener.mock.calls[0][1];
    });

    it('should handle update_complete message', () => {
      jest.useFakeTimers();

      const mockCurrentVersion = {
        git_hash: 'abc123',
        build_datetime_utc: '2023-01-01T00:00:00.000000'
      };

      const sucessFullUpdateSpy = jest.spyOn(service.sucessFullUpdate, 'next');

      service.updateLoading = true;

      messageHandler({
        data: {
          message: 'update_complete',
          current_version: mockCurrentVersion
        }
      });

      expect(service.updateLoading).toBe(false);
      expect(service.currentVersion).toEqual(mockCurrentVersion);
      expect(sucessFullUpdateSpy).toHaveBeenCalled();

      jest.advanceTimersByTime(1000);

      jest.useRealTimers();
    });

    it('should handle new_version message', () => {
      const mockCurrentVersion = {
        git_hash: 'def456',
        build_datetime_utc: '2022-12-31T00:00:00.000000'
      };
      const mockLatestVersion = {
        git_hash: 'abc123',
        build_datetime_utc: '2023-01-01T00:00:00.000000'
      };

      messageHandler({
        data: {
          message: 'new_version',
          current_version: mockCurrentVersion,
          latest_version: mockLatestVersion
        }
      });

      expect(service.currentVersion).toEqual(mockCurrentVersion);
      expect(service.latestVersion).toEqual(mockLatestVersion);
      expect(service.needUpdate).toBe(true);
    });

    it('should handle no_new_version message', () => {
      const mockVersion = {
        git_hash: 'abc123',
        build_datetime_utc: '2023-01-01T00:00:00.000000'
      };

      messageHandler({
        data: {
          message: 'no_new_version',
          current_version: mockVersion,
          latest_version: mockVersion
        }
      });

      expect(service.currentVersion).toEqual(mockVersion);
      expect(service.latestVersion).toEqual(mockVersion);
      expect(service.needUpdate).toBe(false);
    });

    it('should handle install_complete message', () => {
      const mockVersion = {
        git_hash: 'abc123',
        build_datetime_utc: '2023-01-01T00:00:00.000000'
      };

      messageHandler({
        data: {
          message: 'install_complete',
          latest_version: mockVersion
        }
      });

      expect(service.currentVersion).toEqual(mockVersion);
      expect(service.latestVersion).toEqual(mockVersion);
      expect(service.needUpdate).toBe(false);
    });
  });
});
