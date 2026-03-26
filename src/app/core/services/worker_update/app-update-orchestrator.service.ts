import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AssetList, UpdateService } from '@services/worker_update/worker_update.service';
import { isEqual } from 'lodash';

/**
 * AppUpdateOrchestratorService — Phase 2 refactoring
 *
 * Orchestrates application update checks with the following guarantees:
 * - **Single-check-per-boot**: Only one version check when app initializes (no re-checks on online/offline)
 * - **User consent mandatory**: Updates only proceed after explicit user approval via popup
 * - **Stateful**: Tracks whether startup check has been performed this session
 * - **OIDC-compatible**: Uses HttpClient (token-aware) for all manifest fetches
 * - **Fail-safe**: Network errors or missing versions don't block app startup
 *
 * @remarks
 * This service replaces the previous auto-update mechanisms. The Service Worker
 * no longer triggers updates on activate; the orchestrator runs once at app startup
 * and delegates all HTTP communication to Angular's HttpClient for OIDC token injection.
 *
 * Usage (in AppComponent constructor):
 * ```typescript
 * constructor() {
 *   effect(() => {
 *     if (this.storageReady()) {
 *       this.orchestrator.initiateStartupCheck();
 *     }
 *   });
 * }
 * ```
 *
 * @category Services
 * @category Phase 2 Refactoring
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateOrchestratorService {
  /** Whether the startup version check has been completed this session */
  readonly startupCheckCompleted = signal(false);

  /** Whether a check is currently in progress */
  readonly isCheckingVersion = signal(false);

  private readonly updateService = inject(UpdateService);
  private readonly httpClient = inject(HttpClient);

  /**
   * Initiates the single startup version check for this app session.
   *
   * @remarks
   * Call this once during app initialization (e.g., in AppComponent constructor
   * after storage is ready). Subsequent calls in the same session are no-ops.
   *
   * This method:
   * 1. Checks if startup check already completed → returns early if so
   * 2. Fetches the latest manifest via HttpClient (OIDC token auto-injected)
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
      console.log('ORCHESTRATOR: Startup check already completed, skipping');
      return;
    }

    console.log('ORCHESTRATOR: Starting single startup version check');
    this.isCheckingVersion.set(true);

    try {
      // Fetch latest version from server (uses HttpClient for OIDC token support)
      const latestAssets = await this.getLatestAssetListViaHttpClient();

      if (!latestAssets) {
        console.warn('ORCHESTRATOR: Could not fetch latest manifest, continuing with cached version');
        this.startupCheckCompleted.set(true);
        return;
      }

      // Get currently cached version
      const currentVersion = await this.updateService.getCurrentVersion();

      // Compare versions
      if (currentVersion && !isEqual(currentVersion, latestAssets.app_version)) {
        console.log('ORCHESTRATOR: New version available, triggering update dialog');
        this.updateService.latestVersion.set(latestAssets.app_version);
        this.updateService.needUpdate$.next(true);

        // The AppComponent will show the update dialog. User interaction is necessary.
        // When user clicks "Update now", AppComponent will call acceptUpdate().
        // When user clicks "Later" or closes dialog, the app continues without update.
      } else {
        console.log('ORCHESTRATOR: Application is up to date or cached version unavailable');
      }
    } catch (error) {
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
    const registration = navigator.serviceWorker.controller;
    if (registration) {
      console.log('ORCHESTRATOR: User accepted update, posting update message to Service Worker');
      registration.postMessage({ type: 'update' });
      this.updateService.updateLoading.set(true);
    } else {
      console.warn('ORCHESTRATOR: No Service Worker controller available');
    }
  }

  /**
   * Fetch the latest asset manifest via HttpClient.
   *
   * @remarks
   * This replaces the raw fetch() call in UpdateService.getLatestAssetList()
   * and enables OIDC token auto-injection while maintaining error safety.
   *
   * @returns Promise<AssetList | null> — Latest manifest or null on any error
   */
  private async getLatestAssetListViaHttpClient(): Promise<AssetList | null> {
    try {
      // HttpClient (via interceptor) will auto-inject OIDC Bearer token if available
      const response = await firstValueFrom(
        this.httpClient.get<AssetList>('/assets_list.json', {
          headers: {
            'cache-control': 'no-cache',
            pragma: 'no-cache'
          }
        })
      );

      if (!response) {
        console.warn('ORCHESTRATOR: Empty response from /assets_list.json');
        return null;
      }

      return response;
    } catch (error) {
      console.error('ORCHESTRATOR: Failed to fetch latest asset list via HttpClient:', error);
      return null;
    }
  }
}
