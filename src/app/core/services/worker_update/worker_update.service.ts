import { computed, inject, Injectable, signal } from '@angular/core';

import { MessageService } from 'primeng/api';
import type { AssetManifest, AppVersion } from './service-worker.interfaces';
import { environment } from '@src/environments/environment';

/**
 * Pending PWA action determined by `checkForUpdateOnce` or `checkAppVersion`.
 *
 * - `none`: nothing to do.
 * - `first-install`: the Service Worker cache is empty and the app must be installed.
 * - `update-available`: a newer application version is available on the server.
 */
export type PendingPwaAction = 'none' | 'first-install' | 'update-available';

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
 * // Check if an action is pending
 * if (this.updateService.pendingAction() !== 'none') {
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
  private static readonly hasServiceWorker = 'serviceWorker' in navigator;

  /** Timeout (ms) for the `/version.json` fetch, so a slow/unreachable network never hangs startup. */
  private static readonly VERSION_FETCH_TIMEOUT_MS = 5000;

  /**
   * True when the current runtime exposes a Service Worker API.
   * Centralizes the capability check so callers do not need to probe
   * `navigator.serviceWorker` themselves.
   */
  readonly serviceWorkerSupported: boolean = UpdateService.hasServiceWorker;

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
   * Pending PWA action computed at startup or by an explicit version check.
   *
   * The value remains stable until either the Service Worker reports completion
   * or a new check overwrites it. The presentation layer is responsible for
   * gating any user-facing behavior on the authenticated user state.
   */
  readonly pendingAction = signal<PendingPwaAction>('none');

  /**
   * True when an action (first install or update) is pending.
   * Derived from `pendingAction`.
   */
  readonly needUpdate = computed<boolean>(() => this.pendingAction() !== 'none');

  /**
   * True when the pending action corresponds to a first-time install
   * (Service Worker cache empty). Derived from `pendingAction`.
   */
  readonly isFirstLaunch = computed<boolean>(() => this.pendingAction() === 'first-install');

  private readonly messageService = inject(MessageService);
  private cachedManifestPromise: Promise<AssetManifest | null> | null = null;

  constructor() {
    if (!UpdateService.hasServiceWorker) {
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
            this.pendingAction.set('none');
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
      this.pendingAction.set('none');
      return;
    } finally {
      this.clearManifestCache();
    }
    if (latestVersion) {
      this.latestVersion.set(latestVersion);
    }
    if (!latestVersion) {
      this.pendingAction.set('none');
      return;
    }
    if (!this.areVersionsEqual(this.currentVersion(), latestVersion)) {
      this.pendingAction.set('update-available');
    } else {
      this.pendingAction.set('none');
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
   * sets `pendingAction` to `'first-install'` so the UI can prompt the user to confirm
   * installation via `confirmUpdate`. Otherwise compares build-time version
   * with the server version and sets `pendingAction` to `'update-available'` if they differ.
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
        // First launch: nothing cached yet — record a pending first install.
        this.pendingAction.set('first-install');
        return;
      }

      if (!this.areVersionsEqual(this.currentVersion(), latestVersion)) {
        // An update is available — signal the UI.
        this.pendingAction.set('update-available');
      } else {
        // Versions match — clear any stale pending action so repeated calls
        // remain idempotent and a previous 'update-available' does not persist.
        this.pendingAction.set('none');
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
   *
   * @returns `true` if the message was successfully posted to an active
   * Service Worker, `false` otherwise (e.g. SW unavailable, no registration,
   * no active worker yet, or an error occurred while posting).
   */
  async update(): Promise<boolean> {
    return this.postMessageToSW('update');
  }

  /**
   * Confirm the pending action (install or update) after user validation.
   *
   * Must be called from a UI button — no automatic install/update is allowed.
   *
   * @returns `true` if the underlying install/update message was posted
   * successfully, `false` otherwise.
   */
  async confirmUpdate(): Promise<boolean> {
    if (this.pendingAction() === 'first-install') {
      return this.install();
    }
    return this.update();
  }

  /**
   * Trigger an initial application installation via the Service Worker.
   *
   * @remarks
   * Used for first-time installations to cache all application assets.
   *
   * @returns `true` if the install message was successfully posted to an
   * active Service Worker, `false` otherwise (e.g. SW unavailable, no
   * registration returned yet, no active worker, or an error occurred while
   * posting).
   */
  async install(): Promise<boolean> {
    return this.postMessageToSW('install');
  }

  /**
   * Load the current application version from the build-time version.json file.
   *
   * @remarks
   * Fetched with `no-store` semantics and bounded by a timeout: `/version.json`
   * is bypassed by the Service Worker cache (see `shouldBypassSW` in
   * `service-worker.ts`), but the main-thread fetch must still avoid stale
   * intermediary caches and never hang indefinitely on a slow/unreachable
   * network. Falls back to the environment-based version if the fetch fails.
   */
  async loadCurrentVersion(): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UpdateService.VERSION_FETCH_TIMEOUT_MS);
    try {
      const response = await fetch('/version.json', {
        cache: 'no-store',
        headers: {
          'cache-control': 'no-cache',
          pragma: 'no-cache'
        },
        signal: controller.signal
      });
      if (response.ok) {
        const version = (await response.json()) as AppVersion;
        this.currentVersion.set(version);
      }
    } catch {
      // Keep environment-based fallback already set in the signal.
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Post a control message to the active Service Worker.
   *
   * @returns `true` when the message was successfully delivered to an active
   * worker, `false` otherwise (no SW support, no registration yet, no active
   * worker, or an error raised by the Service Worker API).
   */
  private async postMessageToSW(type: 'update' | 'install'): Promise<boolean> {
    if (!UpdateService.hasServiceWorker) {
      return false;
    }
    this.updateLoading.set(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        this.updateLoading.set(false);
        return false;
      }
      const ready = await navigator.serviceWorker.ready;
      if (!ready.active) {
        this.updateLoading.set(false);
        return false;
      }
      ready.active.postMessage({ type });
      return true;
    } catch {
      this.updateLoading.set(false);
      return false;
    }
  }

  private areVersionsEqual(a: AppVersion, b: AppVersion): boolean {
    return a.git_hash === b.git_hash && a.version === b.version;
  }
}
