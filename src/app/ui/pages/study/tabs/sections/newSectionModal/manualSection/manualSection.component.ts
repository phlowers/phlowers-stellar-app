import {
  Component,
  input,
  OnInit,
  output,
  signal,
  viewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TabsModule } from 'primeng/tabs';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { Section } from '@src/app/core/data/database/interfaces/section';
import { SupportsTableComponent } from './supportsTable/supportsTable.component';
import { Support } from '@src/app/core/data/database/interfaces/support';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { CreateEditView } from '@src/app/ui/shared/types';
import { StudioComponent } from '@src/app/ui/shared/components/studio/studio.component';
import { createEmptySupport } from '@src/app/core/services/sections/helpers';
import { sectionTypes, maintenanceSelect, linkSelect } from './section-mock';

const getAllSelectOptions = (
  obj: any,
  path: string
): { name: string; code: string }[] => {
  const keys = path.split('.');

  let current: any[] = [obj];

  for (const key of keys) {
    current = current.flatMap((item) => {
      if (Array.isArray(item)) {
        return item.flatMap((subItem) => subItem[key] ?? []);
      }
      return item?.[key] ?? [];
    });
  }

  return current;
};

@Component({
  selector: 'app-manual-section',
  imports: [
    TabsModule,
    RadioButtonModule,
    FormsModule,
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
export class ManualSectionComponent implements OnInit {
  tabValue = signal<string>('general');
  mode = input.required<CreateEditView>();
  section = input.required<Section>();
  sectionChange = output<any>();
  studio = viewChild(StudioComponent);

  public sectionTypes = sectionTypes;
  public maintenanceSelect = maintenanceSelect;
  public linkSelect = linkSelect;

  public maintenanceSelectGmr = getAllSelectOptions(
    maintenanceSelect,
    'eel.gmr'
  );
  public maintenanceSelectCm = getAllSelectOptions(
    maintenanceSelect,
    'eel.gmr.cm'
  );
  public linkSelectName = getAllSelectOptions(
    linkSelect,
    'tensionLevel.linkName'
  );
  public linkSelectLit = getAllSelectOptions(
    linkSelect,
    'tensionLevel.linkName.lit'
  );
  public linkSelectBranch = getAllSelectOptions(
    linkSelect,
    'tensionLevel.linkName.lit.branch'
  );

  ngOnInit() {
    console.log(maintenanceSelect, this.maintenanceSelectGmr);
  }

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
          createEmptySupport
        )
      ] as Support[];
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
    const newSupport = createEmptySupport();
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
    console.log(this.section());
  }
}
