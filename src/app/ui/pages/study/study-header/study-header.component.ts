import { Component, input, output, signal } from '@angular/core';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { TagComponent } from '@ui/shared/components/atoms/tag/tag.component';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { AccordionModule } from 'primeng/accordion';
import { Study } from '@core/domain';
import { CommonModule, DatePipe } from '@angular/common';
import { StudiesService } from '@services/studies/studies.service';
import { ExportDialogComponent } from './export-dialog/export-dialog.component';

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
  styleUrl: './study-header.component.scss'
})
/** Header component for the study page, displaying study metadata, actions, and export dialog. */
export class StudyHeaderComponent {
  /** Whether the detail accordion panel is currently expanded. */
  public isDetailOpen = signal<boolean>(false);

  /** Active detail panel identifier for the accordion. */
  public activeDetail = signal<string>('');
  /** The study to display in the header. */
  public study = input.required<Study | null>();
  /** Emits the study UUID when a duplication is requested. */
  public duplicateStudy = output<string>();
  /** Emits when the user requests to modify the study. */
  public openModifyStudyModal = output<void>();
  /** Locale-aware date format string used in the template. */
  public dateFormat = $localize`dd/MM:yyyy at HH'h'mm`;
  constructor(private readonly studiesService: StudiesService) {}

  /** Toggles the visibility of the study detail accordion panel. */
  toggleActiveDetail() {
    this.isDetailOpen.set(!this.isDetailOpen());
    if (this.isDetailOpen()) {
      this.activeDetail.set('0');
    } else {
      this.activeDetail.set('');
    }
  }

  /** Opens the study export dialog populated with the current study data. */
  openExportDialog() {
    this.studiesService.exportDialogData.set({
      uuid: this.study()?.uuid ?? '',
      title: this.study()?.title ?? '',
      isOpen: true
    });
  }
}
