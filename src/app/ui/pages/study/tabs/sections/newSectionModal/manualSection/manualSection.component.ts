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
import { Section } from '@src/app/core/data/database/interfaces/section';
import { DropdownModule } from 'primeng/dropdown';
import { SupportsTableComponent } from './supportsTable/supportsTable.component';
import { Support } from '@src/app/core/data/database/interfaces/support';
import { v4 as uuidv4 } from 'uuid';

const createSupport = (): Support => {
  return {
    uuid: uuidv4(),
    number: null,
    name: null,
    spanLength: null,
    spanAngle: null,
    attachmentHeight: null,
    cableType: null,
    armLength: null,
    chainName: null,
    chainLength: null,
    chainWeight: null,
    chainV: null
  };
};

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
  section = input.required<Section>();
  sectionChange = output<any>();
  supportsAmount = 0;
  sectionTypes = [
    { name: 'Guard', code: 'guard' },
    { name: 'Phase', code: 'phase' }
  ];

  onSupportsAmountChange(event: any) {
    const amount = Number(event.target.value);
    const currentSupports = this.section().supports || [];
    if (amount === currentSupports.length) {
      return;
    }
    if (amount > currentSupports.length) {
      this.section().supports = [
        ...currentSupports,
        ...Array.from(
          { length: amount - currentSupports.length },
          createSupport
        )
      ];
    } else {
      this.section().supports = currentSupports.slice(0, amount);
    }
  }

  addSupport(index: number, position: 'before' | 'after') {
    const newSupport = createSupport();
    console.log('index is', index);
    console.log('position is', position);
    if (position === 'before') {
      this.section().supports?.splice(index, 0, newSupport);
    } else {
      this.section().supports?.splice(index + 1, 0, newSupport);
    }
    this.supportsAmount = this.section().supports?.length || 0;
  }

  deleteSupport(uuid: string) {
    this.section().supports = this.section().supports?.filter(
      (support) => support.uuid !== uuid
    );
    this.supportsAmount = this.section().supports?.length || 0;
  }

  onSupportChange(change: {
    uuid: string;
    field: keyof Support;
    value: Support;
  }) {
    const support = this.section().supports?.find(
      (support: Support) => support.uuid === change.uuid
    );
    if (support) {
      (support as any)[change.field] = change.value;
    }
  }

  onSectionChange() {
    this.sectionChange.emit(this.section());
  }
}
