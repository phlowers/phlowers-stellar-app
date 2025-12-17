import {
  Component,
  signal,
  effect,
  inject,
  ViewChild,
  TemplateRef,
  AfterViewInit,
  OnDestroy,
  untracked,
  input
} from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { TabsModule } from 'primeng/tabs';
import { HeaderComponent } from './components/header/header.component';
import { CalculationResults, FieldMeasureData } from './types';
import { ToolsDialogService } from '../tools-dialog.service';
import {
  SPAN_OPTIONS,
  WIND_DIRECTION_OPTIONS,
  SKY_COVER_OPTIONS,
  LEFT_SUPPORT_OPTIONS,
  CABLE_OPTIONS,
  SelectOption
} from './constants';
import { INITIAL_MEASURE_DATA, INITIAL_CALCULATION_RESULTS } from './mock-data';
import { FieldDatasComponent } from './components/field-datas/field-datas.component';
import { CalculusSettingComponent } from './components/calculus-setting/calculus-setting.component';
import { PlotService } from '@ui/pages/studio/services/plot.service';
import { TemperatureCalculationComponent } from './components/temperature-calculation/temperature-calculation.component';
import { Study } from '@src/app/core/data/database/interfaces/study';
import { Section } from '@src/app/core/data/database/interfaces/section';
import { SectionService } from '@src/app/core/services/sections/section.service';
import { StudiesService } from '@src/app/core/services/studies/studies.service';
import { InitialCondition } from '@src/app/core/data/database/interfaces/initialCondition';
import { ParameterCalculation15WithoutWindComponent } from './components/parameter-calculation-15-without-wind/parameter-calculation-15-without-wind.component';

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
  private readonly plotService = inject(PlotService);
  section = input.required<Section>();
  study = input.required<Study>();
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

  measureData = signal<FieldMeasureData>(INITIAL_MEASURE_DATA);

  activeTab = signal<
    | 'terrainData'
    | 'parameterCalculation'
    | 'temperatureCalculation'
    | 'parameterAt15CWithoutWind'
  >('terrainData');

  readonly spanOptions = signal<SelectOption[]>(SPAN_OPTIONS);
  readonly windDirectionOptions = signal<SelectOption[]>(
    WIND_DIRECTION_OPTIONS
  );
  readonly skyCoverOptions = signal<SelectOption[]>(SKY_COVER_OPTIONS);
  readonly leftSupportOptions = signal<SelectOption[]>(LEFT_SUPPORT_OPTIONS);
  readonly cableOptions = signal<SelectOption[]>(CABLE_OPTIONS);

  calculationResults = signal<CalculationResults>(INITIAL_CALCULATION_RESULTS);

  constructor(
    public readonly sectionService: SectionService,
    public readonly studiesService: StudiesService
  ) {
    effect(() => {
      if (this.toolsDialogService.isMainOpen()) {
        // Initialize data from PlotService when dialog opens
        this.initializeMeasureData();
      }
    });
  }

  ngOnDestroy(): void {
    this.toolsDialogService.setTemplates({});
  }

  private initializeMeasureData(): void {
    const section = this.plotService.section();

    if (!section) {
      console.warn('No section available');
      return;
    }

    this.measureData.set({
      ...untracked(() => this.measureData()),
      line: section.cable_name || '',
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

  onFieldChange(
    field: keyof FieldMeasureData,
    value: FieldMeasureData[keyof FieldMeasureData]
  ) {
    this.measureData.set({
      ...this.measureData(),
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

  onSave() {
    // TODO: Implement save functionality
    console.log('Save', this.measureData());
    this.toolsDialogService.closeTool();
  }

  onImportStationData() {
    // TODO: Implement station data import functionality
    console.log('Import station data');
  }

  onCalculate() {
    // TODO: Implement parameter calculation
    // For now, set mock results
    this.calculationResults.set({
      parameter: 123,
      parameterUncertainty: 123,
      parameter12: 123,
      parameter23: 123,
      parameter13: 123,
      criteria05: true,
      sideDGreaterThan2m: 123,
      sideDValid: true,
      validMeasurement: true,
      cableTemperature: 123,
      cableTemperatureUncertainty: 3,
      cableSolarFlux: 205,
      parameter15CMinusUncertainty: null,
      parameter15C: null,
      parameter15CPlusUncertainty: null
    });
    console.log('Calculate', this.measureData());
  }

  onCalculateParameter15C() {
    // TODO: Implement parameter at 15°C calculation
    // For now, set mock results based on the image
    this.calculationResults.set({
      ...this.calculationResults(),
      parameter15CMinusUncertainty: 1885,
      parameter15C: 1900,
      parameter15CPlusUncertainty: 1900
    });
    console.log('Calculate Parameter at 15°C', this.measureData());
  }
}
