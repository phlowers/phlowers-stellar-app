import { inject, Injectable, signal } from '@angular/core';
import { AssetList, UpdateService } from '@services/worker_update/worker_update.service';
import { isEqual } from 'lodash';

@Injectable({ providedIn: 'root' })
export class AppUpdateOrchestratorService {
  /** Whether the startup version check has been completed this session */
  readonly startupCheckCompleted = signal(false);

  /** Whether a check is currently in progress */
  readonly isCheckingVersion = signal(false);

  private readonly updateService = inject(UpdateService);
  private latestManifest: AssetList | null = null;

  /**
   * Initiates the single startup version check for this app session.
   *
   * @remarks
   * Call this once during app initialization (e.g., in AppComponent constructor
   * after storage is ready). Subsequent calls in the same session are no-ops.
   *
   * This method:
   * 1. Checks if startup check already completed → returns early if so
   * 2. Fetches the latest manifest via `UpdateService.getLatestAssetList()`
   * 3. Compares cached vs. latest version
   * 4. Triggers update dialog popup if new version available
   * 5. Waits for user consent (user clicks "Update now" or "Later")
   * 6. On user approval: posts 'update' message to Service Worker for atomic cache swap
   * 7. On user decline: continues with current version
   * 8. Marks startup check as complete
   *
   * @returns Promise resolving when user decision is made or on error
   */
  async initiateStartupCheck(): Promise<void> {
    if (this.startupCheckCompleted()) {
      return;
    }

    this.isCheckingVersion.set(true);

    try {
      // Fetch latest version from server through UpdateService (OIDC-aware HttpClient path)
      const latestAssets = await this.updateService.getLatestAssetList();
      this.latestManifest = latestAssets;

      if (!latestAssets) {
        console.warn('ORCHESTRATOR: Could not fetch latest manifest, continuing with cached version');
        this.startupCheckCompleted.set(true);
        return;
      }

      // Get currently cached version
      const currentVersion = await this.updateService.getCurrentVersion();

      // Compare versions
      if (currentVersion && !isEqual(currentVersion, latestAssets.app_version)) {
        this.updateService.latestVersion.set(latestAssets.app_version);
        this.updateService.needUpdate$.next(true);

        // The AppComponent will show the update dialog. User interaction is necessary.
        // When user clicks "Update now", AppComponent will call acceptUpdate().
        // When user clicks "Later" or closes dialog, the app continues without update.
      } 
    } catch (error) {
      this.latestManifest = null;
      console.error('ORCHESTRATOR: Startup check failed, app continues with cached state:', error);
    } finally {
      this.isCheckingVersion.set(false);
      this.startupCheckCompleted.set(true);
    }
  }

  /**
   * Called by AppComponent when user approves an available update.
   *
   * @remarks
   * This sends an 'update' message to the Service Worker, which triggers
   * the atomic cache swap and manifest processing.
   */
  acceptUpdate(): void {
    const serviceWorkerController = navigator.serviceWorker.controller;
    if (serviceWorkerController) {
      if (this.latestManifest) {
        serviceWorkerController.postMessage({ type: 'update', manifest: this.latestManifest });
      } else {
        serviceWorkerController.postMessage({ type: 'update' });
      }
      this.updateService.updateLoading.set(true);
    } else {
      console.warn('ORCHESTRATOR: No Service Worker controller available');
    }
  }
}
