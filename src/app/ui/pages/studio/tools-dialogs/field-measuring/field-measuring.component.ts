import { Component, output, signal, effect } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { TabsModule } from 'primeng/tabs';
import { HeaderInfoComponent } from './components/header-info/header-info.component';
import { LocationFieldsComponent } from './components/location-fields/location-fields.component';
import { CalculationResults, TerrainMeasureData } from './types';

@Component({
  selector: 'app-field-measuring-tool',
  imports: [
    DialogModule,
    ButtonComponent,
    IconComponent,
    TabsModule,
    HeaderInfoComponent,
    LocationFieldsComponent
  ],
  templateUrl: './field-measuring.component.html',
  styleUrls: ['./field-measuring.component.scss']
})
export class FieldMeasuringComponent {
  isOpen = signal<boolean>(true);
  isOpenChange = output<boolean>();

  measureData = signal<TerrainMeasureData>({
    line: 'Line 225kV Rougemontier - Tourbe #1',
    voltage: 123,
    spanType: 'Phase',
    phaseNumber: 3,
    numberOfConductors: 3,
    span: '12-13',
    longitude: 123.12345678,
    latitude: 123.87654321,
    altitude: 123.09876523,
    azimuth: 123,
    date: new Date(),
    time: '10:13',
    season: 'summer',
    ambientTemperature: null,
    windSpeed: null,
    windSpeedUnit: 'kmh',
    windDirection: 'North',
    skyCover: '8 (cloudy)',
    calculationMethod: 'papoto',
    leftSupport: '',
    spanLength: null,
    measuredElevationDifference: null,
    HG: null,
    H1: null,
    H2: null,
    H3: null,
    HD: null,
    VG: null,
    V1: null,
    V2: null,
    V3: null,
    VD: null,
    cableHAccDistance: null,
    cableVerticalAccAngle: null,
    calculationType: 'parametre',
    cableTangentAngle: null,
    lengthBetweenSightGD: null,
    elevationDifferenceBetweenSightGD: null,
    xSight1: null,
    xSight2: null,
    xSight3: null,
    ySight1: null,
    ySight2: null,
    ySight3: null,
    cableName: 'ASTER570',
    transit: 'A',
    windIncidence: 47,
    windIncidenceMode: 'auto',
    diffuseSolarFlux: 123,
    directSolarFlux: 123,
    diffuseDirectSolarFlux: 246,
    measuredSolarFlux: 248,
    updateMode15C: 'auto',
    parameterFapolo: 1700,
    parameterUncertaintyFapolo: 12,
    cableTemperature15C: 45,
    cableTemperatureUncertainty15C: 3
  });

  activeTab = signal<
    | 'terrainData'
    | 'parameterCalculation'
    | 'temperatureCalculation'
    | 'parameterAt15CWithoutWind'
  >('terrainData');

  spanOptions = signal<{ label: string; value: string }[]>([
    { label: '12-13', value: '12-13' },
    { label: '13-14', value: '13-14' },
    { label: '14-15', value: '14-15' }
  ]);

  windDirectionOptions = signal<{ label: string; value: string }[]>([
    { label: 'North', value: 'North' },
    { label: 'North-East', value: 'North-East' },
    { label: 'East', value: 'East' },
    { label: 'South-East', value: 'South-East' },
    { label: 'South', value: 'South' },
    { label: 'South-West', value: 'South-West' },
    { label: 'West', value: 'West' },
    { label: 'North-West', value: 'North-West' }
  ]);

  skyCoverOptions = signal<{ label: string; value: string }[]>([
    { label: '0 (clear)', value: '0 (clear)' },
    { label: '4 (partly cloudy)', value: '4 (partly cloudy)' },
    { label: '8 (cloudy)', value: '8 (cloudy)' }
  ]);

  leftSupportOptions = signal<{ label: string; value: string }[]>([
    { label: 'Support 1', value: 'support1' },
    { label: 'Support 2', value: 'support2' },
    { label: 'Support 3', value: 'support3' }
  ]);

  cableOptions = signal<{ label: string; value: string }[]>([
    { label: 'ASTER570', value: 'ASTER570' },
    { label: 'ASTER490', value: 'ASTER490' },
    { label: 'ASTER380', value: 'ASTER380' }
  ]);

  calculationResults = signal<CalculationResults>({
    parameter: null,
    parameterUncertainty: null,
    parameter12: null,
    parameter23: null,
    parameter13: null,
    criteria05: null,
    sideDGreaterThan2m: null,
    sideDValid: null,
    validMeasurement: null,
    cableTemperature: null,
    cableTemperatureUncertainty: null,
    cableSolarFlux: null,
    parameter15CMinusUncertainty: null,
    parameter15C: null,
    parameter15CPlusUncertainty: null
  });

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        // Initialize or reset data when dialog opens
      }
    });
  }

  onVisibleChange(visible: boolean) {
    if (!visible) {
      this.isOpenChange.emit(false);
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
    this.isOpenChange.emit(false);
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

  closeModal() {
    this.isOpen.set(false);
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
