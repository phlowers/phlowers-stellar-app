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
import { sectionTypes } from './section-mock';
import { MaintenanceService } from '@src/app/core/services/maintenance/maintenance.service';
import { MaintenanceData } from '@src/app/core/data/database/interfaces/maintenance';
import { sortBy, uniqBy } from 'lodash';
import { UniquePipe } from '@src/app/ui/shared/service/autocomplete/unique.pipe';
import { Line } from '@src/app/core/data/database/interfaces/line';
import { LinesService } from '@src/app/core/services/lines/lines.service';
import { Cable } from '@src/app/core/data/database/interfaces/cable';
import { CablesService } from '@src/app/core/services/cables/cables.service';

const sortLines = (lines: Line[]) => {
  return lines.sort((a, b) => {
    const aElectricTensionLevelAdr = a.electric_tension_level_adr || '';
    const bElectricTensionLevelAdr = b.electric_tension_level_adr || '';
    return (
      aElectricTensionLevelAdr.length - bElectricTensionLevelAdr.length ||
      aElectricTensionLevelAdr.localeCompare(bElectricTensionLevelAdr || '')
    );
  });
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
    TextareaModule,
    UniquePipe
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
  cablesFilterTable = signal<Cable[]>([]);
  public sectionTypes = sectionTypes;
  constructor(
    private readonly maintenanceService: MaintenanceService,
    private readonly linesService: LinesService,
    private readonly cablesService: CablesService
  ) {}

  maintenanceFilterTable = signal<MaintenanceData[]>([]);
  linesFilterTable = signal<Line[]>([]);

  async setupFilterTables() {
    const table = await this.maintenanceService.getMaintenance();
    this.maintenanceFilterTable.set(sortBy(table, 'eel_name'));
    const linesTable = await this.linesService.getLines();
    this.linesFilterTable.set(sortLines(linesTable));
    const cablesTable = await this.cablesService.getCables();
    this.cablesFilterTable.set(sortBy(cablesTable, 'name'));
  }

  ngOnInit() {
    this.setupFilterTables();
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

  async onMaintenanceSelect(event: any, type: 'cm' | 'gmr' | 'eel') {
    if (!event.value) {
      this.maintenanceFilterTable.set(
        sortBy(await this.maintenanceService.getMaintenance(), 'eel_name')
      );
      this.section().eel = undefined;
      this.section().cm = undefined;
      this.section().gmr = undefined;
      return;
    }

    const items = this.maintenanceFilterTable().filter(
      (item) => item[`${type}_id`] === event.value
    );
    this.maintenanceFilterTable.set(sortBy(items, 'eel_name'));
    ['eel', 'cm', 'gmr'].forEach((id) => {
      if (uniqBy(items, `${id}_id`)?.length === 1) {
        (this.section() as any)[id] = uniqBy(items, id)[0][
          `${id}_id` as keyof MaintenanceData
        ];
      }
    });
  }

  async onLinesSelect(
    event: any,
    type: 'link_idr' | 'lit_adr' | 'branch_adr' | 'electric_tension_level_adr'
  ) {
    if (!event.value) {
      this.linesFilterTable.set(sortLines(await this.linesService.getLines()));
      this.section().lit = undefined;
      this.section().branch_name = undefined;
      this.section().link_name = undefined;
      this.section().electric_tension_level = undefined;
      return;
    }

    const items = this.linesFilterTable().filter(
      (item) => item[type] === event.value
    );
    this.linesFilterTable.set(sortLines(items));
    const uniqByLinkIdr = uniqBy(items, `link_idr`);
    const uniqByLitAdr = uniqBy(items, `lit_adr`);
    const uniqByBranchIdr = uniqBy(items, `branch_idr`);
    const uniqByElectricTensionLevelAdr = uniqBy(
      items,
      `electric_tension_level_adr`
    );
    if (uniqByLinkIdr?.length === 1) {
      this.section().link_name = uniqByLinkIdr[0].link_idr;
    }
    if (uniqByLitAdr?.length === 1) {
      this.section().lit = uniqByLitAdr[0].lit_adr;
    }
    if (uniqByBranchIdr?.length === 1) {
      this.section().branch_name = uniqByBranchIdr[0].branch_adr;
    }
    if (uniqByElectricTensionLevelAdr?.length === 1) {
      const tension =
        uniqByElectricTensionLevelAdr[0].electric_tension_level_adr;
      this.section().electric_tension_level = tension?.length
        ? tension
        : undefined;
    }
  }

  onSectionChange() {
    this.sectionChange.emit(this.section());
  }
}
