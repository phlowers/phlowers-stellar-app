import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StudyHeaderComponent } from '../../shared/components/layout/study-header/study-header.component';
import { StudiesService } from '@src/app/core/services/studies/studies.service';
import { Study } from '@src/app/core/data/database/interfaces/study';
import { TabsModule } from 'primeng/tabs';
import { AccordionModule } from 'primeng/accordion';
import { RadioButtonModule } from 'primeng/radiobutton';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { StepperModule } from 'primeng/stepper';
import { InputTextModule } from 'primeng/inputtext';
import { SectionsTabComponent } from './tabs/sections/sectionsTab.component';
import { Section } from '@src/app/core/data/database/interfaces/section';
import { v4 as uuidv4 } from 'uuid';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { InitialCondition } from '@src/app/core/data/database/interfaces/initialCondition';
import { NewStudyModalComponent } from '../studies/components/new-study-modal/new-study-modal.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-study',
  imports: [
    StudyHeaderComponent,
    TabsModule,
    AccordionModule,
    RadioButtonModule,
    FormsModule,
    ButtonModule,
    StepperModule,
    InputTextModule,
    SectionsTabComponent,
    ToastModule,
    CommonModule,
    NewStudyModalComponent
  ],
  templateUrl: './study.component.html',
  styleUrl: './study.component.scss'
})
export class StudyComponent implements OnInit {
  study: Study | null = null;
  isNewStudyModalOpen = signal<boolean>(false);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly studiesService: StudiesService,
    private readonly router: Router,
    private readonly messageService: MessageService
  ) {}

  ngOnInit(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (!uuid) {
      this.router.navigate(['/studies']);
    }
    this.studiesService.ready.subscribe((ready) => {
      if (ready && uuid) {
        this.studiesService.getStudy(uuid).then((study) => {
          if (study) {
            this.study = study;
          }
        });
      }
    });
    this.route.params.subscribe((params) => {
      const uuid = params['uuid'];
      if (uuid) {
        this.refreshStudy(uuid);
      }
    });
  }

  refreshStudy(uuid: string) {
    if (uuid && this.studiesService.ready.value) {
      this.studiesService.getStudy(uuid).then((study) => {
        if (study) {
          this.study = study;
        }
      });
    }
  }

  openModifyStudyModal() {
    this.isNewStudyModalOpen.set(true);
  }

  duplicateStudy(uuid: string) {
    this.studiesService.duplicateStudy(uuid).then((study) => {
      if (study) {
        this.router.navigate(['/study', study?.uuid]);
      }
    });
    this.messageService.add({
      severity: 'success',
      summary: $localize`Successful`,
      detail: $localize`Study Duplicated`,
      life: 3000
    });
  }

  createOrUpdateSection(section: Section) {
    if (!this.study) {
      return;
    }
    const existingSection = this.study?.sections.find(
      (s) => s?.uuid === section?.uuid
    );
    if (existingSection) {
      this.study.sections = this.study.sections.map((s) =>
        s?.uuid === section?.uuid ? section : s
      );
      this.studiesService.updateStudy(this.study);
      this.messageService.add({
        severity: 'success',
        summary: $localize`Successful`,
        detail: $localize`Section Updated`,
        life: 3000
      });
    } else {
      this.study.sections = [...this.study.sections, section];
      this.studiesService.updateStudy(this.study);
      this.messageService.add({
        severity: 'success',
        summary: $localize`Successful`,
        detail: $localize`Section Created`,
        life: 3000
      });
    }
  }

  deleteSection(section: Section) {
    if (!this.study) {
      return;
    }
    this.study.sections = this.study.sections.filter(
      (s) => s?.uuid !== section?.uuid
    );
    this.studiesService.updateStudy(this.study);
  }

  duplicateSection(section: Section) {
    if (!this.study) {
      return;
    }
    this.study.sections = [
      ...this.study.sections,
      { ...section, uuid: uuidv4() }
    ];
    this.studiesService.updateStudy(this.study);
  }

  addInitialCondition({
    section,
    initialCondition
  }: {
    section: Section;
    initialCondition: InitialCondition;
  }) {
    if (!this.study) {
      return;
    }
    this.study.sections = this.study.sections.map((s) =>
      s?.uuid === section?.uuid
        ? {
            ...s,
            initial_conditions: [
              ...(s.initial_conditions || []),
              initialCondition
            ]
          }
        : s
    );
    this.studiesService.updateStudy(this.study);
  }

  deleteInitialCondition({
    section,
    initialCondition
  }: {
    section: Section;
    initialCondition: InitialCondition;
  }) {
    if (!this.study) {
      return;
    }
    this.study.sections = this.study.sections.map((s) =>
      s?.uuid === section?.uuid
        ? {
            ...s,
            initial_conditions: s.initial_conditions?.filter(
              (ic) => ic?.uuid !== initialCondition?.uuid
            )
          }
        : s
    );
    this.studiesService.updateStudy(this.study);
  }
}
