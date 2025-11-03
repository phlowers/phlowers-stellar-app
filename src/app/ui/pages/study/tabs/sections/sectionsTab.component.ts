import {
  Component,
  computed,
  input,
  output,
  signal,
  ViewChild
} from '@angular/core';
import { Section } from '@src/app/core/data/database/interfaces/section';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '@src/app/ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@src/app/ui/shared/components/atoms/icon/icon.component';
import { NewSectionModalComponent } from './newSectionModal/newSectionModal.component';
import { CardComponent } from '@src/app/ui/shared/components/atoms/card/card.component';
import { Popover, PopoverModule } from 'primeng/popover';
import { v4 as uuidv4 } from 'uuid';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { InitialConditionModalComponent } from './initialConditionModal/initialConditionModal.component';
import { InitialCondition } from '@src/app/core/data/database/interfaces/initialCondition';
import { DividerModule } from 'primeng/divider';
import {
  DuplicateInitialConditionFunctionsInput,
  InitialConditionFunctionsInput
} from '@core/services/initial-conditions/initial-condition.service';
import { CreateEditView } from '@src/app/ui/shared/types';
import { CheckboxModule } from 'primeng/checkbox';
import { createEmptySection } from '@src/app/core/services/sections/helpers';
import { RouterLink } from '@angular/router';
import { Study } from '@src/app/core/data/database/interfaces/study';
import { SelectWithButtonsComponent } from '@ui/shared/components/atoms/select-with-buttons/select-with-buttons.component';
import { cloneDeep } from 'lodash';

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
    SelectWithButtonsComponent
  ],
  templateUrl: './sectionsTab.component.html',
  styleUrl: './sectionsTab.component.scss'
})
export class SectionsTabComponent {
  study = input<Study | null>(null);
  createOrUpdateSection = output<Section>();
  deleteSection = output<Section>();
  duplicateSection = output<Section>();
  addInitialCondition = output<InitialConditionFunctionsInput>();
  updateInitialCondition = output<InitialConditionFunctionsInput>();
  deleteInitialCondition = output<InitialConditionFunctionsInput>();
  duplicateInitialCondition = output<DuplicateInitialConditionFunctionsInput>();
  setInitialCondition = output<InitialConditionFunctionsInput>();
  currentSection = signal<Section>(createEmptySection());
  currentInitialCondition = signal<InitialCondition>(
    this.createInitialCondition(this.currentSection())
  );
  isNewSectionModalOpen = signal<boolean>(false);
  newSectionModalMode = signal<CreateEditView>('create');
  isInitialConditionModalOpen = signal<boolean>(false);
  initialConditionModalMode = signal<CreateEditView>('create');
  selectedSection = signal<string>('');
  @ViewChild('popover') popover!: Popover;

  createInitialCondition(section: Section): InitialCondition {
    const currentInitialConditions = section.initial_conditions;
    return {
      uuid: uuidv4(),
      name:
        $localize`Initial Condition` +
        ' ' +
        (currentInitialConditions.length + 1),
      base_parameters: 0,
      base_temperature: 0,
      cable_pretension: 0,
      min_temperature: 0,
      max_wind_pressure: 0,
      max_frost_width: 0
    };
  }

  selectSection(section: Section, event: any) {
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

  openInitialConditionModal(
    section: Section,
    initialCondition: InitialCondition,
    mode: CreateEditView
  ) {
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
    this.currentInitialCondition.set({ ...initialCondition, uuid: newUuid });
    this.initialConditionModalMode.set('edit');
  }

  onInitialConditionModalOpenChange(isOpen: boolean) {
    this.isInitialConditionModalOpen.set(isOpen);
  }

  onInitialConditionModalChangeMode(mode: CreateEditView) {
    this.initialConditionModalMode.set(mode);
  }

  getSelectedInitialConditionUuid = computed(() => {
    const section = this.study()?.sections.find(
      (s) => s.uuid === this.selectedSection()
    );
    const selectedInitialConditionUuid =
      section?.selected_initial_condition_uuid;
    if (
      selectedInitialConditionUuid &&
      section?.initial_conditions
        .map((ic) => ic.uuid)
        .includes(selectedInitialConditionUuid)
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
}
