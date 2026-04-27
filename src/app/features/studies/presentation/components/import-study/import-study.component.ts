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
import { StudyImportService, studyImportErrors } from '@features/studies/application/services/study-import.service';
import { UUIDCollisionResolver } from '@shared/import/domain/import-contracts';

/** Localized error messages for import error reporting (mirrors service error catalog). */
const errors = studyImportErrors;

/**
 * Returns the localised error message for a given import error key.
 * @param type - Key identifying the error in the `errors` map
 * @returns Localised detail string for the error
 */
const importErrorDetail = (type: keyof typeof errors): string => {
  return errors[type] || $localize`Error importing study`;
};

/**
 * Component for importing studies from `.clst` (app format) or `.csv` (Proto V4) files.
 *
 * Acts as a UI orchestration layer only: it delegates all business logic to
 * {@link StudyImportService} and manages the local state signals for the template.
 */
@Component({
  selector: 'app-import-study',
  imports: [IconComponent, DividerModule, RouterLink, ButtonComponent],
  templateUrl: './import-study.component.html',
  styleUrl: './import-study.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportStudyComponent {
  loading = signal<boolean>(false);
  newStudies = signal<Study[]>([]);
  erroredFiles = signal<string[]>([]);

  private readonly studyImportService = inject(StudyImportService);
  private readonly studiesService = inject(StudiesService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly logger = inject(LoggerService);

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

  private makeCollisionResolver(): UUIDCollisionResolver {
    return (uuid, label) =>
      new Promise((resolve) =>
        this.confirmationService.confirm({
          key: 'positionDialog',
          message: $localize`Study ${label} already exists. Do you want to replace it?`,
          accept: () => resolve(true),
          reject: () => resolve(false),
          acceptLabel: $localize`Yes`,
          rejectLabel: $localize`No`
        })
      );
  }

  private isValidFileType(file: File): boolean {
    return this.studyImportService.accepts(file);
  }

  private separateValidAndInvalidFiles(files: FileList | null): {
    valid: File[];
    invalid: File[];
  } {
    const fileArray = Array.from(files ?? []);
    return {
      valid: fileArray.filter((file) => this.isValidFileType(file)),
      invalid: fileArray.filter((file) => !this.isValidFileType(file))
    };
  }

  private handleInvalidFiles(invalidFiles: File[]): void {
    if (invalidFiles.length === 0) {
      return;
    }
    this.notificationService.error(errors.fileTypeNotAllowed);
    this.erroredFiles.set([...this.erroredFiles(), ...invalidFiles.map((file) => file.name)]);
  }

  private getErrorType(error: unknown): keyof typeof errors {
    if (error instanceof Error && error.message in errors) {
      return error.message as keyof typeof errors;
    }
    return 'studyImportError';
  }

  private handleFileError(fileError: unknown, fileName: string): void {
    const errorType = this.getErrorType(fileError);
    this.logger.error('Error importing file', fileError);
    this.notificationService.error(importErrorDetail(errorType));
    this.erroredFiles.set([...this.erroredFiles(), fileName]);
  }

  private async processValidFiles(files: File[]): Promise<void> {
    for (const file of files) {
      try {
        const study = await this.studyImportService.processFile(file, this.makeCollisionResolver());
        if (study !== null) {
          this.newStudies.set([...this.newStudies(), study]);
        }
      } catch (fileError: unknown) {
        this.handleFileError(fileError, file.name);
      }
    }
  }

  private handleLoadFilesError(error: unknown): void {
    this.logger.error('Error in loadFiles', error);
    this.loading.set(false);
    const errorType = this.getErrorType(error);
    this.notificationService.error(importErrorDetail(errorType));
  }

  async loadFiles(event: Event): Promise<void> {
    try {
      this.loading.set(true);
      const files = (event.target as HTMLInputElement).files;
      const { valid, invalid } = this.separateValidAndInvalidFiles(files);

      this.handleInvalidFiles(invalid);

      if (valid.length > 0) {
        await this.processValidFiles(valid);
      }

      this.loading.set(false);
    } catch (error: unknown) {
      this.handleLoadFilesError(error);
    }
  }
}
