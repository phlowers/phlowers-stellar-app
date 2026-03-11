import { inject, Injectable, isDevMode, signal } from '@angular/core';

import { environment } from '@src/environments/environment';
import { isEqual } from 'lodash';
import { MessageService } from 'primeng/api';
import { BehaviorSubject } from 'rxjs';

/**
 * Represents the application version information.
 *
 * @category Types
 */
export interface AppVersion {
  /** Full git commit hash of the build. */
  git_hash: string;
  /** UTC datetime string when the build was produced. */
  build_datetime_utc: string;
  /** Semantic version string. */
  version: string;
}

/** Structure of the `assets_list.json` manifest used by the Service Worker.
 *
 * @category Types
 */
export interface AssetList {
  /** The version metadata for this build. */
  app_version: AppVersion;
  /** Per-CSV hashes used to detect catalog updates. */
  data_hashes?: Record<string, string>;
  /** List of asset file paths to cache. */
  files: string[];
}

const mockCurrentVersion: AppVersion = {
  git_hash: '0000000000000000000000000000000000000000',
  build_datetime_utc: environment.buildTime,
  version: environment.version
};

const mockLatestVersion: AppVersion = {
  git_hash: '1111111111111111111111111111111111111111',
  build_datetime_utc: '0000-00-00T00:00:00.000000',
  version: '0.0.0'
};

/**
 * Service for managing application updates via Service Worker.
 *
 * @remarks
 * The UpdateService monitors application version changes and coordinates
 * updates through the Service Worker. It compares the currently installed
 * version with the latest available version and provides methods to
 * trigger updates.
 *
 * @example
 * ```typescript
 * // Check if update is needed
 * this.updateService.needUpdate$.subscribe(needsUpdate => {
 *   if (needsUpdate) {
 *     this.showUpdatePrompt();
 *   }
 * });
 *
 * // Trigger an update
 * await this.updateService.update();
 * ```
 *
 * @category Services
 */
@Injectable({ providedIn: 'root' })
export class UpdateService {
  /** Signal containing the currently installed application version, or null if unknown */
  currentVersion = signal<AppVersion | null>(isDevMode() ? mockCurrentVersion : null);
  /** Signal containing the latest available application version, or null if unknown */
  latestVersion = signal<AppVersion | null>(isDevMode() ? mockLatestVersion : null);
  /** Signal indicating whether an update or install operation is in progress */
  updateLoading = signal(false);

  /**
   * BehaviorSubject that emits true when an update is available.
   */
  needUpdate$ = new BehaviorSubject<boolean>(false);

  private readonly messageService = inject(MessageService);

  constructor() {
    navigator.serviceWorker.addEventListener('message', async (event) => {
      if (event.data.message) {
        switch (event.data.message) {
          case 'worker_ready':
            await this.checkAppVersion();
            break;
          case 'update_complete':
            await this.checkAppVersion();
            this.updateLoading.set(false);
            this.messageService.add({
              severity: 'success',
              summary: $localize`Update successful`,
              detail: $localize`The application has been updated to the latest version`
            });
            window.location.href = '/';
            break;
          case 'install_complete':
            await this.checkAppVersion();
            this.updateLoading.set(false);
            this.messageService.add({
              severity: 'success',
              summary: $localize`Install successful`,
              detail: $localize`The application has been installed`
            });
            break;
        }
      }
    });
  }

  /**
   * Retrieve the currently installed application version from cache.
   *
   * @returns Promise resolving to the current version or null if not cached
   */
  async getCurrentVersion() {
    const cache = await caches.open('app-assets');
    const cachedResponse = await cache.match('/app_version');
    if (cachedResponse) {
      const version = await cachedResponse.json();
      return version;
    } else {
      return null;
    }
  }

  /**
   * Fetch the latest available application version from the server.
   *
   * @returns Promise resolving to the latest version or null if unavailable
   */
  async getLatestVersion() {
    const data = await this.getLatestAssetList();
    if (!data) {
      return null;
    }
    return data.app_version;
  }

  /**
   * Fetch the latest asset manifest from the server with no-cache semantics.
   */
  async getLatestAssetList(): Promise<AssetList | null> {
    try {
      const response = await fetch('/assets_list.json', {
        cache: 'no-store',
        headers: {
          'cache-control': 'no-cache',
          pragma: 'no-cache'
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as AssetList;
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Check if a new application version is available.
   *
   * @remarks
   * Compares the cached version with the server version and updates
   * the needUpdate$ subject accordingly.
   */
  async checkAppVersion() {
    const currentVersion = await this.getCurrentVersion();
    const latestVersion = await this.getLatestVersion();
    if (!currentVersion || !latestVersion) {
      this.needUpdate$.next(false);
      return;
    }
    this.currentVersion.set(currentVersion);
    this.latestVersion.set(latestVersion);
    if (!isEqual(currentVersion, latestVersion)) {
      this.needUpdate$.next(true);
    } else {
      this.needUpdate$.next(false);
    }
    this.messageService.add({
      severity: 'info',
      summary: $localize`App version`,
      detail: $localize`App version checked`
    });
  }

  /**
   * Trigger an application update via the Service Worker.
   *
   * @remarks
   * Sends an update message to the Service Worker which will download
   * and cache the new version. A page reload is required after completion.
   */
  async update() {
    this.updateLoading.set(true);
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      registration.active?.postMessage({
        type: 'update'
      });
    }
  }

  /**
   * Trigger an initial application installation via the Service Worker.
   *
   * @remarks
   * Used for first-time installations to cache all application assets.
   */
  async install() {
    this.updateLoading.set(true);
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      registration.active?.postMessage({ type: 'install' });
    }
  }
}
