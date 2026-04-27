import { inject, Injectable, signal } from '@angular/core';

import { MessageService } from 'primeng/api';
import type { AssetManifest } from './service-worker.interfaces';

export type { AssetManifest } from './service-worker.interfaces';
import type { AppVersion } from './service-worker.interfaces';
import { environment } from '@src/environments/environment';

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
  /** Signal containing the currently installed application version (from build-time environment). */
  currentVersion = signal<AppVersion>({
    version: environment.version,
    build_datetime_utc: environment.buildTime,
    git_hash: environment.gitHash
  });
  /** Signal containing the latest available application version, or null if unknown */
  latestVersion = signal<AssetManifest['app_version'] | null>(null);
  /** Signal indicating whether an update or install operation is in progress */
  updateLoading = signal(false);

  /**
   * Signal that emits true when an update or install action is available.
   */
  readonly needUpdate = signal(false);

  /** True when the pending action is a first-time install (no SW cache yet). */
  readonly isFirstLaunch = signal(false);

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
            this.updateLoading.set(false);
            this.messageService.add({
              severity: 'success',
              summary: $localize`Update successful`,
              detail: $localize`The application has been updated to the latest version`
            });
            globalThis.location.href = '/';
            break;
          case 'install_complete':
            this.updateLoading.set(false);
            this.needUpdate.set(false);
            this.isFirstLaunch.set(false);
            await this.loadCurrentVersion();
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
   * Check whether the Service Worker cache has been populated (i.e. app is installed).
   *
   * @returns Promise resolving to true if the SW cache contains a version entry
   */
  async isCachePopulated(): Promise<boolean> {
    try {
      const cache = await caches.open('app-assets');
      const cachedResponse = await cache.match('/app_version');
      return cachedResponse !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Fetch the latest available application version from the server.
   *
   * @returns Promise resolving to the latest version or null if unavailable
   */
  async getLatestVersion(): Promise<AppVersion | null> {
    const data = await this.getLatestAssetList();
    if (!data) {
      return null;
    }
    return data.app_version;
  }

  /**
   * Fetch the latest asset manifest from the server with no-cache semantics.
   * The result is cached for subsequent calls within the same startup cycle.
   * Call `clearManifestCache` to force a fresh fetch.
   */
  async getLatestAssetList(): Promise<AssetManifest | null> {
    if (!this.cachedManifestPromise) {
      this.cachedManifestPromise = this.fetchManifest();
    }
    return this.cachedManifestPromise;
  }

  /** Clear the cached manifest so the next call to `getLatestAssetList` re-fetches. */
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
   * Fetches the latest version from the server and compares it with
   * the build-time current version. Updates the needUpdate signal accordingly.
   */
  async checkAppVersion({ silent = false }: { silent?: boolean } = {}) {
    let latestVersion: AppVersion | null = null;
    try {
      latestVersion = await this.getLatestVersion();
    } catch {
      this.needUpdate.set(false);
      return;
    } finally {
      this.clearManifestCache();
    }
    if (latestVersion) {
      this.latestVersion.set(latestVersion);
    }
    if (!latestVersion) {
      this.needUpdate.set(false);
      return;
    }
    if (!this.areVersionsEqual(this.currentVersion(), latestVersion)) {
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
   * Called once from `APP_INITIALIZER`. If the SW cache is empty (first launch),
   * sets `isFirstLaunch` and `needUpdate` so the UI can prompt the user to confirm
   * installation via `confirmUpdate`. Otherwise compares build-time version
   * with the server version and sets `needUpdate` if they differ.
   */
  async checkForUpdateOnce(): Promise<void> {
    try {
      // Load the build-time version file (served from SW cache or network).
      await this.loadCurrentVersion();

      const cachePopulated = await this.isCachePopulated();
      const latestVersion = await this.getLatestVersion();

      if (latestVersion) {
        this.latestVersion.set(latestVersion);
      }

      if (!latestVersion) {
        // Server unreachable — nothing to do.
        return;
      }

      if (!cachePopulated) {
        // First launch: nothing cached yet — signal the UI so the user can confirm.
        this.isFirstLaunch.set(true);
        this.needUpdate.set(true);
        return;
      }

      if (!this.areVersionsEqual(this.currentVersion(), latestVersion)) {
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
   * Confirm the pending action (install or update) after user validation.
   *
   * Must be called from a UI button — no automatic install/update is allowed.
   */
  async confirmUpdate(): Promise<void> {
    if (this.isFirstLaunch()) {
      await this.install();
    } else {
      await this.update();
    }
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

  /**
   * Load the current application version from the build-time version.json file.
   * This file is generated at build time and cached by the Service Worker.
   * Falls back to the environment-based version if the fetch fails.
   */
  async loadCurrentVersion(): Promise<void> {
    try {
      const response = await fetch('/version.json');
      if (response.ok) {
        const version = (await response.json()) as AppVersion;
        this.currentVersion.set(version);
      }
    } catch {
      // Keep environment-based fallback already set in the signal.
    }
  }

  private async postMessageToSW(type: 'update' | 'install'): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      return;
    }
    this.updateLoading.set(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        this.updateLoading.set(false);
        return;
      }
      const ready = await navigator.serviceWorker.ready;
      ready.active?.postMessage({ type });
    } catch {
      this.updateLoading.set(false);
    }
  }

  private areVersionsEqual(a: AppVersion, b: AppVersion): boolean {
    return a.git_hash === b.git_hash && a.version === b.version;
  }
}
