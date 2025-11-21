import {
  Component,
  signal,
  effect,
  inject,
  ViewChild,
  TemplateRef,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { TabsModule } from 'primeng/tabs';
import { HeaderComponent } from './components/header/header.component';
import { CalculationResults, TerrainMeasureData } from './types';
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

@Component({
  selector: 'app-field-measuring-tool',
  imports: [
    DialogModule,
    ButtonComponent,
    IconComponent,
    TabsModule,
    HeaderComponent
  ],
  templateUrl: './field-measuring.component.html',
  styleUrls: ['./field-measuring.component.scss']
})
export class FieldMeasuringComponent implements AfterViewInit, OnDestroy {
  @ViewChild('header', { static: false }) headerTemplate!: TemplateRef<unknown>;
  @ViewChild('footer', { static: false }) footerTemplate!: TemplateRef<unknown>;

  private readonly toolsDialogService = inject(ToolsDialogService);

  ngAfterViewInit(): void {
    this.toolsDialogService.setTemplates({
      header: this.headerTemplate,
      footer: this.footerTemplate
    });
  }

  measureData = signal<TerrainMeasureData>(INITIAL_MEASURE_DATA);

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

  constructor() {
    effect(() => {
      if (this.toolsDialogService.isOpen()) {
        // Initialize or reset data when dialog opens
      }
    });
  }

  ngOnDestroy(): void {
    this.toolsDialogService.setTemplates({});
  }

  onVisibleChange(visible: boolean) {
    if (!visible) {
      this.toolsDialogService.closeTool();
    }
  }

  onFieldChange(
    field: keyof TerrainMeasureData,
    value: TerrainMeasureData[keyof TerrainMeasureData]
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

  onCreateInitialCondition(type: 'minus' | 'nominal' | 'plus') {
    // TODO: Implement create initial condition functionality
    console.log('Create initial condition:', type);
  }
}
