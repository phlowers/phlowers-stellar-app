import { Injectable, isDevMode, signal } from '@angular/core';

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
  /** Git commit hash of the build */
  git_hash: string;
  /** UTC timestamp when the build was created */
  build_datetime_utc: string;
  /** Semantic version string */
  version: string;
}

/**
 * Represents the list of assets for a specific application version.
 *
 * @category Types
 */
export interface AssetList {
  /** Version information for the asset bundle */
  app_version: AppVersion;
  /** List of file paths included in the asset bundle */
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

  constructor(private readonly messageService: MessageService) {
    navigator.serviceWorker.addEventListener('message', async (event) => {
      console.log(`Message from service worker:`, event.data);
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
      console.log('current version is', version);
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
    const response = await fetch('/assets_list.json');
    if (response) {
      const data: AssetList = await response.json();
      console.log('latest version is', data.app_version);
      return data.app_version;
    } else {
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
