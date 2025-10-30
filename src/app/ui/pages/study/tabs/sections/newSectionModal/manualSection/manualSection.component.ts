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
import { MessageModule } from 'primeng/message';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { PaginatorModule } from 'primeng/paginator';
import { v4 as uuidv4 } from 'uuid';

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
    InputTextModule,
    DialogModule,
    DividerModule,
    SelectModule,
    SupportsTableComponent,
    InputNumberModule,
    IconComponent,
    StudioComponent,
    TextareaModule,
    UniquePipe,
    FormsModule,
    MessageModule,
    ButtonComponent,
    PaginatorModule
  ],
  templateUrl: './manualSection.component.html',
  styleUrl: './manualSection.component.scss'
})
export class ManualSectionComponent implements OnInit {
  tabValue = signal<string>('general');
  mode = input.required<CreateEditView>();
  section = input.required<Section>();
  sectionChange = output<Section>();
  studio = viewChild(StudioComponent);
  cablesFilterTable = signal<Cable[]>([]);
  public sectionTypes = sectionTypes;
  isNameUnique = input<boolean>();
  constructor(
    private readonly maintenanceService: MaintenanceService,
    private readonly linesService: LinesService,
    private readonly cablesService: CablesService
  ) {}

  maintenanceFilterTable = signal<MaintenanceData[]>([]);
  linesFilterTable = signal<Line[]>([]);
  firstSupport = signal<number>(0);
  rowsSupport = signal<number>(5);

  eelRead = signal<string>('');
  cmRead = signal<string>('');
  gmrRead = signal<string>('');

  async setupFilterTables() {
    const table = await this.maintenanceService.getMaintenance();
    this.maintenanceFilterTable.set(sortBy(table, 'eel_name'));
    if (this.mode() === 'view') {
      this.eelRead.set(
        table.find((item) => item.eel_id === this.section().eel)?.eel_name || ''
      );
      this.cmRead.set(
        table.find((item) => item.cm_id === this.section().cm)?.cm_name || ''
      );
      this.gmrRead.set(
        table.find((item) => item.gmr_id === this.section().gmr)?.gmr_name || ''
      );
    }
    const linesTable = await this.linesService.getLines();
    this.linesFilterTable.set(sortLines(linesTable));
    const cablesTable = await this.cablesService.getCables();
    this.cablesFilterTable.set(sortBy(cablesTable, 'name'));
  }

  ngOnInit() {
    this.setupFilterTables();
  }

  tabValueChange = (event: string | number) => {
    this.tabValue.set(String(event));
    if (event === 'graphical') {
      this.studio()?.refreshSection();
    }
  };

  onNextTab() {
    this.tabValue.set('supports');
  }

  onPreviousTab() {
    this.tabValue.set('general');
  }

  updateSupportsAmount(amount: number) {
    const currentSupports = this.section().supports || [];
    if (amount === currentSupports.length) {
      return;
    }
    if (amount < 2) {
      amount = 2;
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
    this.onSectionChange();
  }

  onSupportsAmountChangeInput(event: {
    originalEvent: { type: string };
    value: string | number | null;
  }) {
    if (event.originalEvent.type === 'mousedown' && event.value !== null) {
      this.updateSupportsAmount(Number(event.value));
    }
  }

  onSupportsAmountChangeBlur(event: Event) {
    const target = event.target as HTMLInputElement;
    this.updateSupportsAmount(Number(target.value));
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
    if (this.section().supports?.length <= 2) {
      return;
    }
    this.section().supports = this.section().supports?.filter(
      (support) => support.uuid !== uuid
    );
  }

  duplicateSupport(uuid: string) {
    const support = this.section().supports?.find(
      (support: Support) => support.uuid === uuid
    );
    if (support) {
      this.section().supports?.push({
        ...support,
        uuid: uuidv4()
      });
    }
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
      (support as unknown as Record<string, unknown>)[change.field] =
        change.value;
    }
    this.onSectionChange();
  }

  async onMaintenanceSelect(
    event: { value: string },
    type: 'cm' | 'gmr' | 'eel'
  ) {
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
        (this.section() as unknown as Record<string, unknown>)[id] = uniqBy(
          items,
          id
        )[0][`${id}_id` as keyof MaintenanceData];
      }
    });
  }

  async onLinesSelect(
    event: { value: string },
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

  onSupportsPageChange(event: { rows?: number; page?: number }) {
    this.rowsSupport.set(event.rows ?? 5);
    this.firstSupport.set((event.page ?? 0) * (event.rows ?? 5));
  }
}
