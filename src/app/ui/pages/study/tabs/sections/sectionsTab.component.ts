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

const createSection = (): Section => {
  return {
    uuid: uuidv4(),
    name: '',
    type: '',
    cables_amount: 0,
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
  addInitialCondition = output<{
    section: Section;
    initialCondition: InitialCondition;
  }>();
  deleteInitialCondition = output<{
    section: Section;
    initialCondition: InitialCondition;
  }>();
  currentSection = signal<Section>(createSection());
  isNewSectionModalOpen = signal<boolean>(false);
  isInitialConditionModalOpen = signal<boolean>(false);

  editSection(section: Section) {
    this.currentSection.set(section);
    this.isNewSectionModalOpen.set(true);
  }

  openNewSectionModal() {
    this.currentSection.set(createSection());
    this.isNewSectionModalOpen.set(true);
  }

  onModalOpenChange(isOpen: boolean) {
    this.isNewSectionModalOpen.set(isOpen);
  }

  openInitialConditionModal(section: Section) {
    this.currentSection.set(section);
    this.isInitialConditionModalOpen.set(true);
  }

  onInitialConditionModalOpenChange(isOpen: boolean) {
    this.isInitialConditionModalOpen.set(isOpen);
  }
}
