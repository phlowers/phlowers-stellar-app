import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { Section, InitialCondition, Study } from '@shared/domain';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { NewSectionModalComponent } from './newSectionModal/newSectionModal.component';
import { CardComponent } from '@shared/components/atoms/card/card.component';
import { Popover, PopoverModule } from 'primeng/popover';
import { v4 as uuidv4 } from 'uuid';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { InitialConditionModalComponent } from '@shared/components/initial-condition-modal/initialConditionModal.component';
import { DividerModule } from 'primeng/divider';
import {
  DuplicateInitialConditionFunctionsInput,
  InitialConditionFunctionsInput
} from '@services/initial-condition/initial-condition.service';
import { CreateEditView } from '@shared/types';
import { CheckboxModule } from 'primeng/checkbox';
import { createEmptySection } from '@shared/domain/helpers/sections.helpers';
import { RouterLink } from '@angular/router';
import { SelectWithButtonsComponent } from '@shared/components/atoms/select-with-buttons/select-with-buttons.component';
import { cloneDeep } from 'lodash';
import { ChargesService } from '@services/charges/charges.service';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';
import { ToolbarDialogComponent } from '@features/studio/toolbar/presentation/components/toolbar-dialog/toolbar-dialog.component';
import { PlotService } from '@services/plot/plot.service';
import { CheckboxChangeEvent } from 'primeng/checkbox';

/**
 * Tab component displaying all sections and initial conditions of a study.
 *
 * Provides section CRUD, initial condition management, charge case operations,
 * and integrates with the studio toolbar dialog for load table editing.
 */
@Component({
  selector: 'app-sections-tab',
  imports: [
    CommonModule,
    ButtonComponent,
    IconComponent,
    NewSectionModalComponent,
    CardComponent,
    PopoverModule,
    SelectModule,
    FormsModule,
    InitialConditionModalComponent,
    DividerModule,
    CheckboxModule,
    RouterLink,
    SelectWithButtonsComponent,
    ToolbarDialogComponent
  ],
  templateUrl: './sectionsTab.component.html',
  styleUrl: './sectionsTab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionsTabComponent {
  /** The study whose sections are displayed. */
  study = input<Study | null>(null);
  /** Emits a section to create or update. */
  createOrUpdateSection = output<Section>();
  /** Emits a section to delete. */
  deleteSection = output<Section>();
  /** Emits a section to duplicate. */
  duplicateSection = output<Section>();
  /** Emits an initial condition to add to a section. */
  addInitialCondition = output<InitialConditionFunctionsInput>();
  /** Emits an initial condition to update. */
  updateInitialCondition = output<InitialConditionFunctionsInput>();
  /** Emits an initial condition to delete. */
  deleteInitialCondition = output<InitialConditionFunctionsInput>();
  /** Emits an initial condition to duplicate. */
  duplicateInitialCondition = output<DuplicateInitialConditionFunctionsInput>();
  /** Emits an initial condition to set as active. */
  setInitialCondition = output<InitialConditionFunctionsInput>();
  currentSection = signal<Section>(createEmptySection());
  currentInitialCondition = signal<InitialCondition>(this.createInitialCondition(this.currentSection()));
  isNewSectionModalOpen = signal<boolean>(false);
  newSectionModalMode = signal<CreateEditView>('create');
  isInitialConditionModalOpen = signal<boolean>(false);
  initialConditionModalMode = signal<CreateEditView>('create');
  selectedSection = signal<string>('');
  readonly popover = viewChild<Popover>('popover');
  private readonly toolbarDialogService = inject(ToolbarDialogService);

  private readonly plotService = inject(PlotService);
  private readonly chargesService = inject(ChargesService);

  createInitialCondition(section: Section): InitialCondition {
    const currentInitialConditions = section.initial_conditions;
    return {
      uuid: uuidv4(),
      name: $localize`IC` + ' ' + (currentInitialConditions.length + 1),
      base_parameters: null,
      base_temperature: 15,
      cable_pretension: 0,
      min_temperature: 0,
      max_wind_pressure: 0,
      max_frost_width: 0
    };
  }

  selectSection(section: Section, event: CheckboxChangeEvent | { checked: boolean }) {
    this.selectedSection.set(event.checked ? section.uuid : '');
  }

  editSection(section: Section) {
    this.currentSection.set(cloneDeep(section));
    this.newSectionModalMode.set('edit');
    this.isNewSectionModalOpen.set(true);
  }

  viewSection(section: Section) {
    this.currentSection.set(cloneDeep(section));
    this.newSectionModalMode.set('view');
    this.isNewSectionModalOpen.set(true);
  }

  openNewSectionModalCreate() {
    this.currentSection.set(createEmptySection());
    this.newSectionModalMode.set('create');
    this.isNewSectionModalOpen.set(true);
  }

  onModalOpenChange(isOpen: boolean) {
    this.isNewSectionModalOpen.set(isOpen);
  }

  openInitialConditionModal(section: Section, initialCondition: InitialCondition, mode: CreateEditView) {
    this.currentSection.set(section);
    this.currentInitialCondition.set(initialCondition);
    this.initialConditionModalMode.set(mode);
    this.isInitialConditionModalOpen.set(true);
  }

  async duplicateInitialConditionFromModal({
    initialCondition,
    newUuid
  }: {
    initialCondition: InitialCondition;
    newUuid: string;
  }) {
    await this.duplicateInitialCondition.emit({
      section: this.currentSection(),
      initialCondition: initialCondition,
      newUuid
    });
    this.currentInitialCondition.set(initialCondition);
    this.initialConditionModalMode.set('edit');
  }

  onInitialConditionModalOpenChange(isOpen: boolean) {
    this.isInitialConditionModalOpen.set(isOpen);
  }

  onInitialConditionModalChangeMode(mode: CreateEditView) {
    this.initialConditionModalMode.set(mode);
  }

  getSelectedInitialConditionUuid = computed(() => {
    const section = this.study()?.sections.find((s) => s.uuid === this.selectedSection());
    const selectedInitialConditionUuid = section?.selected_initial_condition_uuid;
    if (
      selectedInitialConditionUuid &&
      section?.initial_conditions.map((ic) => ic.uuid).includes(selectedInitialConditionUuid)
    ) {
      return selectedInitialConditionUuid;
    }
    return undefined;
  });

  deleteInitialConditionClick = ({
    initialCondition,
    section
  }: {
    initialCondition: InitialCondition;
    section: Section;
  }) => {
    return this.deleteInitialCondition.emit({
      section,
      initialCondition
    });
  };

  viewInitialConditionClick = ({
    initialCondition,
    section
  }: {
    initialCondition: InitialCondition;
    section: Section;
  }) => {
    this.openInitialConditionModal(section, initialCondition, 'view');
  };

  editInitialConditionClick = ({
    initialCondition,
    section
  }: {
    initialCondition: InitialCondition;
    section: Section;
  }) => {
    this.openInitialConditionModal(section, initialCondition, 'edit');
  };

  duplicateInitialConditionClick = ({
    initialCondition,
    section
  }: {
    initialCondition: InitialCondition;
    section: Section;
  }) => {
    const newUuid = uuidv4();
    return this.duplicateInitialCondition.emit({
      section,
      initialCondition,
      newUuid
    });
  };

  selectInitialConditionClick = ({
    initialCondition,
    section
  }: {
    initialCondition: InitialCondition;
    section: Section;
  }) => {
    this.setInitialCondition.emit({
      section: section,
      initialCondition: initialCondition
    });
  };

  orderedInitialConditions = (initialConditions: InitialCondition[]) => {
    return cloneDeep(initialConditions).reverse();
  };

  getChargesOptions(section: Section) {
    return (
      section.charges?.map((c) => ({
        label: c.name,
        value: c.uuid
      })) ?? []
    );
  }

  selectChargeCase(charge: { label: string; value: string }, section: Section) {
    this.chargesService.setSelectedCharge(this.study()?.uuid ?? '', section.uuid, charge?.value ?? '');
  }

  deleteChargeCase(charge: { label: string; value: string }, section: Section) {
    this.chargesService.deleteCharge(this.study()?.uuid ?? '', section.uuid, charge?.value ?? '');
  }

  duplicateChargeCase(charge: { label: string; value: string }, section: Section) {
    this.chargesService.duplicateCharge(this.study()?.uuid ?? '', section.uuid, charge?.value ?? '');
  }

  viewOrEditChargeCase(charge: { label: string; value: string }, mode: 'view' | 'edit', section: Section) {
    if (charge?.value) {
      this.plotService.study.set(this.study());
      this.plotService.section.set(section);
      this.toolbarDialogService.openTool('load-table', {
        mode,
        chargeUuid: charge.value
      });
    }
  }
}
