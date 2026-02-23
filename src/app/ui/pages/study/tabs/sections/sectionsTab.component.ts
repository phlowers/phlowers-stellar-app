import { Component, computed, inject, input, output, signal, ViewChild } from '@angular/core';
import { Section, InitialCondition, Study } from '@core/domain';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { NewSectionModalComponent } from './newSectionModal/newSectionModal.component';
import { CardComponent } from '@ui/shared/components/atoms/card/card.component';
import { Popover, PopoverModule } from 'primeng/popover';
import { v4 as uuidv4 } from 'uuid';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { InitialConditionModalComponent } from './initialConditionModal/initialConditionModal.component';
import { DividerModule } from 'primeng/divider';
import {
  DuplicateInitialConditionFunctionsInput,
  InitialConditionFunctionsInput
} from '@services/initial-conditions/initial-condition.service';
import { CreateEditView } from '@ui/shared/types';
import { CheckboxModule } from 'primeng/checkbox';
import { createEmptySection } from '@services/sections/helpers';
import { RouterLink } from '@angular/router';
import { SelectWithButtonsComponent } from '@ui/shared/components/atoms/select-with-buttons/select-with-buttons.component';
import { cloneDeep } from 'lodash';
import { ChargesService } from '@services/charges/charges.service';
import { ToolbarDialogService } from '@ui/pages/studio/toolbar-dialog/toolbar-dialog.service';
import { ToolbarDialogComponent } from '@ui/pages/studio/toolbar-dialog/toolbar-dialog.component';
import { PlotService } from '@ui/pages/studio/services/plot.service';

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
  styleUrl: './sectionsTab.component.scss'
})
/** Component that renders the sections tab, listing study sections and their initial conditions. */
export class SectionsTabComponent {
  /** The study whose sections are displayed. */
  study = input<Study | null>(null);
  /** Emits a section to create or update. */
  createOrUpdateSection = output<Section>();
  /** Emits a section to delete. */
  deleteSection = output<Section>();
  /** Emits a section to duplicate. */
  duplicateSection = output<Section>();
  /** Emits when a new initial condition should be added. */
  addInitialCondition = output<InitialConditionFunctionsInput>();
  /** Emits when an initial condition should be updated. */
  updateInitialCondition = output<InitialConditionFunctionsInput>();
  /** Emits when an initial condition should be deleted. */
  deleteInitialCondition = output<InitialConditionFunctionsInput>();
  /** Emits when an initial condition should be duplicated. */
  duplicateInitialCondition = output<DuplicateInitialConditionFunctionsInput>();
  /** Emits when an initial condition should be selected as active. */
  setInitialCondition = output<InitialConditionFunctionsInput>();
  /** The section currently being created or edited. */
  currentSection = signal<Section>(createEmptySection());
  /** The initial condition currently being created or edited. */
  currentInitialCondition = signal<InitialCondition>(this.createInitialCondition(this.currentSection()));
  /** Whether the new/edit section modal is open. */
  isNewSectionModalOpen = signal<boolean>(false);
  /** Current mode of the section modal (create, edit, or view). */
  newSectionModalMode = signal<CreateEditView>('create');
  /** Whether the initial condition modal is open. */
  isInitialConditionModalOpen = signal<boolean>(false);
  /** Current mode of the initial condition modal. */
  initialConditionModalMode = signal<CreateEditView>('create');
  /** UUID of the currently selected section for charge operations. */
  selectedSection = signal<string>('');
  @ViewChild('popover') popover!: Popover;
  private readonly toolbarDialogService = inject(ToolbarDialogService);

  private readonly plotService = inject(PlotService);

  constructor(private readonly chargesService: ChargesService) {}

  /** Creates a new default initial condition for the given section. */
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

  /** Toggles the selection state of a section. */
  selectSection(section: Section, event: any) {
    this.selectedSection.set(event.checked ? section.uuid : '');
  }

  /** Opens the section modal in edit mode for the given section. */
  editSection(section: Section) {
    this.currentSection.set(cloneDeep(section));
    this.newSectionModalMode.set('edit');
    this.isNewSectionModalOpen.set(true);
  }

  /** Opens the section modal in view-only mode for the given section. */
  viewSection(section: Section) {
    this.currentSection.set(cloneDeep(section));
    this.newSectionModalMode.set('view');
    this.isNewSectionModalOpen.set(true);
  }

  /** Opens the section modal in create mode with a blank section. */
  openNewSectionModalCreate() {
    this.currentSection.set(createEmptySection());
    this.newSectionModalMode.set('create');
    this.isNewSectionModalOpen.set(true);
  }

  /** Handles section modal visibility changes. */
  onModalOpenChange(isOpen: boolean) {
    this.isNewSectionModalOpen.set(isOpen);
  }

  /** Opens the initial condition modal for a given section, condition, and mode. */
  openInitialConditionModal(section: Section, initialCondition: InitialCondition, mode: CreateEditView) {
    this.currentSection.set(section);
    this.currentInitialCondition.set(initialCondition);
    this.initialConditionModalMode.set(mode);
    this.isInitialConditionModalOpen.set(true);
  }

  /** Duplicates an initial condition from within the modal and switches to edit mode. */
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
    this.currentInitialCondition.set({ ...initialCondition, uuid: newUuid });
    this.initialConditionModalMode.set('edit');
  }

  /** Handles initial condition modal visibility changes. */
  onInitialConditionModalOpenChange(isOpen: boolean) {
    this.isInitialConditionModalOpen.set(isOpen);
  }

  /** Handles initial condition modal mode changes. */
  onInitialConditionModalChangeMode(mode: CreateEditView) {
    this.initialConditionModalMode.set(mode);
  }

  /** Computed signal returning the UUID of the selected initial condition for the selected section. */
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

  /** Emits a delete event for the given initial condition and section. */
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

  /** Opens the initial condition modal in view mode. */
  viewInitialConditionClick = ({
    initialCondition,
    section
  }: {
    initialCondition: InitialCondition;
    section: Section;
  }) => {
    this.openInitialConditionModal(section, initialCondition, 'view');
  };

  /** Opens the initial condition modal in edit mode. */
  editInitialConditionClick = ({
    initialCondition,
    section
  }: {
    initialCondition: InitialCondition;
    section: Section;
  }) => {
    this.openInitialConditionModal(section, initialCondition, 'edit');
  };

  /** Emits a duplicate event for the given initial condition and section. */
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

  /** Emits a set event to select the given initial condition on the section. */
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

  /** Returns initial conditions in reverse chronological order. */
  orderedInitialConditions = (initialConditions: InitialCondition[]) => {
    return cloneDeep(initialConditions).reverse();
  };

  /** Builds select options from the section's charge cases. */
  getChargesOptions(section: Section) {
    return (
      section.charges?.map((c) => ({
        label: c.name,
        value: c.uuid
      })) ?? []
    );
  }

  /** Sets the selected charge case for the given section. */
  selectChargeCase(charge: { label: string; value: string }, section: Section) {
    this.chargesService.setSelectedCharge(this.study()?.uuid ?? '', section.uuid, charge?.value ?? '');
  }

  /** Deletes a charge case from the given section. */
  deleteChargeCase(charge: { label: string; value: string }, section: Section) {
    this.chargesService.deleteCharge(this.study()?.uuid ?? '', section.uuid, charge?.value ?? '');
  }

  /** Duplicates a charge case within the given section. */
  duplicateChargeCase(charge: { label: string; value: string }, section: Section) {
    this.chargesService.duplicateCharge(this.study()?.uuid ?? '', section.uuid, charge?.value ?? '');
  }

  /** Opens the charge case load table in the specified view or edit mode. */
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
