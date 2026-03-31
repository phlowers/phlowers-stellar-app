/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ChangeDetectionStrategy, Component, effect, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { AssetList, UpdateService } from '@services/worker_update/worker_update.service';
import { StorageService } from '@services/storage/storage.service';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';
import { LinesService } from '@shared/catalog/services/lines.service';
import { CablesService } from '@shared/catalog/services/cables.service';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { AppUpdateOrchestratorService } from '@services/worker_update/app-update-orchestrator.service';
import { DividerModule } from 'primeng/divider';
import { ProgressBarModule } from 'primeng/progressbar';

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
 * Handles Pyodide worker setup, catalog synchronization,
 * online/offline status monitoring, and application update prompts.
 * Authentication and database initialization are handled by APP_INITIALIZER (AuthService).
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

  private readonly messageService = inject(MessageService);
  private readonly storageService = inject(StorageService);
  private readonly workerService = inject(WorkerPythonService);
  readonly updateService = inject(UpdateService);
  private readonly appUpdateOrchestratorService = inject(AppUpdateOrchestratorService);
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly linesService = inject(LinesService);
  private readonly cablesService = inject(CablesService);
  private readonly chainsService = inject(ChainsService);
  private readonly attachmentService = inject(AttachmentService);
  private readonly obstacleTypesService = inject(ObstaclesService);
  private readonly csvImporters: Record<string, () => Promise<void>>;
  private readonly needUpdate = toSignal(this.updateService.needUpdate$, { initialValue: false });

  constructor() {
    this.csvImporters = {
      'maintenance-teams.csv': () => this.maintenanceService.importFromFile(),
      'lines.csv': () => this.linesService.importFromFile(),
      'cables.csv': () => this.cablesService.importFromFile(),
      'chains.csv': () => this.chainsService.importFromFile(),
      'attachments.csv': () => this.attachmentService.importFromFile(),
      'obstacle_type_rte.csv': () => this.obstacleTypesService.importFromFile()
    };

    effect(() => {
      this.isUpdateDialogOpen.set(this.needUpdate());
    });
  }

  ngOnInit() {
    this.workerService.setup();
    void this.startupSequence();
  }

  private async startupSequence(): Promise<void> {
    try {
      await this.setupData();
    } catch (error) {
      console.error('Error during startup catalog synchronization', error);
      this.messageService.add({
        severity: 'error',
        summary: $localize`Error`,
        detail: $localize`Catalog synchronization failed during startup`,
        life: 5000
      });
    } finally {
      await this.appUpdateOrchestratorService.initiateStartupCheck();
    }
  }

  async setupData() {
    await this.storageService.assertProtectedTablesUnchanged(async () => {
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
    });
  }

  private async fetchLatestManifestSafe(): Promise<AssetList | null> {
    try {
      return await this.updateService.getLatestAssetList();
    } catch (error) {
      console.warn('Unable to fetch latest asset manifest, using full catalog import fallback', error);
      return null;
    }
  }

  private async importAllCatalogs(): Promise<void> {
    for (const importFn of Object.values(this.csvImporters)) {
      await importFn();
    }
  }

  onUpdateClick() {
    this.appUpdateOrchestratorService.acceptUpdate();
  }
}
