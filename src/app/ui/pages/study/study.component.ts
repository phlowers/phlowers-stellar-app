import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StudyHeaderComponent } from '@ui/pages/study/study-header/study-header.component';
import { StudiesService } from '@services/studies/studies.service';
import { SectionService } from '@services/sections/section.service';
import {
  DuplicateInitialConditionFunctionsInput,
  InitialConditionFunctionsInput,
  InitialConditionService
} from '@services/initial-conditions/initial-condition.service';
import { Section, Study } from '@core/domain';
import { TabsModule } from 'primeng/tabs';
import { AccordionModule } from 'primeng/accordion';
import { RadioButtonModule } from 'primeng/radiobutton';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { StepperModule } from 'primeng/stepper';
import { InputTextModule } from 'primeng/inputtext';
import { SectionsTabComponent } from './tabs/sections/sectionsTab.component';
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
/** Component that displays and manages a single study, including its sections and initial conditions. */
export class StudyComponent implements OnInit, OnDestroy {
  /** The currently loaded study. */
  study: Study | null = null;
  /** Whether the modify-study modal is open. */
  isNewStudyModalOpen = signal<boolean>(false);
  /** Subscription to the study observable for cleanup on destroy. */
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
        this.refreshStudy(uuid);
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

  /** Fetches and subscribes to study updates by UUID, redirecting if not found. */
  refreshStudy(uuid: string) {
    if (uuid && this.studiesService.ready.value) {
      this.subscription = this.studiesService.getStudyAsObservable(uuid).subscribe((study: Study | undefined) => {
        if (study) {
          study.sections = study.sections.sort((a, b) => -a.created_at.localeCompare(b.created_at));
          this.study = study;
        } else {
          this.router.navigate(['/studies']);
        }
      });
    }
  }

  /** Opens the modal dialog to modify the current study. */
  openModifyStudyModal() {
    this.isNewStudyModalOpen.set(true);
  }

  /** Duplicates the study and navigates to the newly created copy. */
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

  /** Creates a new section or updates an existing one in the current study. */
  async createOrUpdateSection(section: Section) {
    if (!this.study) {
      return;
    }

    // Initialize sections array if it's null
    if (!this.study.sections) {
      this.study.sections = [];
    }

    const existingSection = this.study.sections.find((s) => s?.uuid === section?.uuid);

    await this.sectionService.createOrUpdateSection(this.study, section);

    this.messageService.add({
      severity: 'success',
      summary: $localize`Successful`,
      detail: existingSection ? $localize`Section Updated` : $localize`Section Created`,
      life: 3000
    });
  }

  /** Deletes a section from the current study. */
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

  /** Duplicates a section within the current study. */
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

  /** Updates an existing initial condition and re-selects it on the section. */
  async updateInitialCondition({ section, initialCondition }: InitialConditionFunctionsInput) {
    if (!this.study) {
      return;
    }

    await this.initialConditionService.updateInitialCondition(this.study, section, initialCondition);
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

  /** Adds a new initial condition to the given section. */
  async addInitialCondition({ section, initialCondition }: InitialConditionFunctionsInput) {
    if (!this.study) {
      return;
    }
    await this.initialConditionService.addInitialCondition(this.study, section, initialCondition);
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

  /** Deletes an initial condition from the given section. */
  async deleteInitialCondition({ section, initialCondition }: InitialConditionFunctionsInput) {
    if (!this.study) {
      return;
    }

    await this.initialConditionService.deleteInitialCondition(this.study, section, initialCondition);

    this.messageService.add({
      severity: 'success',
      summary: $localize`Successful`,
      detail: $localize`Initial Condition Deleted`,
      life: 3000
    });
  }

  /** Duplicates an initial condition and selects the new copy. */
  async duplicateInitialCondition({ section, initialCondition, newUuid }: DuplicateInitialConditionFunctionsInput) {
    if (!this.study) {
      return;
    }

    await this.initialConditionService.duplicateInitialCondition(this.study, section, initialCondition, newUuid);
    await this.initialConditionService.setInitialCondition(this.study, section, newUuid);

    this.messageService.add({
      severity: 'success',
      summary: $localize`Successful`,
      detail: $localize`Initial Condition Duplicated`,
      life: 3000
    });
  }

  /** Sets the active initial condition for the given section. */
  async setInitialCondition({ section, initialCondition }: InitialConditionFunctionsInput) {
    if (!this.study) {
      return;
    }
    await this.initialConditionService.setInitialCondition(this.study, section, initialCondition.uuid);
  }
}
