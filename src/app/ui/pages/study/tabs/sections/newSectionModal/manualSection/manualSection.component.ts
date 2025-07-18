import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { StepperModule } from 'primeng/stepper';
import { TabsModule } from 'primeng/tabs';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { Section } from '@src/app/core/data/database/interfaces/section';
import { DropdownModule } from 'primeng/dropdown';
import { SupportsTableComponent } from './supportsTable/supportsTable.component';

@Component({
  selector: 'app-manual-section',
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
    SupportsTableComponent
  ],
  templateUrl: './manualSection.component.html',
  styleUrl: './manualSection.component.scss'
})
export class ManualSectionComponent {
  isOpen = input<boolean>(false);
  isOpenChange = output<boolean>();
  source = 'manual';
  sectionName = signal<string>('');
  section: Section = {
    name: '',
    type: '',
    cables_amount: 0,
    cable_name: '',
    gmr: '',
    eel: '',
    cm: ''
  };
  supportsAmount = 0;
  sectionTypes = [
    { name: 'Guard', code: 'guard' },
    { name: 'Phase', code: 'phase' }
  ];

  onVisibleChange(visible: boolean) {
    if (!visible) {
      this.isOpenChange.emit(false);
    }
  }
}
