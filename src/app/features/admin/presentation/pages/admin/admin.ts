/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { TableModule } from 'primeng/table';
import { AppUpdateService } from '@services/app-update/app-update.service';
import { isAppCacheName, offlineStatusKind } from '@services/app-update/app-update.helpers';
import { APP_UPDATE_I18N, OFFLINE_STATUS_I18N_PREFIX } from '@services/app-update/app-update.constantes';
import { UpdateDiagnostics } from '@services/app-update/app-update.interfaces';
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
import { LoggerService } from '@core/services/logger/logger.service';
import { NotificationService } from '@services/notification/notification.service';
import { checkResultKey, refusalReasonKey, toMegabytes } from './admin.helpers';

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
    ToggleSwitch,
    TranslocoModule
  ],
  providers: [ConfirmationService, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminComponent implements OnInit {
  readonly appUpdateService = inject(AppUpdateService);
  readonly onlineService = inject(OnlineService);
  private readonly messageService = inject(MessageService);
  private readonly studyService = inject(StudiesService);
  private readonly storageService = inject(StorageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly workerPythonService = inject(WorkerPythonService);
  private readonly window = inject(WINDOW);
  private readonly translocoService = inject(TranslocoService);
  private readonly datePipe = inject(DatePipe);
  private readonly logger = inject(LoggerService);
  private readonly notificationService = inject(NotificationService);

  readonly checking = signal(false);
  readonly diagnostics = signal<UpdateDiagnostics | null>(null);
  readonly offlineLabelKey = computed(
    () => `${OFFLINE_STATUS_I18N_PREFIX}.${offlineStatusKind(this.appUpdateService.state())}`
  );
  readonly pendingVersionKey = computed(() =>
    this.appUpdateService.state() === 'update-waiting'
      ? APP_UPDATE_I18N.updateWaitingSummary
      : 'admin.no-pending-version'
  );
  readonly lastRefusalKey = computed(() => {
    const refusal = this.appUpdateService.lastRefusal();
    return refusal ? refusalReasonKey(refusal.reason) : null;
  });
  readonly downlinkText = computed(() => {
    const diagnostics = this.diagnostics();
    if (!diagnostics || diagnostics.downlinkMbps === null) {
      return this.translocoService.translate('admin.not-available');
    }
    return this.translocoService.translate('admin.downlink-value', {
      downlink: diagnostics.downlinkMbps,
      threshold: diagnostics.thresholdMbps
    });
  });
  readonly storageText = computed(() => {
    const usage = toMegabytes(this.diagnostics()?.usageBytes ?? null);
    const quota = toMegabytes(this.diagnostics()?.quotaBytes ?? null);
    if (usage === null || quota === null) {
      return this.translocoService.translate('admin.not-available');
    }
    return this.translocoService.translate('admin.storage-value', { usage, quota });
  });

  constructor() {
    this.activateDebugLogs.set(localStorage.getItem('activateDebugLogs') === 'true');
  }

  async ngOnInit(): Promise<void> {
    await this.refreshDiagnostics();
  }

  /** Asks for an update check; the download itself happens in the background and is never applied from here. */
  async checkForUpdates(): Promise<void> {
    this.checking.set(true);
    try {
      const decision = await this.appUpdateService.checkForUpdate();
      this.notificationService.info(this.translocoService.translate(checkResultKey(decision)));
    } finally {
      await this.refreshDiagnostics();
      this.checking.set(false);
    }
  }

  private async refreshDiagnostics(): Promise<void> {
    this.diagnostics.set(await this.appUpdateService.readDiagnostics());
  }

  /**
   * Formats a build datetime for display, falling back to the raw value
   * instead of throwing when it is missing/unparsable (e.g. an unsubstituted
   * `{BUILD_TIME}` placeholder left by a build that skipped `set-env-variables`).
   */
  formatBuildDate(value: string | undefined): string | null {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    try {
      return this.datePipe.transform(value, 'dd/MM/yyyy HH:mm');
    } catch {
      return value;
    }
  }
  activateDebugLogsOptions = [
    { label: this.translocoService.translate('admin.admin.on'), value: LogLevel.DEBUG },
    { label: this.translocoService.translate('admin.admin.off'), value: LogLevel.WARNING }
  ];
  readonly activateDebugLogs = signal(false);

  deleteAllStudies() {
    this.confirmationService.confirm({
      message: this.translocoService.translate('admin.delete-studies-confirm'),
      accept: () => {
        this.studyService.deleteAllStudies().catch((error: unknown) => {
          this.logger.error('Failed to delete all studies', error);
          this.notificationService.error(
            this.translocoService.translate('shared.global-error-handler.unexpected-error')
          );
        });
        this.messageService.add({
          severity: 'success',
          summary: this.translocoService.translate('admin.delete-studies-summary'),
          detail: this.translocoService.translate('admin.delete-studies-detail')
        });
      }
    });
  }

  resetDatabase() {
    this.confirmationService.confirm({
      message: this.translocoService.translate('admin.reset-database-confirm'),
      accept: () => {
        this.storageService.resetDatabase().catch((error: unknown) => {
          this.logger.error('Failed to reset database', error);
          this.notificationService.error(
            this.translocoService.translate('shared.global-error-handler.unexpected-error')
          );
        });
        this.messageService.add({
          severity: 'success',
          summary: this.translocoService.translate('admin.reset-database-summary'),
          detail: this.translocoService.translate('admin.reset-database-detail')
        });
      }
    });
  }

  resetApp() {
    this.confirmationService.confirm({
      message: this.translocoService.translate('admin.reset-app-confirm'),
      accept: async () => {
        // Unregister all service workers.
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        // Delete the application caches (Workbox precache, catalog files, previous update system).
        // IndexedDB (studies, imported catalogs) is preserved.
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.filter(isAppCacheName).map((name) => caches.delete(name)));

        this.messageService.add({
          severity: 'success',
          summary: this.translocoService.translate('admin.reset-app-summary'),
          detail: this.translocoService.translate('admin.reset-app-detail')
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
        ? this.translocoService.translate('admin.python-logs-activated-summary')
        : this.translocoService.translate('admin.python-logs-deactivated-summary'),
      detail: activate
        ? this.translocoService.translate('admin.python-logs-activated-detail')
        : this.translocoService.translate('admin.python-logs-deactivated-detail')
    });
  }
}
