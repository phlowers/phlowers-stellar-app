import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { Study } from '@shared/domain';
import { StudiesService } from '@services/studies/studies.service';
import { DividerModule } from 'primeng/divider';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { ConfirmationService } from 'primeng/api';
import { NotificationService } from '@services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { StudyImportService } from '@features/studies/application/services/study-import.service';
import { errors, importErrorDetail } from './import-study.constants';
import { IMPORT_ADAPTER_TOKEN, UUIDCollisionResolver } from '@shared/import/domain/import-contracts';
import { GenericImportEngineService } from '@shared/import/application/services/generic-import-engine.service';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

/**
 * Component for importing studies from `.clst` (app format) or `.csv` (Proto V4) files.
 *
 * Acts as a UI orchestration layer delegating all file processing to
 * `GenericImportEngineService` via the `StudyImportService` adapter.
 * HTML and SCSS are preserved for zero user-visible regression.
 */
@Component({
  selector: 'app-import-study',
  imports: [IconComponent, DividerModule, RouterLink, ButtonComponent, TranslocoModule],
  providers: [GenericImportEngineService, { provide: IMPORT_ADAPTER_TOKEN, useExisting: StudyImportService }],
  templateUrl: './import-study.component.html',
  styleUrl: './import-study.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportStudyComponent {
  readonly loading = signal<boolean>(false);
  readonly newStudies = signal<Study[]>([]);
  readonly erroredFiles = signal<string[]>([]);

  private readonly engine = inject(GenericImportEngineService);
  private readonly studyImportService = inject(StudyImportService);
  private readonly studiesService = inject(StudiesService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly logger = inject(LoggerService);
  private readonly translocoService = inject(TranslocoService);

  async deleteStudy(uuid: string): Promise<void> {
    await this.studiesService.deleteStudy(uuid);
    this.newStudies.set(this.newStudies().filter((study) => study.uuid !== uuid));
  }

  /**
   * Public delegation for backward compatibility with tests.
   * Loads and imports a `.clst` file, then updates `newStudies` on success.
   */
  loadAppFile(file: File): Promise<void> {
    return this.studyImportService.loadAppFile(file, this.makeCollisionResolver()).then((study) => {
      if (study !== null) {
        this.newStudies.set([...this.newStudies(), study]);
      }
    });
  }

  /**
   * Public delegation for backward compatibility with tests.
   * Finds a cable by name in the cable catalog.
   */
  findCableInDatabase(conductor: string): Promise<string | null> {
    return this.studyImportService.findCableInDatabase(conductor);
  }

  async loadFiles(event: Event): Promise<void> {
    try {
      this.loading.set(true);
      const files = Array.from((event.target as HTMLInputElement).files ?? []);

      if (files.length === 0) {
        this.loading.set(false);
        return;
      }

      const outcomes = await this.engine.processFiles(files, this.makeCollisionResolver());

      // Notify once if any files were rejected due to type mismatch (mirrors original behaviour).
      const typeErrors = outcomes.filter((o) => o.status === 'error' && o.error?.code === 'FILE_TYPE_NOT_ALLOWED');
      if (typeErrors.length > 0) {
        this.notificationService.error(this.translocoService.translate(errors.fileTypeNotAllowed));
        this.erroredFiles.update((prev) => [...prev, ...typeErrors.map((o) => o.fileName)]);
      }

      for (const outcome of outcomes) {
        if (outcome.status === 'success' && outcome.entityId) {
          this.newStudies.update((prev) => [
            ...prev,
            { uuid: outcome.entityId!, title: outcome.entityLabel ?? '' } as Study
          ]);
        } else if (outcome.status === 'error' && outcome.error?.code !== 'FILE_TYPE_NOT_ALLOWED') {
          const errorKey = outcome.error?.code as keyof typeof errors;
          this.notificationService.error(this.translocoService.translate(importErrorDetail(errorKey)));
          this.erroredFiles.update((prev) => [...prev, outcome.fileName]);
        }
      }

      this.loading.set(false);
    } catch (error: unknown) {
      this.handleLoadFilesError(error);
    }
  }

  private makeCollisionResolver(): UUIDCollisionResolver {
    return (uuid, label) =>
      new Promise((resolve) =>
        this.confirmationService.confirm({
          key: 'positionDialog',
          message: this.translocoService.translate('studies.import-study.collision-message', { label }),
          accept: () => resolve(true),
          reject: () => resolve(false),
          acceptLabel: this.translocoService.translate('common.import.collision.yes'),
          rejectLabel: this.translocoService.translate('common.import.collision.no')
        })
      );
  }

  private getErrorType(error: unknown): keyof typeof errors {
    if (error instanceof Error && error.message in errors) {
      return error.message as keyof typeof errors;
    }
    return 'studyImportError';
  }

  private handleLoadFilesError(error: unknown): void {
    this.logger.error('Error in loadFiles', error);
    this.loading.set(false);
    const errorType = this.getErrorType(error);
    this.notificationService.error(this.translocoService.translate(importErrorDetail(errorType)));
  }
}
