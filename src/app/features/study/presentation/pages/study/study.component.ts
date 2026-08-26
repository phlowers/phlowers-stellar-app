import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, from, switchMap } from 'rxjs';
import { StudyHeaderComponent } from '@features/study/presentation/components/study-header/study-header.component';
import { StudiesService } from '@services/studies/studies.service';
import { SectionService } from '@services/section/section.service';
import {
  DuplicateInitialConditionFunctionsInput,
  InitialConditionFunctionsInput,
  InitialConditionService
} from '@services/initial-condition/initial-condition.service';
import { Section, Study } from '@shared/domain';
import { TabsModule } from 'primeng/tabs';
import { AccordionModule } from 'primeng/accordion';
import { RadioButtonModule } from 'primeng/radiobutton';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { StepperModule } from 'primeng/stepper';
import { InputTextModule } from 'primeng/inputtext';
import { SectionsTabComponent } from '@features/study/presentation/components/sections-tab/sectionsTab.component';
import { NotificationService } from '@services/notification/notification.service';
import { NewStudyModalComponent } from '@shared/components/new-study-modal/new-study-modal.component';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

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
    NewStudyModalComponent,
    TranslocoModule
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
  private readonly notificationService = inject(NotificationService);
  private readonly transloco = inject(TranslocoService);

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
            sections: study.sections.toSorted((a, b) => -a.created_at.localeCompare(b.created_at))
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
              sections: study.sections.toSorted((a, b) => -a.created_at.localeCompare(b.created_at))
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

  duplicateStudy(uuid: string): Promise<void> {
    return this.studiesService
      .duplicateStudy(uuid)
      .then((study) => {
        if (study) {
          this.router.navigate(['/study', study.uuid]);
          this.notificationService.success(this.transloco.translate('study.notifications.duplicated'));
        }
      })
      .catch(() => {
        this.notificationService.error(this.transloco.translate('study.notifications.duplication-failed'));
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

    const { removedGeometryBoundObjects } = await this.sectionService.createOrUpdateSection(studyWithSections, section);

    this.notificationService.success(
      existingSection
        ? this.transloco.translate('study.notifications.section-updated')
        : this.transloco.translate('study.notifications.section-created')
    );

    if (removedGeometryBoundObjects) {
      this.notificationService.warning(this.transloco.translate('study.notifications.geometry-objects-updated'));
    }
  }

  async deleteSection(section: Section) {
    const study = this.study();
    if (!study) {
      return;
    }

    await this.sectionService.deleteSection(study, section);

    this.notificationService.success(this.transloco.translate('study.notifications.section-deleted'));
  }

  async duplicateSection(section: Section) {
    const study = this.study();
    if (!study) {
      return;
    }

    await this.sectionService.duplicateSection(study, section);

    this.notificationService.success(this.transloco.translate('study.notifications.section-duplicated'));
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
    const updatedSection = study.sections.find((s) => s?.uuid === section?.uuid);
    if (!updatedSection) {
      return;
    }
    await this.initialConditionService.setInitialCondition(study, updatedSection, initialCondition.uuid);

    this.notificationService.success(this.transloco.translate('study.notifications.ic-updated'));
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
    const addedSection = study.sections.find((s) => s?.uuid === section?.uuid);
    if (!addedSection) {
      return;
    }
    await this.initialConditionService.setInitialCondition(study, addedSection, initialCondition.uuid);

    this.notificationService.success(this.transloco.translate('study.notifications.ic-added'));
  }

  async deleteInitialCondition({ section, initialCondition }: InitialConditionFunctionsInput) {
    const study = this.study();
    if (!study) {
      return;
    }

    await this.initialConditionService.deleteInitialCondition(study, section, initialCondition);

    this.notificationService.success(this.transloco.translate('study.notifications.ic-deleted'));
  }

  async duplicateInitialCondition({ section, initialCondition, newUuid }: DuplicateInitialConditionFunctionsInput) {
    const study = this.study();
    if (!study) {
      return;
    }

    await this.initialConditionService.duplicateInitialCondition(study, section, initialCondition, newUuid);
    await this.initialConditionService.setInitialCondition(study, section, newUuid);

    this.notificationService.success(this.transloco.translate('study.notifications.ic-duplicated'));
  }

  async setInitialCondition({ section, initialCondition }: InitialConditionFunctionsInput) {
    const study = this.study();
    if (!study) {
      return;
    }
    await this.initialConditionService.setInitialCondition(study, section, initialCondition.uuid);
  }
}
