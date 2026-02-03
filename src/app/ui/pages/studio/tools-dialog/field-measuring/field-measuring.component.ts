import {
  Component,
  signal,
  effect,
  inject,
  ViewChild,
  TemplateRef,
  AfterViewInit,
  OnDestroy,
  computed,
  untracked
} from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { TabsModule } from 'primeng/tabs';
import { HeaderComponent } from './components/header/header.component';
import { FieldMeasure } from './types';
import { ToolsDialogService } from '../tools-dialog.service';
import {
  WIND_DIRECTION_OPTIONS,
  SKY_COVER_OPTIONS,
  LEFT_SUPPORT_OPTIONS,
  SelectOption
} from './constants';
import { FieldDatasComponent } from './components/field-datas/field-datas.component';
import { CalculusSettingComponent } from './components/calculus-setting/calculus-setting.component';
import { PlotService } from '@ui/pages/studio/services/plot.service';
import { TemperatureCalculationComponent } from './components/temperature-calculation/temperature-calculation.component';
import { SectionService } from '@services/sections/section.service';
import { StudiesService } from '@services/studies/studies.service';
import { InitialCondition } from '@core/domain';
import { ParameterCalculation15WithoutWindComponent } from './components/parameter-calculation-15-without-wind/parameter-calculation-15-without-wind.component';
import { createInitialMeasureData } from './helpers';
import { LinesService } from '@services/lines/lines.service';
import { CablesService } from '@services/cables/cables.service';
import { isNumber } from 'lodash';
import { MessageService } from 'primeng/api';

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
    ParameterCalculation15WithoutWindComponent
  ],
  templateUrl: './field-measuring.component.html',
  styleUrls: ['./field-measuring.component.scss']
})
export class FieldMeasuringComponent implements AfterViewInit, OnDestroy {
  @ViewChild('header', { static: false }) headerTemplate!: TemplateRef<unknown>;
  @ViewChild('footer', { static: false }) footerTemplate!: TemplateRef<unknown>;

  private readonly toolsDialogService = inject(ToolsDialogService);
  public readonly plotService = inject(PlotService);
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

  ngAfterViewInit(): void {
    this.toolsDialogService.setTemplates({
      header: this.headerTemplate,
      footer: this.footerTemplate
    });
  }

  measureData = signal<FieldMeasure>(
    createInitialMeasureData(null, '', null, null)
  );

  selectedSpan = signal<number[]>([]);

  activeTab = signal<
    | 'terrainData'
    | 'parameterCalculation'
    | 'temperatureCalculation'
    | 'parameterAt15CWithoutWind'
  >('terrainData');

  readonly windDirectionOptions = signal<SelectOption[]>(
    WIND_DIRECTION_OPTIONS
  );
  readonly skyCoverOptions = signal<SelectOption[]>(SKY_COVER_OPTIONS);
  readonly leftSupportOptions = signal<SelectOption[]>(LEFT_SUPPORT_OPTIONS);
  readonly cableOptions = signal<SelectOption[]>([]);

  constructor(
    public readonly sectionService: SectionService,
    public readonly studiesService: StudiesService,
    private readonly linesService: LinesService,
    public readonly cableService: CablesService,
    private readonly messageService: MessageService
  ) {
    effect(() => {
      if (this.toolsDialogService.isMainOpen()) {
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
    this.toolsDialogService.setTemplates({});
  }

  isNameAlreadyTaken = computed(() => {
    return (
      this.plotService
        .section()
        ?.field_measures?.some(
          (measure) =>
            measure.name === this.measureData().name &&
            measure.uuid !== this.measureData().uuid
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
      measureData.skyCover;
    return isValid && !this.isNameAlreadyTaken();
  });

  private async initializeMeasureData(): Promise<void> {
    const section = this.plotService.section();
    const selectedFieldMeasure = section?.field_measures.find(
      (measure) => measure.uuid === section?.selected_field_measure_uuid
    );

    if (!section || !selectedFieldMeasure) {
      console.warn('No section available');
      this.toolsDialogService.closeTool();
      return;
    }

    this.measureData.set(selectedFieldMeasure);

    // Fetch link_adr from lines service
    const linesTable = await this.linesService.getLines();
    const linkLine = linesTable?.find(
      (item) => item.link_idr === section.link_name
    );
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
  }

  onVisibleChange(visible: boolean) {
    if (!visible) {
      this.toolsDialogService.closeTool();
    }
  }

  onFieldChange<K extends keyof FieldMeasure>(
    field: K,
    value: FieldMeasure[K]
  ) {
    const measureData = this.measureData();
    if (!measureData) {
      return;
    }
    this.measureData.set({
      ...measureData,
      [field]: value
    });
  }

  onExport() {
    // TODO: Implement export functionality
    console.log('Export', this.measureData());
  }

  onReport() {
    // TODO: Implement report functionality
    console.log('Report', this.measureData());
  }

  async onSave() {
    const section = this.plotService.section();
    const measureData = this.measureData();
    if (!section || !measureData) {
      return;
    }
    const isExistingMeasure = section.field_measures.find(
      (measure) => measure.uuid === measureData.uuid
    );
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
      summary: $localize`Success`,
      detail: $localize`Data saved successfully`
    });
  }

  onImportStationData() {
    // TODO: Implement station data import functionality
    console.log('Import station data');
  }
}
