import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StudyHeaderComponent } from '@ui/pages/study/study-header/study-header.component';
import { StudiesService } from '@src/app/core/services/studies/studies.service';
import { SectionService } from '@src/app/core/services/sections/section.service';
import {
  DuplicateInitialConditionFunctionsInput,
  InitialConditionFunctionsInput,
  InitialConditionService
} from '@src/app/core/services/initial-conditions/initial-condition.service';
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
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { NewStudyModalComponent } from '../studies/components/new-study-modal/new-study-modal.component';
import { CommonModule } from '@angular/common';
import { Subscription } from 'dexie';

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
export class StudyComponent implements OnInit, OnDestroy {
  study: Study | null = null;
  isNewStudyModalOpen = signal<boolean>(false);
  subscription: Subscription | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly studiesService: StudiesService,
    private readonly sectionService: SectionService,
    private readonly initialConditionService: InitialConditionService,
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
        this.subscription = this.studiesService
          .getStudyAsObservable(uuid)
          .subscribe((study: Study | undefined) => {
            if (study) {
              study.sections = study.sections.sort(
                (a, b) => -a.created_at.localeCompare(b.created_at)
              );
              this.study = study;
            } else {
              this.router.navigate(['/studies']);
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

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
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

  async createOrUpdateSection(section: Section) {
    if (!this.study) {
      return;
    }

    // Initialize sections array if it's null
    if (!this.study.sections) {
      this.study.sections = [];
    }

    const existingSection = this.study.sections.find(
      (s) => s?.uuid === section?.uuid
    );

    await this.sectionService.createOrUpdateSection(this.study, section);

    this.messageService.add({
      severity: 'success',
      summary: $localize`Successful`,
      detail: existingSection
        ? $localize`Section Updated`
        : $localize`Section Created`,
      life: 3000
    });
  }

  async deleteSection(section: Section) {
    if (!this.study) {
      return;
    }

    await this.sectionService.deleteSection(this.study, section);

    this.messageService.add({
      severity: 'success',
      summary: $localize`Successful`,
      detail: $localize`Section Deleted`,
      life: 3000
    });
  }

  async duplicateSection(section: Section) {
    if (!this.study) {
      return;
    }

    await this.sectionService.duplicateSection(this.study, section);

    this.messageService.add({
      severity: 'success',
      summary: $localize`Successful`,
      detail: $localize`Section Duplicated`,
      life: 3000
    });
  }

  async updateInitialCondition({
    section,
    initialCondition
  }: InitialConditionFunctionsInput) {
    if (!this.study) {
      return;
    }

    await this.initialConditionService.updateInitialCondition(
      this.study,
      section,
      initialCondition
    );
    const study = await this.studiesService.getStudy(this.study?.uuid);
    if (!study) {
      return;
    }
    await this.initialConditionService.setInitialCondition(
      study,
      study.sections.find((s) => s?.uuid === section?.uuid)!,
      initialCondition.uuid
    );

    this.messageService.add({
      severity: 'success',
      summary: $localize`Successful`,
      detail: $localize`Initial Condition Updated`,
      life: 3000
    });
  }

  async addInitialCondition({
    section,
    initialCondition
  }: InitialConditionFunctionsInput) {
    if (!this.study) {
      return;
    }
    await this.initialConditionService.addInitialCondition(
      this.study,
      section,
      initialCondition
    );
    const study = await this.studiesService.getStudy(this.study?.uuid);
    if (!study) {
      return;
    }
    await this.initialConditionService.setInitialCondition(
      study,
      study.sections.find((s) => s?.uuid === section?.uuid)!,
      initialCondition.uuid
    );

    this.messageService.add({
      severity: 'success',
      summary: $localize`Successful`,
      detail: $localize`Initial Condition Added`,
      life: 3000
    });
  }

  async deleteInitialCondition({
    section,
    initialCondition
  }: InitialConditionFunctionsInput) {
    if (!this.study) {
      return;
    }

    await this.initialConditionService.deleteInitialCondition(
      this.study,
      section,
      initialCondition
    );

    this.messageService.add({
      severity: 'success',
      summary: $localize`Successful`,
      detail: $localize`Initial Condition Deleted`,
      life: 3000
    });
  }

  async duplicateInitialCondition({
    section,
    initialCondition,
    newUuid
  }: DuplicateInitialConditionFunctionsInput) {
    if (!this.study) {
      return;
    }

    await this.initialConditionService.duplicateInitialCondition(
      this.study,
      section,
      initialCondition,
      newUuid
    );
    await this.initialConditionService.setInitialCondition(
      this.study,
      section,
      newUuid
    );

    this.messageService.add({
      severity: 'success',
      summary: $localize`Successful`,
      detail: $localize`Initial Condition Duplicated`,
      life: 3000
    });
  }

  async setInitialCondition({
    section,
    initialCondition
  }: InitialConditionFunctionsInput) {
    if (!this.study) {
      return;
    }
    await this.initialConditionService.setInitialCondition(
      this.study,
      section,
      initialCondition.uuid
    );
  }
}
