/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { OnlineService } from '@services/online/online.service';
import { StorageService } from '@services/storage/storage.service';
import { IconComponent } from './shared/components/atoms/icon/icon.component';
import { ButtonComponent } from './shared/components/atoms/button/button.component';
import { UserService } from '@services/user/user.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { AssetList, UpdateService } from '@services/worker_update/worker_update.service';
import { Subscription } from 'rxjs';
import { MaintenanceService } from '@services/maintenance/maintenance.service';
import { LinesService } from '@services/lines/lines.service';
import { CablesService } from '@services/cables/cables.service';
import { ChainsService } from '@services/chains/chains.service';
import { AttachmentService } from '@services/attachment/attachment.service';
import { ObstaclesService } from '@core/services/obstacles/obstacles.service';
import { DividerModule } from 'primeng/divider';
import { ProgressBarModule } from 'primeng/progressbar';

/** Regex pattern for validating email addresses. */
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

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
export class AppComponent implements OnInit, OnDestroy {
  title = 'phlowers-stellar-app';
  readonly userDialog = signal(false);
  readonly isUpdateDialogOpen = signal(false);
  form: FormGroup<{
    email: FormControl<string | null>;
  }>;

  readonly submitted = signal(false);
  private readonly subscriptions = new Subscription();
  private readonly messageService = inject(MessageService);
  private readonly storageService = inject(StorageService);
  private readonly workerService = inject(WorkerPythonService);
  private readonly userService = inject(UserService);
  private readonly onlineService = inject(OnlineService);
  readonly updateService = inject(UpdateService);
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly linesService = inject(LinesService);
  private readonly cablesService = inject(CablesService);
  private readonly chainsService = inject(ChainsService);
  private readonly attachmentService = inject(AttachmentService);
  private readonly obstacleTypesService = inject(ObstaclesService);
  private readonly csvImporters: Record<string, () => Promise<void>>;
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
    this.subscriptions.add(
      this.onlineService.online$.subscribe((online) => {
        if (online) {
          this.updateService.checkAppVersion();
        }
      })
    );
    this.subscriptions.add(
      this.storageService.ready$.subscribe(async (ready) => {
        if (ready) {
          const user = await this.userService.getUser();
          this.userDialog.set(!user);
          this.setupData();
        }
      })
    );
    this.subscriptions.add(
      this.updateService.needUpdate$.subscribe((needUpdate) => {
        this.isUpdateDialogOpen.set(needUpdate);
      })
    );
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

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
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
    this.updateService.update();
  }
}
