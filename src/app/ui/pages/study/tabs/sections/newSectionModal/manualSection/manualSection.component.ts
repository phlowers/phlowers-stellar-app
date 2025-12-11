import {
  Component,
  computed,
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
import { debounce, sortBy } from 'lodash';
import { UniquePipe } from '@src/app/ui/shared/service/autocomplete/unique.pipe';
import { Line } from '@src/app/core/data/database/interfaces/line';
import { LinesService } from '@src/app/core/services/lines/lines.service';
import { Cable } from '@src/app/core/data/database/interfaces/cable';
import { CablesService } from '@src/app/core/services/cables/cables.service';
import { MessageModule } from 'primeng/message';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { PaginatorModule } from 'primeng/paginator';
import { v4 as uuidv4 } from 'uuid';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { PlotService } from '@src/app/ui/pages/studio/services/plot.service';

// debounce to make it more fluid when dragging the slider
const DEBOUNCED_REFRESH_STUDIO_DELAY = 300;

const sortLines = (lines: Line[]) => {
  return lines.sort((a, b) => {
    const aVoltageAdr = a.voltage_adr || '';
    const bVoltageAdr = b.voltage_adr || '';
    return (
      aVoltageAdr.length - bVoltageAdr.length ||
      aVoltageAdr.localeCompare(bVoltageAdr || '')
    );
  });
};

const lineTablePropertiesToSectionProperties: Record<
  LineTableProperties,
  keyof Section
> = {
  voltage_idr: 'voltage_idr',
  link_idr: 'link_name',
  lit_idr: 'lit',
  branch_idr: 'branch_name'
};

const orderedMaintenanceTableProperties: (
  | 'maintenance_center_id'
  | 'regional_team_id'
  | 'maintenance_team_id'
)[] = ['maintenance_center_id', 'regional_team_id', 'maintenance_team_id'];

type LineTableProperties =
  | 'voltage_idr'
  | 'link_idr'
  | 'lit_idr'
  | 'branch_idr';

const orderedLineTableProperties: LineTableProperties[] = [
  'voltage_idr',
  'link_idr',
  'lit_idr',
  'branch_idr'
];

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
    PaginatorModule,
    NgxSliderModule
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
    private readonly cablesService: CablesService,
    public readonly plotService: PlotService
  ) {}

  //TODO: To put into the plot service
  sliderOptions = computed<Options>(() => {
    return {
      floor: 0,
      ceil: (this.section().supports?.length ?? 100) - 1,
      step: 1,
      showTicks: true,
      showTicksValues: true,
      animate: false,
      animateOnMove: false,
      disabled: this.plotService.loading(),
      translate: (value: number) => {
        return (value + 1).toString();
      }
    };
  });

  maintenanceFilterTable = signal<MaintenanceData[]>([]);
  linesFilterTable = signal<Line[]>([]);
  firstSupport = signal<number>(0);
  rowsSupport = signal<number>(5);

  maintenanceTeamRead = signal<string>('');
  maintenanceCenterRead = signal<string>('');
  regionalTeamRead = signal<string>('');

  async setupFilterTables() {
    const table = await this.maintenanceService.getMaintenance();
    this.maintenanceFilterTable.set(sortBy(table, 'maintenance_team'));
    if (this.mode() === 'view') {
      this.maintenanceTeamRead.set(
        table.find(
          (item) =>
            item.maintenance_team_id === this.section().maintenance_team_id
        )?.maintenance_team || ''
      );
      this.maintenanceCenterRead.set(
        table.find(
          (item) =>
            item.maintenance_center_id === this.section().maintenance_center_id
        )?.maintenance_center || ''
      );
      this.regionalTeamRead.set(
        table.find(
          (item) => item.regional_team_id === this.section().regional_team_id
        )?.regional_team || ''
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
    this.onSectionChange();
  }

  deleteSupport(uuid: string) {
    if (this.section().supports?.length <= 2) {
      return;
    }
    const supports =
      this.section().supports?.filter((support) => support.uuid !== uuid) || [];
    const lastSupport = supports[supports.length - 1];
    lastSupport.spanLength = null;
    this.section().supports = supports;
    this.onSectionChange();
  }

  duplicateSupport(uuid: string) {
    const index = this.section().supports?.findIndex(
      (support: Support) => support.uuid === uuid
    );
    if (index !== undefined) {
      const support = this.section().supports?.[index];
      if (support) {
        const newSupport = {
          ...support,
          uuid: uuidv4()
        };
        this.section().supports?.splice(index + 1, 0, newSupport as Support);
      }
    }
    this.onSectionChange();
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
    type: 'maintenance_center_id' | 'regional_team_id' | 'maintenance_team_id'
  ) {
    if (!event.value) {
      let found = false;
      orderedMaintenanceTableProperties.forEach((id) => {
        if (id === type) {
          found = true;
        }
        if (found) {
          (this.section() as unknown as Record<string, unknown>)[id] =
            undefined;
        }
      });
    }

    let maintenanceTable = await this.maintenanceService.getMaintenance();
    orderedMaintenanceTableProperties.forEach((id) => {
      if (id === type) {
        maintenanceTable = maintenanceTable.filter(
          (item) =>
            !event.value || item[id as keyof MaintenanceData] === event.value
        );
      } else {
        maintenanceTable = maintenanceTable.filter(
          (item) =>
            !this.section()[id as keyof Section] ||
            item[id as keyof MaintenanceData] ===
              this.section()[id as keyof Section]
        );
      }
    });
    this.maintenanceFilterTable.set(
      sortBy(maintenanceTable, 'maintenance_team')
    );
    if (maintenanceTable.length === 1) {
      orderedMaintenanceTableProperties.forEach((id) => {
        (this.section() as unknown as Record<string, unknown>)[id] =
          maintenanceTable[0][id as keyof MaintenanceData];
      });
    }
  }

  async onLinesSelect(event: { value: string }, type: LineTableProperties) {
    if (!event.value) {
      let found = false;
      orderedLineTableProperties.forEach((id) => {
        if (id === type) {
          found = true;
        }
        if (found) {
          (this.section() as unknown as Record<string, unknown>)[
            lineTablePropertiesToSectionProperties[id]
          ] = undefined;
        }
      });
    }

    let linesTable = await this.linesService.getLines();
    orderedLineTableProperties.forEach((id) => {
      if (id === type) {
        linesTable = linesTable.filter(
          (item) => !event.value || item[id] === event.value
        );
      } else {
        linesTable = linesTable.filter(
          (item) =>
            !this.section()[lineTablePropertiesToSectionProperties[id]] ||
            item[id] ===
              this.section()[lineTablePropertiesToSectionProperties[id]]
        );
      }
    });
    this.linesFilterTable.set(sortLines(linesTable));
    if (linesTable.length === 1) {
      orderedLineTableProperties.forEach((id) => {
        (this.section() as unknown as Record<string, unknown>)[
          lineTablePropertiesToSectionProperties[id]
        ] = linesTable[0][id];
      });
    }
  }

  onSectionChange() {
    this.sectionChange.emit(this.section());
  }

  onSupportsPageChange(event: { rows?: number; page?: number }) {
    this.rowsSupport.set(event.rows ?? 5);
    this.firstSupport.set((event.page ?? 0) * (event.rows ?? 5));
  }

  debounceUpdateSliderOptions = debounce(
    (key: 'endSupport' | 'startSupport', value: number) => {
      this.plotService.plotOptionsChange({ [key]: value });
    },
    DEBOUNCED_REFRESH_STUDIO_DELAY
  );

  //TODO: To put into the plot service
  updateSliderOptions({
    value,
    highValue
  }: {
    value?: number | undefined;
    highValue?: number | undefined;
  }) {
    const options = this.plotService.plotOptions();
    [
      { val: value, key: 'startSupport' as const, opt: options.startSupport },
      { val: highValue, key: 'endSupport' as const, opt: options.endSupport }
    ].forEach(({ val, key, opt }) => {
      if (val !== undefined && val !== opt) {
        this.debounceUpdateSliderOptions(key, val);
      }
    });
  }
}
