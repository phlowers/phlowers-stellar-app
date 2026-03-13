import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { TagComponent } from '@shared/components/atoms/tag/tag.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { AccordionModule } from 'primeng/accordion';
import { Study } from '@core/domain';
import { CommonModule, DatePipe } from '@angular/common';
import { StudiesService } from '@services/studies/studies.service';
import { ExportDialogComponent } from './export-dialog/export-dialog.component';

/**
 * Header component for a study page.
 *
 * Displays study metadata, provides actions for duplicating, modifying,
 * and exporting the study, and includes a toggleable detail panel.
 */
@Component({
  selector: 'app-study-header',
  imports: [
    ButtonComponent,
    IconComponent,
    TagComponent,
    AccordionModule,
    DatePipe,
    CommonModule,
    ExportDialogComponent
  ],
  templateUrl: './study-header.component.html',
  styleUrl: './study-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudyHeaderComponent {
  /** Whether the detail accordion panel is expanded. */
  public isDetailOpen = signal<boolean>(false);

  /** Active accordion panel key. */
  public activeDetail = signal<string>('');
  /** The study whose details are displayed. */
  public study = input.required<Study | null>();
  /** Emits the UUID of the study to duplicate. */
  public duplicateStudy = output<string>();
  /** Emits when the user requests to modify the study metadata. */
  public openModifyStudyModal = output<void>();
  public dateFormat = $localize`dd/MM:yyyy at HH'h'mm`;
  private readonly studiesService = inject(StudiesService);

  toggleActiveDetail() {
    this.isDetailOpen.set(!this.isDetailOpen());
    if (this.isDetailOpen()) {
      this.activeDetail.set('0');
    } else {
      this.activeDetail.set('');
    }
  }

  openExportDialog() {
    this.studiesService.exportDialogData.set({
      uuid: this.study()?.uuid ?? '',
      title: this.study()?.title ?? '',
      isOpen: true
    });
  }
}
