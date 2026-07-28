import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TabsModule } from 'primeng/tabs';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { Section, Support, CatalogMaintenance, CatalogLine, CatalogCable } from '@shared/domain';
import { SupportsTableComponent } from './supportsTable/supportsTable.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { CreateEditView } from '@shared/types';
import { StudioComponent } from '@shared/components/studio/studio.component';
import { createEmptySupport } from '@shared/domain/helpers/sections.helpers';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';
import { debounce, sortBy, orderBy, uniqBy } from 'lodash';
import { LinesService } from '@shared/catalog/services/lines.service';
import { CablesService } from '@shared/catalog/services/cables.service';
import { MessageModule } from 'primeng/message';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { PaginatorModule } from 'primeng/paginator';
import { v4 as uuidv4 } from 'uuid';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { DEFAULT_TABLE_ROWS_PER_PAGE, TABLE_ROWS_PER_PAGE_OPTIONS } from '@shared/constants/tablePagination';
import { LocationComponent } from './location/location.component';
import {
  DEBOUNCED_REFRESH_STUDIO_DELAY,
  lineTablePropertiesToSectionProperties,
  orderedLineTableProperties,
  orderedMaintenanceTableProperties
} from './manualSection.constantes';
import { applyLinesCascadeFilter, applyLinesFallback, sortCatalogLines } from './manualSection.helpers';
import { LineTableProperties } from './manualSection.interfaces';
import { LocationData } from './location/location.interfaces';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { createSectionTypes } from './section-mock';

/**
 * Manual section editor component.
 *
 * Provides a tabbed form for editing section general information, supports,
 * and a graphical studio view. Includes cascading filters for maintenance
 * teams, lines, and cables catalogs.
 */
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
    FormsModule,
    MessageModule,
    ButtonComponent,
    PaginatorModule,
    NgxSliderModule,
    LocationComponent,
    TranslocoModule
  ],
  templateUrl: './manualSection.component.html',
  styleUrl: './manualSection.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManualSectionComponent implements OnInit {
  private readonly transloco = inject(TranslocoService);
  tabValue = signal<string>('general');
  mode = input.required<CreateEditView>();
  section = input.required<Section>();
  sectionChange = output<Section>();
  locationChange = output<LocationData>();
  studio = viewChild(StudioComponent);
  cablesFilterTable = signal<CatalogCable[]>([]);
  protected readonly sectionTypes = createSectionTypes(this.transloco);
  isNameUnique = input<boolean>();
  currentPageReportTemplate = this.transloco.translate('manual-section.currentPageReportTemplate');
  readonly noVoltageLabel = this.transloco.translate('manual-section.noVoltage');
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly linesService = inject(LinesService);
  private readonly cablesService = inject(CablesService);
  private readonly destroyRef = inject(DestroyRef);
  readonly plotService = inject(PlotService);
  private readonly spanService = inject(PlotSpanService);
  readonly plotOptionsService = inject(PlotOptionsService);

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

  maintenanceFilterTable = signal<CatalogMaintenance[]>([]);
  linesFilterTable = signal<CatalogLine[]>([]);
  firstSupport = signal<number>(0);
  rowsSupport = signal<number>(DEFAULT_TABLE_ROWS_PER_PAGE);
  rowsSupportOptions = signal(TABLE_ROWS_PER_PAGE_OPTIONS);

  maintenanceTeamRead = signal<string>('');
  maintenanceCenterRead = signal<string>('');
  regionalTeamRead = signal<string>('');
  linkAdrRead = signal<string>('');
  litAdrRead = signal<string>('');

  readonly uniqueMaintenanceCenters = computed(() =>
    orderBy(uniqBy(this.maintenanceFilterTable(), 'maintenance_center_id'), ['maintenance_center'], ['asc'])
  );

  readonly uniqueRegionalTeams = computed(() => uniqBy(this.maintenanceFilterTable(), 'regional_team_id'));

  readonly uniqueMaintenanceTeams = computed(() => uniqBy(this.maintenanceFilterTable(), 'maintenance_team_id'));

  readonly uniqueCableNames = computed(() => uniqBy(this.cablesFilterTable(), 'name'));

  readonly uniqueVoltageIdr = computed(() => uniqBy(this.linesFilterTable(), 'voltage_idr'));

  readonly uniqueLinkIdr = computed(() => orderBy(uniqBy(this.linesFilterTable(), 'link_idr'), ['link_idr'], ['asc']));

  readonly uniqueLinkAdr = computed(() => orderBy(uniqBy(this.linesFilterTable(), 'link_adr'), ['link_adr'], ['asc']));

  readonly uniqueLitIdr = computed(() => orderBy(uniqBy(this.linesFilterTable(), 'lit_idr'), ['lit_idr'], ['asc']));

  readonly uniqueLitAdr = computed(() => orderBy(uniqBy(this.linesFilterTable(), 'lit_idr'), ['lit_adr'], ['asc']));

  readonly uniqueBranchIdr = computed(() =>
    orderBy(uniqBy(this.linesFilterTable(), 'branch_idr'), ['branch_idr'], ['asc'])
  );

  async setupFilterTables() {
    await Promise.all([this.setupMaintenanceFilter(), this.setupLinesFilter(), this.setupCablesFilter()]);
  }

  private async setupMaintenanceFilter(): Promise<void> {
    const table = await this.maintenanceService.getMaintenance();
    this.maintenanceFilterTable.set(sortBy(table, 'maintenance_team'));
    if (this.mode() !== 'view') return;
    this.maintenanceTeamRead.set(
      table.find((item) => item.maintenance_team_id === this.section().maintenance_team_id)?.maintenance_team ?? ''
    );
    this.maintenanceCenterRead.set(
      table.find((item) => item.maintenance_center_id === this.section().maintenance_center_id)?.maintenance_center ??
        ''
    );
    this.regionalTeamRead.set(
      table.find((item) => item.regional_team_id === this.section().regional_team_id)?.regional_team ?? ''
    );
  }

  private async setupLinesFilter(): Promise<void> {
    const allLinesTable = await this.linesService.getLines();
    const filtered = applyLinesCascadeFilter(allLinesTable, this.section());
    const { lines: linesTable, patchedVoltage } = applyLinesFallback(allLinesTable, filtered, this.section());
    if (patchedVoltage !== undefined) {
      // Local-only heuristic: auto-correct voltage_idr when a mismatch leaves the filter empty.
      // Intentionally not calling onSectionChange() — this is a display correction, not a user edit.
      (this.section() as unknown as Record<string, unknown>)['voltage_idr'] = patchedVoltage;
    }
    this.linesFilterTable.set(sortCatalogLines(linesTable));
    if (this.mode() !== 'view') return;
    const linkLine = linesTable.find((item) => item.link_idr === this.section().link_name);
    this.linkAdrRead.set(linkLine?.link_adr ?? '');
    const litLine = linesTable.find((item) => item.lit_idr === this.section().lit_code);
    this.litAdrRead.set(litLine?.lit_adr ?? '');
  }

  private async setupCablesFilter(): Promise<void> {
    const cablesTable = await this.cablesService.getCables();
    this.cablesFilterTable.set(sortBy(cablesTable, 'name'));
  }

  ngOnInit() {
    this.setupFilterTables();
    // Re-populate line dropdowns if the catalog import completes after this component opens.
    this.linesService.imported$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.setupLinesFilter();
    });
  }

  tabValueChange = (event: string | number | undefined) => {
    this.tabValue.set(String(event ?? 'general'));
    if (event === 'graphical') {
      this.spanService.section.set(this.section());
      this.plotService.plotOptionsChange({
        startSupport: 0,
        endSupport: this.section().supports?.length ?? 0
      });
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
        ...Array.from({ length: amount - currentSupports.length }, createEmptySupport)
      ] as Support[];
    } else {
      const supports = currentSupports.slice(0, amount);
      const lastSupport = supports[supports.length - 1];
      lastSupport.spanLength = null;
      this.section().supports = supports;
    }
    this.onSectionChange();
  }

  onSupportsAmountChangeInput(event: { originalEvent: { type: string }; value: string | number | null }) {
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
    const supports = this.section().supports?.filter((support) => support.uuid !== uuid) || [];
    const lastSupport = supports[supports.length - 1];
    lastSupport.spanLength = null;
    this.section().supports = supports;
    this.onSectionChange();
  }

  duplicateSupport(uuid: string) {
    const index = this.section().supports?.findIndex((support: Support) => support.uuid === uuid);
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

  onSectionTypeChange(event: { value: string }) {
    if (event.value === 'guard') {
      this.section().electric_phase_number = 0;
      this.onSectionChange();
    }
  }

  onSupportChange(change: { uuid: string; support: Partial<Support> }) {
    const support = this.section().supports?.find((support: Support) => support.uuid === change.uuid);
    if (support) {
      Object.assign(support, change.support);
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
          (this.section() as unknown as Record<string, unknown>)[id] = undefined;
        }
      });
    }

    let maintenanceTable = await this.maintenanceService.getMaintenance();
    orderedMaintenanceTableProperties.forEach((id) => {
      if (id === type) {
        maintenanceTable = maintenanceTable.filter(
          (item) => !event.value || item[id as keyof CatalogMaintenance] === event.value
        );
      } else {
        maintenanceTable = maintenanceTable.filter(
          (item) =>
            !this.section()[id as keyof Section] ||
            item[id as keyof CatalogMaintenance] === this.section()[id as keyof Section]
        );
      }
    });
    this.maintenanceFilterTable.set(sortBy(maintenanceTable, 'maintenance_team'));
    if (maintenanceTable.length === 1) {
      orderedMaintenanceTableProperties.forEach((id) => {
        (this.section() as unknown as Record<string, unknown>)[id] =
          maintenanceTable[0][id as keyof CatalogMaintenance];
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
          (this.section() as unknown as Record<string, unknown>)[lineTablePropertiesToSectionProperties[id]] =
            undefined;
        }
      });
    }

    const allLinesTable = await this.linesService.getLines();
    const filtered = applyLinesCascadeFilter(allLinesTable, this.section(), type, event.value);
    const { lines: linesTable, patchedVoltage } = applyLinesFallback(allLinesTable, filtered, this.section());
    if (patchedVoltage !== undefined) {
      (this.section() as unknown as Record<string, unknown>)['voltage_idr'] = patchedVoltage;
    }
    this.linesFilterTable.set(sortCatalogLines(linesTable));
    if (linesTable.length === 1) {
      orderedLineTableProperties.forEach((id) => {
        (this.section() as unknown as Record<string, unknown>)[lineTablePropertiesToSectionProperties[id]] =
          linesTable[0][id];
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

  debounceUpdateSliderOptions = debounce((key: 'endSupport' | 'startSupport', value: number) => {
    this.plotService.plotOptionsChange({ [key]: value });
  }, DEBOUNCED_REFRESH_STUDIO_DELAY);

  //TODO: To put into the plot service
  updateSliderOptions({ value, highValue }: { value?: number; highValue?: number }) {
    const options = this.plotOptionsService.plotOptions();
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
