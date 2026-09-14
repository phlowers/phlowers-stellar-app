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
import { TabsModule } from 'primeng/tabs';
import { HeaderComponent } from '../header/header.component';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';
import { SelectOption, TRANSIT_BOUNDS, MEASURED_SOLAR_FLUX_BOUNDS } from '../../constants';
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
  buildWindDirectionOptions,
  buildSkyCoverOptions,
  buildLeftSupportOptions,
  buildFieldMeasureExportFilename
} from '../../helpers';
import { buildFieldMeasureExportJson } from '../../field-measure-export.helpers';
import { LinesService } from '@shared/catalog/services/lines.service';
import { CablesService } from '@shared/catalog/services/cables.service';
import { isNumber, isEqual } from 'lodash';
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

  activeTab = signal<'terrainData' | 'parameterCalculation' | 'temperatureCalculation' | 'parameterAt15CWithoutWind'>(
    'terrainData'
  );

  readonly cableOptions = signal<SelectOption[]>([]);

  readonly sectionService = inject(SectionService);
  readonly studiesService = inject(StudiesService);
  private readonly linesService = inject(LinesService);
  readonly cableService = inject(CablesService);
  private readonly messageService = inject(MessageService);
  private readonly logger = inject(LoggerService);
  private readonly translocoService = inject(TranslocoService);
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

  constructor() {
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
        this.initializeMeasureData();
        this.cableService.getCables().then((cables) => {
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

  isFormValid = computed(() => {
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
      measureData.azimuth <= 180 &&
      isNumber(measureData.windSpeed) &&
      measureData.windSpeed >= 0 &&
      measureData.windSpeed <= 50 &&
      isNumber(measureData.ambientTemperature) &&
      measureData.ambientTemperature >= -50 &&
      measureData.ambientTemperature <= 99 &&
      measureData.windDirection &&
      measureData.skyCover &&
      (!isNumber(measureData.transit) ||
        (measureData.transit >= TRANSIT_BOUNDS.min && measureData.transit <= TRANSIT_BOUNDS.max));
    return isValid && !this.isNameAlreadyTaken();
  });

  /**
   * Validity of the "Parameter calculation" tab (RG.MES.EXP-BTN.2). Only the PAPOTO method has an
   * implemented form to validate; the other methods (placeholders) are always considered valid.
   */
  readonly isParameterCalculationValid = computed(() => {
    const measureData = this.measureData();
    if (measureData.calculationMethod !== 'papoto') {
      return true;
    }
    return !!(
      measureData.leftSupport &&
      measureData.spanLength != null &&
      measureData.measuredElevationDifference != null &&
      measureData.HL != null &&
      measureData.H1 != null &&
      measureData.H2 != null &&
      measureData.H3 != null &&
      measureData.HR != null &&
      measureData.VL != null &&
      measureData.V1 != null &&
      measureData.V2 != null &&
      measureData.V3 != null &&
      measureData.VR != null
    );
  });

  /** Validity of the "Temperature calculation" tab (RG.MES.EXP-BTN.2), mirroring `TemperatureCalculationComponent.isFormValid`. */
  readonly isTemperatureCalculationValid = computed(() => {
    const measureData = this.measureData();
    const isTransitOutOfBounds =
      isNumber(measureData.transit) &&
      (measureData.transit < TRANSIT_BOUNDS.min || measureData.transit > TRANSIT_BOUNDS.max);
    const isMeasuredSolarFluxOutOfBounds =
      isNumber(measureData.measuredDiffusedPlusDirectSolarFlux) &&
      (measureData.measuredDiffusedPlusDirectSolarFlux < MEASURED_SOLAR_FLUX_BOUNDS.min ||
        measureData.measuredDiffusedPlusDirectSolarFlux > MEASURED_SOLAR_FLUX_BOUNDS.max);
    return (
      measureData.cableName !== null &&
      measureData.transit !== null &&
      measureData.skyCover !== null &&
      !isTransitOutOfBounds &&
      !isMeasuredSolarFluxOutOfBounds
    );
  });

  /**
   * Validity of the "Parameter at 15°C without wind" tab (RG.MES.EXP-BTN.2). In manual mode the user-entered
   * fields must be filled. In auto mode the tab has no editable input (it only displays computed values), so
   * it is always valid for export purposes — the export contract already supports an uncomputed
   * `zeroWindCalculation` (see `buildZeroWindCalculationExport`), matching RG.MES.EXP-BTN.1 allowing export
   * once the measure is calculated *or* saved (not necessarily both calculated).
   */
  readonly isParameter15CValid = computed(() => {
    const measureData = this.measureData();
    if (measureData.updateMode15C !== 'manual') {
      return true;
    }
    const manualData = measureData.manualParameterCalculation15CWithoutWind;
    return (
      isNumber(manualData?.cableTemperatureCalibration) &&
      isNumber(manualData?.parameterPapoto) &&
      isNumber(manualData?.cableTemperatureCalibrationUncertainty)
    );
  });

  /** Whether the measure has been computed at least once (PAPOTO is currently the only implemented method). */
  readonly hasComputedOutputs = computed(() => this.measureData().outputs.papoto !== null);

  /** RG.MES.EXP-BTN.1: the "Exporter" button stays inactive until the measure is both valid and calculated/saved. */
  readonly canExport = computed(
    () =>
      this.isFormValid() &&
      this.isParameterCalculationValid() &&
      this.isTemperatureCalculationValid() &&
      this.isParameter15CValid() &&
      (this.hasComputedOutputs() || !this.hasUnsavedChanges())
  );

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

    this.measureData.set(selectedFieldMeasure);

    // Fetch link_adr from lines service
    const linesTable = await this.linesService.getLines();
    const linkLine = linesTable?.find((item) => item.link_idr === section.link_code);
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
    this.measureData.set({
      ...measureData,
      [field]: value
    });
  }

  async onExport() {
    if (
      !this.isFormValid() ||
      !this.isParameterCalculationValid() ||
      !this.isTemperatureCalculationValid() ||
      !this.isParameter15CValid()
    ) {
      this.messageService.add({
        severity: 'error',
        summary: this.translocoService.translate('common.error'),
        detail: this.translocoService.translate('field-measuring.actions.export-invalid-detail')
      });
      return;
    }

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

  onReport() {
    // TODO: Implement report functionality
    this.logger.log('Report', this.measureData());
  }

  async onSave() {
    const section = this.spanService.section();
    const measureData = this.measureData();
    if (!section || !measureData) {
      return;
    }
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
    this.lastSavedMeasureData.set(measureData);
  }

  onImportStationData() {
    // TODO: Implement station data import functionality
    this.logger.log('Import station data');
  }
}
