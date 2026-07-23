/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { TableModule } from 'primeng/table';
import { UpdateService } from '@services/worker_update/worker_update.service';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { StudiesService } from '@services/studies/studies.service';
import { StorageService } from '@services/storage/storage.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { OnlineService } from '@services/online/online.service';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { LogLevel, Task } from '@services/worker_python/tasks/types';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { WINDOW } from '@core/tokens/window.token';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

/** Name of the service worker cache used for app assets. */
const CACHE_NAME = 'app-assets';

/**
 * Administration page component.
 *
 * Provides actions to delete all studies, reset the database, reset the app,
 * manage updates, and toggle debug logging.
 */
@Component({
  selector: 'app-admin',
  standalone: true,
  styleUrls: ['./admin.scss'],
  templateUrl: './admin.html',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    CardModule,
    ToastModule,
    ConfirmDialogModule,
    ButtonComponent,
    ProgressSpinnerModule,
    DatePipe,
    ToggleSwitch,
    TranslocoModule
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminComponent {
  readonly updateService = inject(UpdateService);
  readonly onlineService = inject(OnlineService);
  private readonly messageService = inject(MessageService);
  private readonly studyService = inject(StudiesService);
  private readonly storageService = inject(StorageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly workerPythonService = inject(WorkerPythonService);
  private readonly window = inject(WINDOW);
  private readonly translocoService = inject(TranslocoService);

  constructor() {
    this.activateDebugLogs.set(localStorage.getItem('activateDebugLogs') === 'true');
  }
  updateAvailable = false;
  newVersion = '';
  activateDebugLogsOptions = [
    { label: this.translocoService.translate('admin.admin.on'), value: LogLevel.DEBUG },
    { label: this.translocoService.translate('admin.admin.off'), value: LogLevel.WARNING }
  ];
  readonly activateDebugLogs = signal(false);

  deleteAllStudies() {
    this.confirmationService.confirm({
      message: this.translocoService.translate('admin.admin.delete-studies-confirm'),
      accept: () => {
        this.studyService.deleteAllStudies();
        this.messageService.add({
          severity: 'success',
          summary: this.translocoService.translate('admin.admin.delete-studies-summary'),
          detail: this.translocoService.translate('admin.admin.delete-studies-detail')
        });
      }
    });
  }

  resetDatabase() {
    this.confirmationService.confirm({
      message: this.translocoService.translate('admin.admin.reset-database-confirm'),
      accept: () => {
        this.storageService.resetDatabase();
        this.messageService.add({
          severity: 'success',
          summary: this.translocoService.translate('admin.admin.reset-database-summary'),
          detail: this.translocoService.translate('admin.admin.reset-database-detail')
        });
      }
    });
  }

  resetApp() {
    this.confirmationService.confirm({
      message: this.translocoService.translate('admin.admin.reset-app-confirm'),
      accept: async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
        await caches.delete(CACHE_NAME);
        this.messageService.add({
          severity: 'success',
          summary: this.translocoService.translate('admin.admin.reset-app-summary'),
          detail: this.translocoService.translate('admin.admin.reset-app-detail')
        });
        setTimeout(() => {
          this.window.location.assign('/');
        }, 2000);
      }
    });
  }

  async onChangeActivateDebugLogs(activate: boolean) {
    await this.workerPythonService.runTask(Task.setLogLevel, {
      activateDebugLogs: activate
    });
    // store the info in the local storage
    localStorage.setItem('activateDebugLogs', activate.toString());
    this.messageService.add({
      severity: 'success',
      summary: activate
        ? this.translocoService.translate('admin.admin.python-logs-activated-summary')
        : this.translocoService.translate('admin.admin.python-logs-deactivated-summary'),
      detail: activate
        ? this.translocoService.translate('admin.admin.python-logs-activated-detail')
        : this.translocoService.translate('admin.admin.python-logs-deactivated-detail')
    });
  }
}
