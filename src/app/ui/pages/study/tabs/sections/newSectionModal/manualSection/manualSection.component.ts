import { Component, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TabsModule } from 'primeng/tabs';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { Section } from '@src/app/core/data/database/interfaces/section';
import { SelectModule } from 'primeng/select';
import { SupportsTableComponent } from './supportsTable/supportsTable.component';
import { Support } from '@src/app/core/data/database/interfaces/support';
import { v4 as uuidv4 } from 'uuid';
import { InputNumberModule } from 'primeng/inputnumber';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { CreateEditView } from '@src/app/ui/shared/types';
import { StudioComponent } from '@src/app/ui/shared/components/studio/studio.component';
import { sectionMock } from './section-mock';
import { TextareaModule } from 'primeng/textarea';

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
    RadioButtonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    DividerModule,
    SelectModule,
    SupportsTableComponent,
    InputNumberModule,
    IconComponent,
    StudioComponent,
    TextareaModule
  ],
  templateUrl: './manualSection.component.html',
  styleUrl: './manualSection.component.scss'
})
export class ManualSectionComponent {
  tabValue = signal<string>('general');
  mode = input.required<CreateEditView>();
  section = input.required<Section>();
  sectionChange = output<any>();
  studio = viewChild(StudioComponent);

  public sectionMock = sectionMock;

  tabValueChange = (event: any) => {
    if (event === 'graphical') {
      this.studio()?.refreshStudio();
    }
  };

  updateSupportsAmount(amount: number) {
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

  onSupportsAmountChangeInput(event: any) {
    if (event.originalEvent.type === 'mousedown') {
      this.updateSupportsAmount(event.value);
    }
  }

  onSupportsAmountChangeBlur(event: any) {
    this.updateSupportsAmount(event.target.value);
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
  }

  deleteSupport(uuid: string) {
    this.section().supports = this.section().supports?.filter(
      (support) => support.uuid !== uuid
    );
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
