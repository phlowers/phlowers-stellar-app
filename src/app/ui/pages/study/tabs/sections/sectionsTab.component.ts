import { Component, input, output, signal } from '@angular/core';
import { Section } from '@src/app/core/data/database/interfaces/section';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '@src/app/ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@src/app/ui/shared/components/atoms/icon/icon.component';
import { NewSectionModalComponent } from './newSectionModal/newSectionModal.component';
import { CardComponent } from '@src/app/ui/shared/components/atoms/card/card.component';
import { PopoverModule } from 'primeng/popover';
import { v4 as uuidv4 } from 'uuid';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { InitialConditionModalComponent } from './initialConditionModal/initialConditionModal.component';
import { InitialCondition } from '@src/app/core/data/database/interfaces/initialCondition';
import { DividerModule } from 'primeng/divider';
import { InitialConditionFunctionsInput } from '@src/app/core/services/initial-conditions/initial-condition.service';
import { CreateEditView } from '@src/app/ui/shared/types';

const createSection = (): Section => {
  return {
    uuid: uuidv4(),
    name: '',
    type: 'phase',
    cables_amount: undefined,
    cable_name: '',
    gmr: '',
    eel: '',
    cm: '',
    supports: [],
    internal_id: '',
    short_name: '',
    created_at: '',
    updated_at: '',
    internal_catalog_id: '',
    cable_short_name: '',
    optical_fibers_amount: 0,
    spans_amount: 0,
    begin_span_name: '',
    last_span_name: '',
    first_support_number: 0,
    last_support_number: 0,
    first_attachment_set: '',
    last_attachment_set: '',
    regional_maintenance_center_names: [],
    maintenance_center_names: [],
    link_name: '',
    lit: '',
    branch_name: '',
    electric_tension_level: '',
    updatedAt: new Date(),
    initial_conditions: []
  };
};

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
    DividerModule
  ],
  templateUrl: './sectionsTab.component.html',
  styleUrl: './sectionsTab.component.scss'
})
export class SectionsTabComponent {
  sections = input<Section[]>([]);
  createOrUpdateSection = output<Section>();
  deleteSection = output<Section>();
  duplicateSection = output<Section>();
  addInitialCondition = output<InitialConditionFunctionsInput>();
  updateInitialCondition = output<InitialConditionFunctionsInput>();
  deleteInitialCondition = output<InitialConditionFunctionsInput>();
  duplicateInitialCondition = output<InitialConditionFunctionsInput>();
  currentSection = signal<Section>(createSection());
  currentInitialCondition = signal<InitialCondition>(
    this.createInitialCondition()
  );
  isNewSectionModalOpen = signal<boolean>(false);
  newSectionModalMode = signal<CreateEditView>('create');
  isInitialConditionModalOpen = signal<boolean>(false);
  initialConditionModalMode = signal<CreateEditView>('create');

  createInitialCondition(): InitialCondition {
    return {
      uuid: uuidv4(),
      name: '',
      base_parameters: '',
      base_temperature: 0
    };
  }

  editSection(section: Section) {
    this.currentSection.set(section);
    this.newSectionModalMode.set('edit');
    this.isNewSectionModalOpen.set(true);
  }

  viewSection(section: Section) {
    this.currentSection.set(section);
    this.newSectionModalMode.set('view');
    this.isNewSectionModalOpen.set(true);
  }

  openNewSectionModalCreate() {
    this.currentSection.set(createSection());
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

  onInitialConditionModalOpenChange(isOpen: boolean) {
    this.isInitialConditionModalOpen.set(isOpen);
  }
}
