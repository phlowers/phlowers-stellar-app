/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ChangeDetectionStrategy, Component, effect, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { UserService } from '@services/user/user.service';
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

/** Regex pattern for validating email addresses. */
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

interface ProtectedDataSnapshot {
  userCount: number;
  studyCount: number;
}

const modules = [
  RouterModule,
  CommonModule,
  FormsModule,
  ToastModule,
  InputTextModule,
  DialogModule,
  ButtonComponent,
  IconComponent,
  ReactiveFormsModule,
  DividerModule,
  ProgressBarModule
];

/**
 * Root application component.
 *
 * Handles user registration, service worker setup, database initialization,
 * online/offline status monitoring, and application update prompts.
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
  readonly userDialog = signal(false);
  readonly isUpdateDialogOpen = signal(false);
  form: FormGroup<{
    email: FormControl<string | null>;
  }>;

  readonly submitted = signal(false);
  private readonly messageService = inject(MessageService);
  private readonly storageService = inject(StorageService);
  private readonly workerService = inject(WorkerPythonService);
  private readonly userService = inject(UserService);
  readonly updateService = inject(UpdateService);
  private readonly appUpdateOrchestratorService = inject(AppUpdateOrchestratorService);
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly linesService = inject(LinesService);
  private readonly cablesService = inject(CablesService);
  private readonly chainsService = inject(ChainsService);
  private readonly attachmentService = inject(AttachmentService);
  private readonly obstacleTypesService = inject(ObstaclesService);
  private readonly csvImporters: Record<string, () => Promise<void>>;
  private readonly storageReady = toSignal(this.storageService.ready$, { initialValue: false });
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

    this.form = new FormGroup({
      email: new FormControl<string>('', [Validators.required, Validators.pattern(emailRegex)])
    });

    /**
     * PHASE 1 REFACTORING: Removed online-triggered update check.
     * Update verification moved to single startup check in Phase 2 (AppUpdateOrchestratorService).
     * No longer re-checking on online/offline transitions.
     * See plan-update.md Phase 1 for details.
     */

    effect(() => {
      if (this.storageReady()) {
        this.userService.getUser().then((user) => {
          this.userDialog.set(!user);
          this.setupData().finally(() => {
            void this.appUpdateOrchestratorService.initiateStartupCheck();
          });
        });
      }
    });

    effect(() => {
      this.isUpdateDialogOpen.set(this.needUpdate());
    });
  }

  async setupData() {
    const protectedDataSnapshot = await this.captureProtectedDataSnapshot();
    const manifest = await this.fetchLatestManifestSafe();
    const dataHashes = manifest?.data_hashes || {};
    const hashEntries = Object.entries(dataHashes);

    // Fallback for legacy builds without per-CSV hashes.
    if (hashEntries.length === 0) {
      await this.importAllCatalogs();
      await this.assertProtectedDataSnapshot(protectedDataSnapshot);
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

    await this.assertProtectedDataSnapshot(protectedDataSnapshot);
  }

  private async captureProtectedDataSnapshot(): Promise<ProtectedDataSnapshot | null> {
    const database = this.storageService.db;
    if (!database) {
      return null;
    }

    const [userCount, studyCount] = await Promise.all([database.users.count(), database.studies.count()]);
    return { userCount, studyCount };
  }

  private async assertProtectedDataSnapshot(snapshot: ProtectedDataSnapshot | null): Promise<void> {
    const database = this.storageService.db;
    if (!snapshot || !database) {
      return;
    }

    const [userCount, studyCount] = await Promise.all([database.users.count(), database.studies.count()]);
    if (userCount !== snapshot.userCount || studyCount !== snapshot.studyCount) {
      throw new Error('Protected data integrity check failed after catalog synchronization');
    }
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

  async saveUser() {
    this.submitted.set(true);
    if (this.form.valid) {
      await this.userService.createUser({ email: this.form.value.email! }).catch((err) => {
        console.error('Error creating user', err);
        this.messageService.add({
          severity: 'error',
          summary: $localize`Error`,
          detail: $localize`Error creating user`,
          life: 3000
        });
      });
      this.messageService.add({
        severity: 'success',
        summary: $localize`Successful`,
        detail: $localize`User info set`,
        life: 3000
      });
      this.userDialog.set(false);
    }
  }

  async setupWorker() {
    try {
      this.workerService.setup();
      await this.storageService.setPersistentStorage();
      await this.storageService.createDatabase();
    } catch (err) {
      console.error('Error creating database', err);
    }
  }

  ngOnInit() {
    this.setupWorker();
  }

  isInvalid(controlName: string) {
    const control = this.form.get(controlName);
    return control?.invalid && control.touched;
  }

  onUpdateClick() {
    this.appUpdateOrchestratorService.acceptUpdate();
  }
}
