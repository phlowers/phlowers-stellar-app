import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, from, switchMap } from 'rxjs';
import { StudyHeaderComponent } from '@features/study/presentation/components/study-header/study-header.component';
import { StudiesService } from '@features/studies/infrastructure/services/studies.service';
import { SectionService } from '@features/study/infrastructure/services/section.service';
import {
  DuplicateInitialConditionFunctionsInput,
  InitialConditionFunctionsInput,
  InitialConditionService
} from '@features/study/infrastructure/services/initial-condition.service';
import { Section, Study } from '@shared/domain';
import { TabsModule } from 'primeng/tabs';
import { AccordionModule } from 'primeng/accordion';
import { RadioButtonModule } from 'primeng/radiobutton';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { StepperModule } from 'primeng/stepper';
import { InputTextModule } from 'primeng/inputtext';
import { SectionsTabComponent } from '@features/study/presentation/components/sections-tab/sectionsTab.component';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { NewStudyModalComponent } from '@features/studies/presentation/components/new-study-modal/new-study-modal.component';
import { CommonModule } from '@angular/common';

/**
 * Study detail page component.
 *
 * Manages the lifecycle of a single study including loading, editing,
 * section CRUD, and initial condition management.
 */
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
  styleUrl: './study.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudyComponent implements OnInit {
  readonly study = signal<Study | null>(null);
  isNewStudyModalOpen = signal<boolean>(false);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly studiesService = inject(StudiesService);
  private readonly sectionService = inject(SectionService);
  private readonly initialConditionService = inject(InitialConditionService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  ngOnInit(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (!uuid) {
      this.router.navigate(['/studies']);
      return;
    }

    this.studiesService.ready
      .pipe(
        filter((ready) => ready),
        switchMap(() => from(this.studiesService.getStudyAsObservable(uuid))),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((study: Study | undefined) => {
        if (study) {
          this.study.set({
            ...study,
            sections: study.sections.sort((a, b) => -a.created_at.localeCompare(b.created_at))
          });
        } else {
          this.router.navigate(['/studies']);
        }
      });

    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const paramUuid = params['uuid'];
      if (paramUuid && this.studiesService.ready.value) {
        this.refreshStudy(paramUuid);
      }
    });
  }

  refreshStudy(uuid: string) {
    if (uuid && this.studiesService.ready.value) {
      from(this.studiesService.getStudyAsObservable(uuid))
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((study: Study | undefined) => {
          if (study) {
            this.study.set({
              ...study,
              sections: study.sections.sort((a, b) => -a.created_at.localeCompare(b.created_at))
            });
          } else {
            this.router.navigate(['/studies']);
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
    const study = this.study();
    if (!study) {
      return;
    }

    // Initialize sections array if it's null
    const studyWithSections = study.sections ? study : { ...study, sections: [] };

    const existingSection = studyWithSections.sections.find((s) => s?.uuid === section?.uuid);

    await this.sectionService.createOrUpdateSection(studyWithSections, section);

    this.messageService.add({
      severity: 'success',
      summary: $localize`Successful`,
      detail: existingSection ? $localize`Section Updated` : $localize`Section Created`,
      life: 3000
    });
  }

  async deleteSection(section: Section) {
    const study = this.study();
    if (!study) {
      return;
    }

    await this.sectionService.deleteSection(study, section);

    this.messageService.add({
      severity: 'success',
      summary: $localize`Successful`,
      detail: $localize`Section Deleted`,
      life: 3000
    });
  }

  async duplicateSection(section: Section) {
    const study = this.study();
    if (!study) {
      return;
    }

    await this.sectionService.duplicateSection(study, section);

    this.messageService.add({
      severity: 'success',
      summary: $localize`Successful`,
      detail: $localize`Section Duplicated`,
      life: 3000
    });
  }

  async updateInitialCondition({ section, initialCondition }: InitialConditionFunctionsInput) {
    const currentStudy = this.study();
    if (!currentStudy) {
      return;
    }

    await this.initialConditionService.updateInitialCondition(currentStudy, section, initialCondition);
    const study = await this.studiesService.getStudy(currentStudy.uuid);
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

  async addInitialCondition({ section, initialCondition }: InitialConditionFunctionsInput) {
    const currentStudy = this.study();
    if (!currentStudy) {
      return;
    }
    await this.initialConditionService.addInitialCondition(currentStudy, section, initialCondition);
    const study = await this.studiesService.getStudy(currentStudy.uuid);
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

  async deleteInitialCondition({ section, initialCondition }: InitialConditionFunctionsInput) {
    const study = this.study();
    if (!study) {
      return;
    }

    await this.initialConditionService.deleteInitialCondition(study, section, initialCondition);

    this.messageService.add({
      severity: 'success',
      summary: $localize`Successful`,
      detail: $localize`Initial Condition Deleted`,
      life: 3000
    });
  }

  async duplicateInitialCondition({ section, initialCondition, newUuid }: DuplicateInitialConditionFunctionsInput) {
    const study = this.study();
    if (!study) {
      return;
    }

    await this.initialConditionService.duplicateInitialCondition(study, section, initialCondition, newUuid);
    await this.initialConditionService.setInitialCondition(study, section, newUuid);

    this.messageService.add({
      severity: 'success',
      summary: $localize`Successful`,
      detail: $localize`Initial Condition Duplicated`,
      life: 3000
    });
  }

  async setInitialCondition({ section, initialCondition }: InitialConditionFunctionsInput) {
    const study = this.study();
    if (!study) {
      return;
    }
    await this.initialConditionService.setInitialCondition(study, section, initialCondition.uuid);
  }
}
