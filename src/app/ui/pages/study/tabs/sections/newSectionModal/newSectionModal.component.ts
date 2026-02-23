import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { StepperModule } from 'primeng/stepper';
import { TabsModule } from 'primeng/tabs';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { SelectModule } from 'primeng/select';
import { ManualSectionComponent } from './manualSection/manualSection.component';
import { CommonModule } from '@angular/common';
import { Section, Study } from '@core/domain';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { isNil } from 'lodash';
import { SectionService } from '@services/sections/section.service';

const areAllRequiredFieldsFilled = (section: Section) => {
  const nameCondition = !!section.name.trim();
  const typeCondition = !!section.type;
  const cablesAmountCondition = !!section.cables_amount;
  const cableNameCondition = !!section.cable_name;
  const supportsNumberCondition = !!section.supports.every((support) => !isNil(support.number));
  const supportsSpanLengthCondition = !!section.supports.every(
    (support, index) => !isNil(support.spanLength) || index === section.supports.length - 1
  );
  const supportsSpanAngleCondition = !!section.supports.every((support) => !isNil(support.spanAngle));
  const supportsChainLengthCondition = !!section.supports.every((support) => !isNil(support.chainLength));
  const supportsAttachmentHeightCondition = !!section.supports.every((support) => !isNil(support.attachmentHeight));
  return (
    nameCondition &&
    typeCondition &&
    cablesAmountCondition &&
    cableNameCondition &&
    supportsNumberCondition &&
    supportsSpanLengthCondition &&
    supportsSpanAngleCondition &&
    supportsChainLengthCondition &&
    supportsAttachmentHeightCondition
  );
};

@Component({
  selector: 'app-new-section-modal',
  imports: [
    TabsModule,
    AccordionModule,
    RadioButtonModule,
    FormsModule,
    ButtonModule,
    StepperModule,
    InputTextModule,
    DialogModule,
    DividerModule,
    SelectModule,
    ManualSectionComponent,
    CommonModule,
    IconComponent,
    ButtonComponent
  ],
  templateUrl: './newSectionModal.component.html',
  styleUrl: './newSectionModal.component.scss'
})
/** Modal component for creating, editing, or viewing a study section. */
export class NewSectionModalComponent {
  /** Whether the modal is currently visible. */
  isOpen = input<boolean>(false);
  /** Emits when the modal open state changes. */
  isOpenChange = output<boolean>();
  /** Emits the section after duplication. */
  setSection = output<Section>();
  /** Data source type for section creation (e.g. 'manual'). */
  source = 'manual';
  /** The section being created or edited. */
  section = input.required<Section>();
  /** The parent study of the section. */
  study = input.required<Study | null>();
  /** Emits when the section data changes. */
  sectionChange = output<Section>();
  /** Emits the section to be saved on validation. */
  outputSection = output<Section>();
  /** Current modal mode: create, edit, or view. */
  mode = input.required<'create' | 'edit' | 'view'>();
  /** Emits when the modal mode changes. */
  setMode = output<'create' | 'edit' | 'view'>();

  /** Whether all required section fields are filled. */
  areAllRequiredFieldsFilled = signal<boolean>(false);
  /** Whether the section name is unique within the study. */
  isNameUnique = signal<boolean>(false);

  /** Computed header title reflecting the current modal mode. */
  headerTitle = computed(() => {
    if (this.mode() === 'view') {
      return $localize`View a study section`;
    } else if (this.mode() === 'edit') {
      return $localize`Modify a study section`;
    }
    return $localize`Create a study section`;
  });

  constructor(private readonly sectionService: SectionService) {
    effect(() => {
      if (this.isOpen()) {
        this.checkFields();
      }
    });
  }

  /** Validates that all required fields are filled and the name is unique. */
  checkFields() {
    this.areAllRequiredFieldsFilled.set(areAllRequiredFieldsFilled(this.section()));
    const isNameUnique = !this.study()?.sections.find(
      (s) => s.name === this.section().name && s.uuid !== this.section().uuid
    );
    this.isNameUnique.set(isNameUnique);
  }

  /** Handles dialog visibility changes, closing the modal when hidden. */
  onVisibleChange(visible: boolean) {
    if (!visible) {
      this.isOpenChange.emit(false);
    }
  }

  /** Propagates section changes and re-checks field validity. */
  onSectionChange(event: Section) {
    this.sectionChange.emit(event);
    this.checkFields();
  }

  /** Emits the current section and closes the modal on validation. */
  onValidate() {
    this.outputSection.emit(this.section());
    this.isOpenChange.emit(false);
  }

  /** Duplicates the current section and emits the new copy. */
  async onDuplicateSection() {
    const newSection = await this.sectionService.duplicateSection(this.study()!, this.section());
    this.setSection.emit(newSection);
  }

  /** Switches the modal to edit mode and re-checks fields. */
  onEditSection() {
    this.setMode.emit('edit');
    this.checkFields();
  }

  /** Deletes the current section and closes the modal. */
  onDeleteSection() {
    this.sectionService.deleteSection(this.study()!, this.section());
    this.isOpenChange.emit(false);
  }
}
