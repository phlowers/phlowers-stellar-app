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

  onVisibleChange(visible: boolean) {
    if (!visible) {
      this.isOpenChange.emit(false);
    }
  }
}
