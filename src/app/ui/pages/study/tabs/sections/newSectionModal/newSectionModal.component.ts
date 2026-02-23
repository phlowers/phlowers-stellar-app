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

/**
 * Checks whether all mandatory fields in a section are filled.
 * @param section - The section to validate
 * @returns `true` if all required fields have values
 */
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

/**
 * Modal dialog for creating, editing, or viewing a study section.
 *
 * Wraps the `ManualSectionComponent` and validates required fields
 * and section name uniqueness before allowing submission.
 */
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
export class NewSectionModalComponent {
  /** Whether the modal dialog is open. */
  isOpen = input<boolean>(false);
  /** Emits when the modal open state changes. */
  isOpenChange = output<boolean>();
  /** Emits the validated section on save. */
  setSection = output<Section>();
  source = 'manual';
  /** The section being created or edited. */
  section = input.required<Section>();
  /** The parent study. */
  study = input.required<Study | null>();
  sectionChange = output<Section>();
  outputSection = output<Section>();
  /** Current dialog mode: create, edit, or view. */
  mode = input.required<'create' | 'edit' | 'view'>();
  setMode = output<'create' | 'edit' | 'view'>();

  areAllRequiredFieldsFilled = signal<boolean>(false);
  isNameUnique = signal<boolean>(false);

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

  checkFields() {
    this.areAllRequiredFieldsFilled.set(areAllRequiredFieldsFilled(this.section()));
    const isNameUnique = !this.study()?.sections.find(
      (s) => s.name === this.section().name && s.uuid !== this.section().uuid
    );
    this.isNameUnique.set(isNameUnique);
  }

  onVisibleChange(visible: boolean) {
    if (!visible) {
      this.isOpenChange.emit(false);
    }
  }

  onSectionChange(event: Section) {
    this.sectionChange.emit(event);
    this.checkFields();
  }

  onValidate() {
    this.outputSection.emit(this.section());
    this.isOpenChange.emit(false);
  }

  async onDuplicateSection() {
    const newSection = await this.sectionService.duplicateSection(this.study()!, this.section());
    this.setSection.emit(newSection);
  }

  onEditSection() {
    this.setMode.emit('edit');
    this.checkFields();
  }

  onDeleteSection() {
    this.sectionService.deleteSection(this.study()!, this.section());
    this.isOpenChange.emit(false);
  }
}
