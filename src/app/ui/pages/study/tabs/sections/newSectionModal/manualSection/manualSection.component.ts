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
    electric_tension_level: ''
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
  isOpen = input<boolean>(false);
  isOpenChange = output<boolean>();
  source = 'manual';
  sectionName = signal<string>('');
  section: Section = createSection();
  supportsAmount = 0;
  sectionTypes = [
    { name: 'Guard', code: 'guard' },
    { name: 'Phase', code: 'phase' }
  ];

  onSupportsAmountChange(event: any) {
    const amount = Number(event.target.value);
    const currentSupports = this.section.supports || [];
    if (amount === currentSupports.length) {
      return;
    }
    if (amount > currentSupports.length) {
      this.section.supports = [
        ...currentSupports,
        ...Array.from(
          { length: amount - currentSupports.length },
          createSupport
        )
      ];
    } else {
      this.section.supports = currentSupports.slice(0, amount);
    }
  }

  onVisibleChange(visible: boolean) {
    if (!visible) {
      this.isOpenChange.emit(false);
    }
  }

  addSupport(index: number, position: 'before' | 'after') {
    const newSupport = createSupport();
    console.log('index is', index);
    console.log('position is', position);
    if (position === 'before') {
      this.section.supports?.splice(index, 0, newSupport);
    } else {
      this.section.supports?.splice(index + 1, 0, newSupport);
    }
    this.supportsAmount = this.section.supports?.length || 0;
  }

  deleteSupport(uuid: string) {
    this.section.supports = this.section.supports?.filter(
      (support) => support.uuid !== uuid
    );
    this.supportsAmount = this.section.supports?.length || 0;
  }

  onSupportChange(change: { uuid: string; field: keyof Support; value: any }) {
    const support = this.section.supports?.find((s) => s.uuid === change.uuid);
    if (support) {
      (support as any)[change.field] = change.value;
    }
  }
}
