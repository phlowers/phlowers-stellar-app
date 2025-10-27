import { Component, input, output, signal } from '@angular/core';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { TagComponent } from '@ui/shared/components/atoms/tag/tag.component';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { AccordionModule } from 'primeng/accordion';
import { Study } from '@src/app/core/data/database/interfaces/study';
import { CommonModule, DatePipe } from '@angular/common';
import { StudiesService } from '@src/app/core/services/studies/studies.service';

@Component({
  selector: 'app-study-header',
  imports: [
    ButtonComponent,
    IconComponent,
    TagComponent,
    AccordionModule,
    DatePipe,
    CommonModule
  ],
  templateUrl: './study-header.component.html',
  styleUrl: './study-header.component.scss'
})
export class StudyHeaderComponent {
  public isDetailOpen = signal<boolean>(false);

  public activeDetail = signal<string>('');
  public study = input.required<Study | null>();
  public duplicateStudy = output<string>();
  public openModifyStudyModal = output<void>();
  public dateFormat = $localize`dd/MM:yyyy at HH'h'mm`;

  constructor(private readonly studiesService: StudiesService) {}

  toggleActiveDetail() {
    this.isDetailOpen.set(!this.isDetailOpen());
    if (this.isDetailOpen()) {
      this.activeDetail.set('0');
    } else {
      this.activeDetail.set('');
    }
  }

  exportStudy() {
    if (!this.study()) {
      return;
    }
    this.studiesService.downloadStudy(this.study()!.uuid);
  }
}
