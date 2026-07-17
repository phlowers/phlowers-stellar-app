/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { NotificationService } from '@services/notification/notification.service';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { UpdateService } from '@services/worker_update/worker_update.service';
import type { AssetManifest } from '@services/worker_update/service-worker.interfaces';
import { AuthService } from '@services/auth/auth.service';
import { StorageService } from '@services/storage/storage.service';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';
import { LinesService } from '@shared/catalog/services/lines.service';
import { CablesService } from '@shared/catalog/services/cables.service';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { DividerModule } from 'primeng/divider';
import { LoggerService } from '@core/services/logger/logger.service';
import { ProgressBarModule } from 'primeng/progressbar';
import { DialogModule } from 'primeng/dialog';

const modules = [
  RouterModule,
  CommonModule,
  ToastModule,
  DialogModule,
  ButtonComponent,
  IconComponent,
  DividerModule,
  ProgressBarModule
];

/**
 * Root application component.
 *
 * Handles catalog CSV setup, online/offline status monitoring, and application update prompts.
 * User authentication is handled by AuthService (OIDC via Apache) and APP_INITIALIZER.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: modules,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  title = 'phlowers-stellar-app';
  readonly isUpdateDialogOpen = signal(false);

  private readonly notificationService = inject(NotificationService);
  private readonly storageService = inject(StorageService);
  private readonly workerService = inject(WorkerPythonService);
  readonly updateService = inject(UpdateService);
  private readonly authService = inject(AuthService);
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly linesService = inject(LinesService);
  private readonly cablesService = inject(CablesService);
  private readonly chainsService = inject(ChainsService);
  private readonly attachmentService = inject(AttachmentService);
  private readonly obstacleTypesService = inject(ObstaclesService);
  private readonly logger = inject(LoggerService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly csvImporters: Record<string, () => Promise<void>>;

  /** Guard against repeated automatic install triggers from the reactive effect. */
  private readonly autoInstallTriggered = signal(false);

  /** Set to true on destroy to abort any in-flight first-install retry. */
  private destroyed = false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
    });
    this.csvImporters = {
      'maintenance-teams.csv': () => this.maintenanceService.importFromFile(),
      'lines.csv': () => this.linesService.importFromFile(),
      'cables.csv': () => this.cablesService.importFromFile(),
      'chains.csv': () => this.chainsService.importFromFile(),
      'attachments.csv': () => this.attachmentService.importFromFile(),
      'obstacle_configuration.json': () => this.obstacleTypesService.importFromFile()
    };

    effect(() => {
      const action = this.updateService.pendingAction();
      const user = this.authService.currentUser();

      // Never surface install/update prompts for unauthenticated users.
      if (!user) {
        this.isUpdateDialogOpen.set(false);
        return;
      }

      if (action === 'first-install') {
        // First install runs automatically once the user is authenticated.
        this.isUpdateDialogOpen.set(false);
        // Read the guard untracked: resetting it to false on a failure path must not
        // re-trigger this effect (it would otherwise loop while pendingAction stays 'first-install').
        if (!untracked(this.autoInstallTriggered)) {
          this.autoInstallTriggered.set(true);
          this.tryAutomaticFirstInstall();
        }
        return;
      }

      if (action === 'update-available') {
        // Updates always require explicit user confirmation via the dialog.
        this.isUpdateDialogOpen.set(true);
        return;
      }

      this.isUpdateDialogOpen.set(false);
    });
  }

  async setupData() {
    const manifest = await this.fetchLatestManifestSafe();
    const dataHashes = manifest?.data_hashes || {};
    const hashEntries = Object.entries(dataHashes);

    // Fallback for legacy builds without per-CSV hashes.
    if (hashEntries.length === 0) {
      await this.importAllCatalogs();
      return;
    }

    for (const [csvFileName, importFn] of Object.entries(this.csvImporters)) {
      const latestHash = dataHashes[csvFileName];
      if (!latestHash) {
        continue;
      }

      const metadataKey = `catalog_hash:${csvFileName}`;
      const storedHash = await this.storageService.db?.metadata.get(metadataKey);
      if (storedHash?.value === latestHash) {
        continue;
      }

      await importFn();
      await this.storageService.db?.metadata.put({
        key: metadataKey,
        value: latestHash,
        updated_at: new Date().toISOString()
      });
    }
  }

  private async fetchLatestManifestSafe(): Promise<AssetManifest | null> {
    try {
      return await this.updateService.getLatestAssetList();
    } catch (error) {
      this.logger.warn('Unable to fetch latest asset manifest, using full catalog import fallback', error);
      return null;
    }
  }

  private async importAllCatalogs(): Promise<void> {
    for (const importFn of Object.values(this.csvImporters)) {
      await importFn();
    }
  }

  /**
   * Attempt to start the automatic first-install. If the Service Worker is not
   * ready yet (no registration or no active worker), wait for `serviceWorker.ready`
   * and retry once. The guard is reset on any failure path so the reactive effect
   * can trigger another attempt on the next state change.
   */
  private tryAutomaticFirstInstall(): void {
    const installFailedMessage = $localize`Initial application installation could not start. Please reload the page to try again.`;

    this.updateService
      .install()
      .then(async (started) => {
        if (started || this.destroyed) {
          return;
        }
        this.logger.warn('Automatic first-install deferred: Service Worker not ready, awaiting registration');
        if (!this.updateService.serviceWorkerSupported) {
          this.autoInstallTriggered.set(false);
          return;
        }
        try {
          await navigator.serviceWorker.ready;
        } catch (err) {
          if (this.destroyed) {
            return;
          }
          this.autoInstallTriggered.set(false);
          this.logger.error('Service Worker never became ready for first-install', err);
          this.notificationService.error(installFailedMessage);
          return;
        }
        if (this.destroyed) {
          return;
        }
        const retryStarted = await this.updateService.install().catch((err) => {
          this.logger.error('Automatic first-install retry failed', err);
          return false;
        });
        if (this.destroyed) {
          return;
        }
        if (!retryStarted) {
          this.autoInstallTriggered.set(false);
          this.notificationService.error(installFailedMessage);
        }
      })
      .catch((err) => {
        if (this.destroyed) {
          return;
        }
        this.autoInstallTriggered.set(false);
        this.logger.error('Automatic first-install failed', err);
        this.notificationService.error(installFailedMessage);
      });
  }

  async setupWorker() {
    try {
      this.workerService.setup();
      await this.storageService.setPersistentStorage();
      await this.storageService.createDatabase();
    } catch (err) {
      this.logger.error('Error creating database', err);
    }
  }

  ngOnInit() {
    this.deferHeavyStartupWork();
  }

  /**
   * Defers Pyodide worker boot (numpy/pandas/pydantic wasm wheels) and the
   * catalog CSV import until the browser is idle, so they never compete with
   * the critical rendering path (shell JS/CSS) right after bootstrap. Falls
   * back to a macrotask when `requestIdleCallback` is unavailable (Safari).
   */
  private deferHeavyStartupWork(): void {
    const runHeavyStartup = () => {
      this.workerService.setup();
      this.setupData().catch((err) => {
        this.logger.error('Error during data setup', err);
      });
    };

    const idleGlobal = globalThis as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };

    if (typeof idleGlobal.requestIdleCallback === 'function') {
      idleGlobal.requestIdleCallback(runHeavyStartup, { timeout: 2000 });
    } else {
      setTimeout(runHeavyStartup, 0);
    }
  }
}
