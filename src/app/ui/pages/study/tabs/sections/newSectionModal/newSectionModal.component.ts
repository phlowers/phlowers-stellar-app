import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { StepperModule } from 'primeng/stepper';
import { TabsModule } from 'primeng/tabs';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { DropdownModule } from 'primeng/dropdown';
import { ManualSectionComponent } from './manualSection/manualSection.component';
import { CommonModule } from '@angular/common';
import { Section } from '@src/app/core/data/database/interfaces/section';

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
    DropdownModule,
    ManualSectionComponent,
    CommonModule
  ],
  templateUrl: './newSectionModal.component.html',
  styleUrl: './newSectionModal.component.scss'
})
export class NewSectionModalComponent {
  isOpen = input<boolean>(false);
  isOpenChange = output<boolean>();
  source = 'manual';
  section = input.required<Section>();
  sectionChange = output<Section>();
  outputSection = output<Section>();

  onVisibleChange(visible: boolean) {
    if (!visible) {
      this.isOpenChange.emit(false);
    }
  }

  onSectionChange(event: any) {
    this.sectionChange.emit(event);
  }

  onValidate() {
    this.outputSection.emit(this.section());
    this.isOpenChange.emit(false);
  }
}
