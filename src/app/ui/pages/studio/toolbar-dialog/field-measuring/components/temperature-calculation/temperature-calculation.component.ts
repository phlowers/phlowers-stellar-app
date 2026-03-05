import { Component, input, model, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { SelectButtonModule } from 'primeng/selectbutton';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MessageModule } from 'primeng/message';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { FieldMeasure } from '@ui/pages/studio/toolbar-dialog/field-measuring/types';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { WIND_SPEED_UNIT_OPTIONS, TRANSIT_BOUNDS } from '../../constants';
import { Task } from '@services/worker_python/tasks/types';
import { DecimalPipe } from '@angular/common';
@Component({
  selector: 'app-temperature-calculation',
  imports: [
    NgClass,
    FormsModule,
    SelectModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    SelectButtonModule,
    RadioButtonModule,
    MessageModule,
    IconComponent,
    ButtonComponent,
    DecimalPipe
  ],
  templateUrl: './temperature-calculation.component.html',
  styleUrl: './temperature-calculation.component.scss',
  animations: [
    trigger('expand', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ])
    ])
  ]
})
/** Component for computing cable temperature based on environmental conditions and transit data. */
export class TemperatureCalculationComponent {
  /** Available wind direction options. */
  windDirectionOptions = input.required<{ label: string; value: string }[]>();
  /** Available sky cover options. */
  skyCoverOptions = input.required<{ label: string; value: string }[]>();
  /** Field measure data model bound two-way. */
  measureData = model.required<FieldMeasure>();

  temperatureCalculationError = signal<boolean>(false);

  readonly transitBounds = TRANSIT_BOUNDS;

  readonly windSpeedUnitOptions = WIND_SPEED_UNIT_OPTIONS;

  readonly windIncidenceModeOptions = [
    { label: $localize`Auto`, value: 'auto', disabled: true },
    { label: $localize`Perpendicular`, value: 'perpendicular' }
  ];

  constructor(private readonly workerPythonService: WorkerPythonService) {}

  isTransitOutOfBounds = computed(() => {
    const transit = this.measureData().transit;
    return transit !== null && (transit < this.transitBounds.min || transit > this.transitBounds.max);
  });

  isFormValid = computed(() => {
    const data = this.measureData();
    return data.cableName !== null && data.transit !== null && data.skyCover !== null && !this.isTransitOutOfBounds();
  });

  localizedWindDirection = computed(() => {
    const windDirection = this.measureData().windDirection;
    const option = this.windDirectionOptions().find((opt) => opt.value === windDirection);
    return option?.label ?? windDirection;
  });

  updateField<K extends keyof FieldMeasure>(field: K, value: FieldMeasure[K]) {
    this.measureData.update((d) => ({ ...d, [field]: value }));
  }

  async calculateTemperature() {
    const data = this.measureData();
    this.temperatureCalculationError.set(false);
    this.measureData.update((d) => ({
      ...d,
      outputs: { ...d.outputs, cableTemperature: null }
    }));
    const { result, error } = await this.workerPythonService.runTask(Task.temperatureCalculation, {
      cableName: data.cableName!,
      ambientTemperature: data.ambientTemperature || 0,
      longitude: data.longitude || 0,
      latitude: data.latitude || 0,
      altitude: data.altitude ?? 0,
      azimuth: data.azimuth ?? 0,
      transit: data.transit!,
      date: data.date ?? null,
      time: data.time ?? null,
      windSpeed: data.windSpeed ?? 0,
      windSpeedUnit: data.windSpeedUnit ?? 'kmh',
      windDirection: data.windDirection ?? 'North',
      skyCover: data.skyCover ?? ''
    });
    if (error) {
      this.temperatureCalculationError.set(true);
      return;
    }
    this.measureData.update((d) => ({
      ...d,
      outputs: { ...d.outputs, cableTemperature: result }
    }));
  }
}
