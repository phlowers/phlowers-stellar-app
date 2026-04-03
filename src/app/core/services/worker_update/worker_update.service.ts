import { inject, Injectable, signal } from '@angular/core';

import { MessageService } from 'primeng/api';
import type { AssetManifest } from './service-worker.interfaces';

export type { AssetManifest } from './service-worker.interfaces';
import type { AppVersion } from './service-worker.interfaces';

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
 * if (this.updateService.needUpdate()) {
 *   this.showUpdatePrompt();
 * }
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
  currentVersion = signal<AssetManifest['app_version'] | null>(null);
  /** Signal containing the latest available application version, or null if unknown */
  latestVersion = signal<AssetManifest['app_version'] | null>(null);
  /** Signal indicating whether an update or install operation is in progress */
  updateLoading = signal(false);

  /**
   * Signal that emits true when an update is available.
   */
  readonly needUpdate = signal(false);

  private readonly messageService = inject(MessageService);
  private cachedManifestPromise: Promise<AssetManifest | null> | null = null;

  constructor() {
    if (!('serviceWorker' in navigator)) {
      return;
    }
    navigator.serviceWorker.addEventListener('message', async (event) => {
      if (event.data.message) {
        switch (event.data.message) {
          case 'update_complete':
            try {
              await this.checkAppVersion({ silent: true });
            } catch {
              // Version check failed — proceed with reload anyway.
            }
            this.updateLoading.set(false);
            this.messageService.add({
              severity: 'success',
              summary: $localize`Update successful`,
              detail: $localize`The application has been updated to the latest version`
            });
            globalThis.location.href = '/';
            break;
          case 'install_complete':
            await this.checkAppVersion({ silent: true });
            this.updateLoading.set(false);
            this.messageService.add({
              severity: 'success',
              summary: $localize`Install successful`,
              detail: $localize`The application has been installed`
            });
            break;
          case 'error':
            this.updateLoading.set(false);
            this.messageService.add({
              severity: 'error',
              summary: $localize`Update failed`,
              detail: event.data.error ?? $localize`An unknown error occurred during the update`
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
   * The result is cached for subsequent calls within the same startup cycle.
   * Call {@link clearManifestCache} to force a fresh fetch.
   */
  async getLatestAssetList(): Promise<AssetManifest | null> {
    if (!this.cachedManifestPromise) {
      this.cachedManifestPromise = this.fetchManifest();
    }
    return this.cachedManifestPromise;
  }

  /** Clear the cached manifest so the next call to {@link getLatestAssetList} re-fetches. */
  clearManifestCache(): void {
    this.cachedManifestPromise = null;
  }

  private async fetchManifest(): Promise<AssetManifest | null> {
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

      const data = (await response.json()) as AssetManifest;
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
   * the needUpdate signal accordingly.
   */
  async checkAppVersion({ silent = false }: { silent?: boolean } = {}) {
    let currentVersion: AppVersion | null = null;
    let latestVersion: AppVersion | null = null;
    try {
      currentVersion = await this.getCurrentVersion();
      latestVersion = await this.getLatestVersion();
    } catch {
      this.needUpdate.set(false);
      return;
    } finally {
      this.clearManifestCache();
    }
    if (currentVersion) {
      this.currentVersion.set(currentVersion);
    }
    if (latestVersion) {
      this.latestVersion.set(latestVersion);
    }
    if (!currentVersion || !latestVersion) {
      this.needUpdate.set(false);
      return;
    }
    if (!this.areVersionsEqual(currentVersion, latestVersion)) {
      this.needUpdate.set(true);
    } else {
      this.needUpdate.set(false);
    }
    if (!silent) {
      this.messageService.add({
        severity: 'info',
        summary: $localize`App version`,
        detail: $localize`App version checked`
      });
    }
  }

  /**
   * Perform a single update/install check at application startup.
   *
   * @remarks
   * Called once from `APP_INITIALIZER`. If `currentVersion` is null (first launch,
   * nothing cached), triggers `install()` instead of `update()`.
   * Does not trigger any polling or repeated checks.
   */
  async checkForUpdateOnce(): Promise<void> {
    try {
      const currentVersion = await this.getCurrentVersion();
      const latestVersion = await this.getLatestVersion();

      if (currentVersion) {
        this.currentVersion.set(currentVersion);
      }
      if (latestVersion) {
        this.latestVersion.set(latestVersion);
      }

      if (!latestVersion) {
        // Server unreachable — nothing to do.
        return;
      }

      if (!currentVersion) {
        // First launch: nothing cached yet — install the app into the SW cache.
        await this.install();
        return;
      }

      if (!this.areVersionsEqual(currentVersion, latestVersion)) {
        // An update is available — signal the UI.
        this.needUpdate.set(true);
      }
    } catch {
      // Non-blocking: startup must not fail because of an update-check failure.
    } finally {
      this.clearManifestCache();
    }
  }

  /**
   * Trigger an application update via the Service Worker.
   *
   * @remarks
   * Sends an update message to the Service Worker which will download
   * and cache the new version. A page reload is required after completion.
   */
  async update() {
    await this.postMessageToSW('update');
  }

  /**
   * Trigger an initial application installation via the Service Worker.
   *
   * @remarks
   * Used for first-time installations to cache all application assets.
   */
  async install() {
    await this.postMessageToSW('install');
  }

  private async postMessageToSW(type: 'update' | 'install'): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      return;
    }
    this.updateLoading.set(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration?.active) {
        this.updateLoading.set(false);
        return;
      }
      registration.active.postMessage({ type });
    } catch {
      this.updateLoading.set(false);
    }
  }

  private areVersionsEqual(a: AppVersion, b: AppVersion): boolean {
    return a.git_hash === b.git_hash && a.build_datetime_utc === b.build_datetime_utc && a.version === b.version;
  }
}
