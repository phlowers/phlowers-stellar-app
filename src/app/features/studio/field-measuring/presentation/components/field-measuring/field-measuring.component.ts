import {
  ChangeDetectionStrategy,
  Component,
  signal,
  effect,
  inject,
  viewChild,
  TemplateRef,
  OnDestroy,
  computed,
  untracked
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DialogModule } from 'primeng/dialog';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { TabList, TabsModule } from 'primeng/tabs';
import { HeaderComponent } from '../header/header.component';
import { FieldMeasure, FieldMeasureTab } from '@features/studio/field-measuring/domain/types';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';
import { SelectOption, TRANSIT_BOUNDS } from '../../constants';
import { FieldDatasComponent } from '../field-datas/field-datas.component';
import { CalculusSettingComponent } from '../calculus-setting/calculus-setting.component';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { TemperatureCalculationComponent } from '../temperature-calculation/temperature-calculation.component';
import { SectionService } from '@services/section/section.service';
import { StudiesService } from '@services/studies/studies.service';
import { InitialCondition } from '@shared/domain';
import { ParameterCalculation15WithoutWindComponent } from '../parameter-calculation-15-without-wind/parameter-calculation-15-without-wind.component';
import {
  createInitialMeasureData,
  initialFieldMeasureOutputs,
  buildWindDirectionOptions,
  buildSkyCoverOptions,
  buildLeftSupportOptions,
  buildFieldMeasureExportFilename,
  resetInactive15CMode,
  isPapotoDataValid,
  isTemperatureDataValid,
  isManual15CDataValid
} from '../../helpers';
import { buildFieldMeasureExportJson } from '../../field-measure-export.helpers';
import { FieldMeasureReportService } from '../../services/field-measure-report/field-measure-report.service';
import { buildFieldMeasureReportData } from '../../services/field-measure-report/field-measure-report.helpers';
import { getDateLocale } from '@shared/helpers/modification-date.helpers';
import { SECTION_TITLE_KEYS } from '../../services/field-measure-report/field-measure-report.constantes';
import { getDefaultLeftSupport } from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-common/tangent-aiming-common.helpers';
import { TANGENT_AIMING_MODES } from '../../tangent-aiming-modes.constantes';
import {
  applyActiveTangentAimingDefaults,
  resetInactiveCalculusModes,
  toUnsavedChangesComparable
} from '../../calculus-mode-reset.helpers';
import { LinesService } from '@shared/catalog/services/lines.service';
import { CablesService } from '@shared/catalog/services/cables.service';
import { isNumber, isEqual } from 'lodash';
import { normalizeFieldMeasureDates } from '@shared/domain/helpers/field-measure.helpers';
import { MessageService } from 'primeng/api';
import { LoggerService } from '@core/services/logger/logger.service';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

/** Main field measuring tool component with tabs for terrain data, parameter calculation, temperature, and parameter at 15°C. */
@Component({
  selector: 'app-field-measuring-tool',
  imports: [
    DialogModule,
    ButtonComponent,
    IconComponent,
    TabsModule,
    HeaderComponent,
    FieldDatasComponent,
    CalculusSettingComponent,
    TemperatureCalculationComponent,
    ParameterCalculation15WithoutWindComponent,
    TranslocoModule
  ],
  templateUrl: './field-measuring.component.html',
  styleUrls: ['./field-measuring.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FieldMeasuringComponent implements OnDestroy {
  readonly headerTemplate = viewChild<TemplateRef<unknown>>('header');
  readonly footerTemplate = viewChild<TemplateRef<unknown>>('footer');
  private readonly tabList = viewChild(TabList);

  private readonly toolbarDialogService = inject(ToolbarDialogService);
  public readonly plotService = inject(PlotService);
  private readonly spanService = inject(PlotSpanService);
  initialConditionModalOpen = signal<boolean>(false);

  initialConditionInput = signal<InitialCondition>({
    uuid: '',
    name: '',
    base_parameters: 2000,
    base_temperature: 15,
    cable_pretension: 0,
    min_temperature: 0,
    max_wind_pressure: 0,
    max_frost_width: 0
  });

  measureData = signal<FieldMeasure>(createInitialMeasureData(null, '', null, null));

  /** Snapshot of the measure data as of the last successful save (or initial load), used to detect unsaved changes. */
  private readonly lastSavedMeasureData = signal<FieldMeasure | null>(null);

  selectedSpan = signal<number[]>([]);

  activeTab = signal<FieldMeasureTab>('terrainData');

  readonly cableOptions = signal<SelectOption[]>([]);

  readonly sectionService = inject(SectionService);
  readonly studiesService = inject(StudiesService);
  private readonly linesService = inject(LinesService);
  readonly cableService = inject(CablesService);
  private readonly messageService = inject(MessageService);
  private readonly logger = inject(LoggerService);
  private readonly translocoService = inject(TranslocoService);
  private readonly fieldMeasureReportService = inject(FieldMeasureReportService);
  private readonly activeLang = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang()
  });

  readonly windDirectionOptions = computed(() => {
    this.activeLang();
    return buildWindDirectionOptions(this.translocoService);
  });

  readonly skyCoverOptions = computed(() => {
    this.activeLang();
    return buildSkyCoverOptions(this.translocoService);
  });

  readonly leftSupportOptions = computed(() => {
    this.activeLang();
    return buildLeftSupportOptions(this.translocoService);
  });

  /** Whether `measureData` differs from the last saved snapshot. */
  readonly hasUnsavedChanges = computed(() => !isEqual(this.measureData(), this.lastSavedMeasureData()));

  /** Whether an input differs from the last saved snapshot: selecting a calculus mode is a choice, not an edit. */
  readonly hasEditedInputs = computed(() => {
    const current = this.measureData();
    const lastSaved = this.lastSavedMeasureData();
    if (!lastSaved) return true;
    return !isEqual(
      toUnsavedChangesComparable(current, getDefaultLeftSupport(current.span)),
      toUnsavedChangesComparable(lastSaved, getDefaultLeftSupport(lastSaved.span))
    );
  });

  constructor() {
    // The active tab bar is measured while the dialog is still zooming in: re-measure it once the dialog is displayed.
    effect(() => {
      this.toolbarDialogService.shownCount();
      this.tabList()?.updateInkBar();
    });

    effect(() => {
      const header = this.headerTemplate();
      const footer = this.footerTemplate();
      if (header && footer) {
        this.toolbarDialogService.setTemplates({ header, footer });
      }
    });

    effect(() => {
      if (this.toolbarDialogService.isOpen() && this.toolbarDialogService.phase() === 'main') {
        // Initialize data from PlotService when dialog opens
        void this.initializeMeasureData();
        void this.cableService.getCables().then((cables) => {
          this.cableOptions.set(
            cables.map((cable) => ({
              label: cable.name,
              value: cable.name
            }))
          );
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.toolbarDialogService.setTemplates({});
  }

  isNameAlreadyTaken = computed(() => {
    return (
      this.spanService
        .section()
        ?.field_measures?.some(
          (measure) => measure.name === this.measureData().name && measure.uuid !== this.measureData().uuid
        ) || false
    );
  });

  /** Global form: the header (span, coordinates, altitude, azimuth) and the measure name, shown on every tab. */
  isGlobalFormValid = computed(() => {
    const measureData = this.measureData();
    const isValid =
      measureData.name &&
      measureData.span &&
      isNumber(measureData.longitude) &&
      measureData.longitude >= -180 &&
      measureData.longitude <= 180 &&
      isNumber(measureData.latitude) &&
      measureData.latitude >= -90 &&
      measureData.latitude <= 90 &&
      isNumber(measureData.altitude) &&
      measureData.altitude >= -100 &&
      measureData.altitude <= 9000 &&
      isNumber(measureData.azimuth) &&
      measureData.azimuth >= -180 &&
      measureData.azimuth <= 180;
    return !!isValid && !this.isNameAlreadyTaken();
  });

  /** Validity of the "Terrain data" tab. */
  isTerrainDataValid = computed(() => {
    const measureData = this.measureData();
    return !!(
      isNumber(measureData.windSpeed) &&
      measureData.windSpeed >= 0 &&
      measureData.windSpeed <= 50 &&
      isNumber(measureData.ambientTemperature) &&
      measureData.ambientTemperature >= -50 &&
      measureData.ambientTemperature <= 99 &&
      measureData.windDirection &&
      measureData.skyCover &&
      (!isNumber(measureData.transit) ||
        (measureData.transit >= TRANSIT_BOUNDS.min && measureData.transit <= TRANSIT_BOUNDS.max))
    );
  });

  /** Whether a tangent aiming (support, exterior or interior) method is selected. */
  readonly isTangentAimingMethod = computed(() => !!TANGENT_AIMING_MODES[this.measureData().calculationMethod]);

  /**
   * Validity of the "Parameter calculation" tab (RG.MES.EXP-BTN.2). Only the PAPOTO method has an
   * implemented form to validate; the other methods (placeholders) are always considered valid.
   */
  readonly isParameterCalculationValid = computed(() => {
    const measureData = this.measureData();
    const mode = TANGENT_AIMING_MODES[measureData.calculationMethod];
    if (mode) {
      return mode.isDataValid(measureData);
    }
    return measureData.calculationMethod !== 'papoto' || isPapotoDataValid(measureData);
  });

  /** Validity of the "Temperature calculation" tab (RG.MES.EXP-BTN.2). */
  readonly isTemperatureCalculationValid = computed(() => isTemperatureDataValid(this.measureData()));

  /**
   * Validity of the "Parameter at 15°C without wind" tab (RG.MES.EXP-BTN.2). In manual mode the user-entered
   * fields must be valid (same rule as the tab form). In auto mode the tab has no editable input (it only
   * displays computed values), so it is always valid for export purposes — the export contract already supports
   * an uncomputed `zeroWindCalculation` (see `buildZeroWindCalculationExport`), matching RG.MES.EXP-BTN.1 allowing
   * export once the measure is calculated *or* saved (not necessarily both calculated).
   */
  readonly isParameter15CValid = computed(
    () => this.measureData().updateMode15C !== 'manual' || isManual15CDataValid(this.measureData())
  );

  /** Whether the measure has been computed at least once (PAPOTO is currently the only implemented method). */
  readonly hasComputedOutputs = computed(() => {
    const { calculationMethod, outputs } = this.measureData();
    return outputs[TANGENT_AIMING_MODES[calculationMethod]?.outputKey ?? 'papoto'] !== null;
  });

  /**
   * The "Enregistrer" button: any edited input of the whole measure (whatever the tab) can be saved, even if the
   * measure is incomplete; only its identity (a non-empty, unique name) is required. A parameter input edit clears
   * the result, which is then saved as not calculated. Right after a save nothing is unsaved.
   */
  readonly canSave = computed(
    () => !!this.measureData().name?.trim() && !this.isNameAlreadyTaken() && this.hasEditedInputs()
  );

  /**
   * Whether the displayed measure is the saved one: same calculus method and no input edited since the last save.
   * Unlike `hasUnsavedChanges`, it ignores the defaults and stale automatic results that opening a measure
   * normalizes, which are not user edits.
   */
  private readonly isSaved = computed(
    () =>
      this.lastSavedMeasureData()?.calculationMethod === this.measureData().calculationMethod && !this.hasEditedInputs()
  );

  /** Validity of the displayed tab: the global form (header and name) is checked separately. */
  private readonly isActiveTabValid = computed(() => {
    switch (this.activeTab()) {
      case 'parameterCalculation':
        return this.isParameterCalculationValid();
      case 'temperatureCalculation':
        return this.isTemperatureCalculationValid();
      case 'parameterAt15CWithoutWind':
        return this.isParameter15CValid();
      default:
        return this.isTerrainDataValid();
    }
  });

  /** The "Rapport" and "Exporter" buttons: active when the global form and the displayed tab are valid and saved. */
  readonly canReportOrExport = computed(() => this.isGlobalFormValid() && this.isActiveTabValid() && this.isSaved());

  /** Tells why "Rapport" and "Exporter" are inactive: the invalid data and/or the missing save; `null` when active. */
  readonly reportExportBlockedReason = computed(() => {
    if (this.canReportOrExport()) {
      return null;
    }
    this.activeLang();
    const t = (key: string, params?: Record<string, string>): string => this.translocoService.translate(key, params);
    const activeTabTitleKey = {
      terrainData: SECTION_TITLE_KEYS.terrainData,
      parameterCalculation: SECTION_TITLE_KEYS.parameterCalculation,
      temperatureCalculation: SECTION_TITLE_KEYS.temperatureCalculation,
      parameterAt15CWithoutWind: SECTION_TITLE_KEYS.parameter15C
    }[this.activeTab()];
    const reasons: string[] = [];
    if (!this.isGlobalFormValid()) {
      reasons.push(t('field-measuring.report.blocked-invalid-global'));
    }
    if (!this.isActiveTabValid()) {
      reasons.push(t('field-measuring.report.blocked-invalid-tabs', { tabs: t(activeTabTitleKey) }));
    }
    if (!this.isSaved()) {
      reasons.push(t('field-measuring.report.blocked-unsaved'));
    }
    return reasons.join(' ');
  });

  private async initializeMeasureData(): Promise<void> {
    const section = this.spanService.section();
    const selectedFieldMeasure = section?.field_measures.find(
      (measure) => measure.uuid === section?.selected_field_measure_uuid
    );

    if (!section || !selectedFieldMeasure) {
      this.logger.warn('No section available');
      this.toolbarDialogService.closeTool();
      return;
    }

    // A measure saved before an output existed lacks its key: `undefined` would read as "computed" / "not recalculable".
    // Likewise, a tangent aiming measure may lack inputs or hold a calculation type that is no longer supported.
    const measure = normalizeFieldMeasureDates({
      ...selectedFieldMeasure,
      outputs: { ...initialFieldMeasureOutputs, ...selectedFieldMeasure.outputs }
    });
    this.measureData.set(applyActiveTangentAimingDefaults(measure, getDefaultLeftSupport(measure.span)));
    this.activeTab.set(selectedFieldMeasure.savedTab ?? 'terrainData');

    // Fetch link_adr from lines service
    const linesTable = await this.linesService.getLines();
    const linkLine = linesTable?.find((item) => item.link_idr === section.link_idr);
    const linkAdrRead = linkLine?.link_adr || '';

    this.measureData.set({
      ...untracked(() => this.measureData()),
      link: linkAdrRead,
      voltage: section.voltage_idr || '',
      spanType: section.type || '',
      phaseNumber: section.electric_phase_number || 0,
      numberOfConductors: section.cables_amount || 0,
      cableName: section.cable_name || ''
    });
    this.lastSavedMeasureData.set(this.measureData());
  }

  onVisibleChange(visible: boolean) {
    if (!visible) {
      this.toolbarDialogService.closeTool();
    }
  }

  onFieldChange<K extends keyof FieldMeasure>(field: K, value: FieldMeasure[K]) {
    const measureData = this.measureData();
    if (!measureData) {
      return;
    }

    // Papoto input fields — any change invalidates the stale calculation result
    const papotoInputFields: (keyof FieldMeasure)[] = [
      'leftSupport',
      'spanLength',
      'measuredElevationDifference',
      'HL',
      'H1',
      'H2',
      'H3',
      'HR',
      'VL',
      'V1',
      'V2',
      'V3',
      'VR'
    ];

    const updated = {
      ...measureData,
      [field]: value
    };

    // Clear stale PAPOTO result if any PAPOTO input changed
    if (papotoInputFields.includes(field) && measureData.outputs.papoto !== null) {
      updated.outputs = { ...updated.outputs, papoto: null };
    }

    this.measureData.set(updated);
  }

  /** Exports the saved measure as JSON; missing fields are exported as `null`. */
  async onExport() {
    const measureData = this.measureData();
    const section = this.spanService.section();
    const study = this.plotService.study();
    const litData = this.plotService.litData();
    const json = buildFieldMeasureExportJson(measureData, section, study, litData, this.translocoService);
    const filename = buildFieldMeasureExportFilename(measureData, section?.name ?? null);
    await this.saveExportFile(json, filename);
  }

  private async saveExportFile(json: string, filename: string): Promise<void> {
    if (globalThis.showSaveFilePicker) {
      try {
        const handle = await globalThis.showSaveFilePicker({
          suggestedName: `${filename}.json`,
          types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        this.logger.error('Failed to save export file via showSaveFilePicker', error);
      }
    }

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * RG.MES.RAP-BTN.2: generates the PDF report of the saved field measure (inputs and calculation results).
   * It reads the saved snapshot, so only the method and sub-method that were saved are reported.
   */
  async onReport() {
    const data = buildFieldMeasureReportData({
      measureData: this.lastSavedMeasureData() ?? this.measureData(),
      section: this.spanService.section(),
      study: this.plotService.study(),
      litData: this.plotService.litData(),
      translocoService: this.translocoService,
      locale: getDateLocale(this.translocoService.getActiveLang()),
      generatedAt: new Date()
    });
    await this.fieldMeasureReportService.generateReport(data);
  }

  async onSave() {
    const section = this.spanService.section();
    const currentMeasureData = this.measureData();
    if (!section || !currentMeasureData) {
      return;
    }
    // Only the displayed inputs are persisted (RG.VIS-SUP.ENR-BTN.2, RG.ENR-BTN.2)
    const { calculationMethod } = currentMeasureData;
    const activeMeasureData =
      TANGENT_AIMING_MODES[calculationMethod]?.resetNonDisplayedFields(currentMeasureData) ?? currentMeasureData;
    const measureData: FieldMeasure = {
      ...resetInactive15CMode(
        resetInactiveCalculusModes(activeMeasureData, activeMeasureData.calculationMethod, {
          defaultTangentLeftSupport: getDefaultLeftSupport(activeMeasureData.span)
        })
      ),
      savedTab: this.activeTab()
    };
    const isExistingMeasure = section.field_measures.some((measure) => measure.uuid === measureData.uuid);
    if (isExistingMeasure) {
      await this.plotService.modifySection({
        field_measures: section.field_measures.map((measure) =>
          measure.uuid === measureData.uuid ? measureData : measure
        )
      });
    } else {
      await this.plotService.modifySection({
        field_measures: [...(section?.field_measures || []), measureData]
      });
    }
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('common.success'),
      detail: this.translocoService.translate('field-measuring.actions.success-detail')
    });
    this.measureData.set(measureData);
    this.lastSavedMeasureData.set(measureData);
  }

  onImportStationData() {
    // TODO: Implement station data import functionality
    this.logger.log('Import station data');
  }
}
