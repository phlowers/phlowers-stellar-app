/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ActivatedRoute } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { NewStudyModalComponent } from '@shared/components/new-study-modal/new-study-modal.component';
import { ButtonModule } from 'primeng/button';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { TableModule } from 'primeng/table';

import { TabsModule } from 'primeng/tabs';
import { CheckboxModule } from 'primeng/checkbox';
import { PopoverModule } from 'primeng/popover';
import { Study } from '@shared/domain';
import { StudiesService } from '@services/studies/studies.service';

import { StudiesTableComponent } from '@features/studies/presentation/components/studies-table/studies-table.component';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ImportStudyComponent } from '@features/studies/presentation/components/import-study/import-study.component';
import { ExportDialogComponent } from '@shared/components/export-dialog/export-dialog.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { LoggerService } from '@core/services/logger/logger.service';
import { NotificationService } from '@services/notification/notification.service';

/**
 * Main studies listing page.
 *
 * Displays all studies in a table and provides actions to create, delete,
 * duplicate, import, and export studies.
 */
@Component({
  standalone: true,
  imports: [
    NewStudyModalComponent,
    ButtonModule,
    ButtonComponent,
    IconComponent,
    TabsModule,
    TableModule,
    CheckboxModule,
    PopoverModule,
    StudiesTableComponent,
    ConfirmDialogModule,
    ImportStudyComponent,
    ExportDialogComponent,
    TranslocoModule
  ],
  templateUrl: './studies.component.html',
  providers: [MessageService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudiesComponent {
  readonly isNewStudyModalOpen = signal(false);
  readonly studies = signal<Study[]>([]);
  private readonly route = inject(ActivatedRoute);
  private readonly studiesService = inject(StudiesService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly translocoService = inject(TranslocoService);
  private readonly logger = inject(LoggerService);
  private readonly notificationService = inject(NotificationService);
  private readonly rawStudies = toSignal(this.studiesService.studies, { initialValue: [] as Study[] });
  private readonly studiesReady = toSignal(this.studiesService.ready, { initialValue: false });

  constructor() {
    this.isNewStudyModalOpen.set(this.route.snapshot.queryParams['create'] === 'true');

    effect(() => {
      this.studies.set(this.sortStudies(this.rawStudies()));
    });

    effect(() => {
      if (this.studiesReady()) {
        void this.studiesService.getStudies().then((studies) => {
          this.studies.set(this.sortStudies(studies));
        });
      }
    });
  }

  sortStudies(studies: Study[]) {
    return [...studies].sort((a, b) => {
      return new Date(b.created_at_offline).getTime() - new Date(a.created_at_offline).getTime();
    });
  }

  duplicateStudy(uuid: string) {
    this.studiesService.duplicateStudy(uuid).catch((error: unknown) => {
      this.logger.error('Failed to duplicate study', error);
      this.notificationService.error(this.translocoService.translate('study.notifications.duplication-failed'));
    });
  }

  deleteStudy(uuid: string) {
    this.confirmationService.confirm({
      key: 'positionDialog',
      message: this.translocoService.translate('studies.delete-confirm-message'),
      accept: () => {
        this.studiesService.deleteStudy(uuid).catch((error: unknown) => {
          this.logger.error('Failed to delete study', error);
          this.notificationService.error(this.translocoService.translate('studies.import.error-delete'));
        });
      },
      acceptLabel: this.translocoService.translate('common.import.collision.yes'),
      rejectLabel: this.translocoService.translate('common.import.collision.no')
    });
  }
}
