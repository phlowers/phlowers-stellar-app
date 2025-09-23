import { Component, input, output, signal, ViewChild } from '@angular/core';
import { Section } from '@src/app/core/data/database/interfaces/section';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '@src/app/ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@src/app/ui/shared/components/atoms/icon/icon.component';
import { NewSectionModalComponent } from './newSectionModal/newSectionModal.component';
import { CardComponent } from '@src/app/ui/shared/components/atoms/card/card.component';
import { PopoverModule } from 'primeng/popover';
import { v4 as uuidv4 } from 'uuid';
import { Select, SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { InitialConditionModalComponent } from './initialConditionModal/initialConditionModal.component';
import { InitialCondition } from '@src/app/core/data/database/interfaces/initialCondition';
import { DividerModule } from 'primeng/divider';
import { InitialConditionFunctionsInput } from '@src/app/core/services/initial-conditions/initial-condition.service';
import { CreateEditView } from '@src/app/ui/shared/types';
import { CheckboxModule } from 'primeng/checkbox';
import { createEmptySection } from '@src/app/core/services/sections/helpers';

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
    CheckboxModule
  ],
  templateUrl: './sectionsTab.component.html',
  styleUrl: './sectionsTab.component.scss'
})
export class SectionsTabComponent {
  @ViewChild('initialConditionSelect') selectComponent!: Select;
  selectedInitialCondition = null;

  sections = input<Section[]>([]);
  createOrUpdateSection = output<Section>();
  deleteSection = output<Section>();
  duplicateSection = output<Section>();
  addInitialCondition = output<InitialConditionFunctionsInput>();
  updateInitialCondition = output<InitialConditionFunctionsInput>();
  deleteInitialCondition = output<InitialConditionFunctionsInput>();
  duplicateInitialCondition = output<InitialConditionFunctionsInput>();
  currentSection = signal<Section>(createEmptySection());
  currentInitialCondition = signal<InitialCondition>(
    this.createInitialCondition(this.currentSection())
  );
  isNewSectionModalOpen = signal<boolean>(false);
  newSectionModalMode = signal<CreateEditView>('create');
  isInitialConditionModalOpen = signal<boolean>(false);
  initialConditionModalMode = signal<CreateEditView>('create');
  selectedSection = signal<string>('');

  createInitialCondition(section: Section): InitialCondition {
    const currentInitialConditions = section.initial_conditions;
    return {
      uuid: uuidv4(),
      name:
        $localize`Initial Condition` +
        ' ' +
        (currentInitialConditions.length + 1),
      base_parameters: '',
      base_temperature: 0
    };
  }

  selectSection(section: Section) {
    console.log('section', section);
    this.selectedSection.set(section.uuid);
  }

  selectItem(item: any, event: Event) {
    event.stopPropagation();
    event.stopImmediatePropagation();

    this.selectedInitialCondition = item;

    this.selectComponent.hide();
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

  onInitialConditionModalOpenChange(isOpen: boolean) {
    this.isInitialConditionModalOpen.set(isOpen);
  }
}
