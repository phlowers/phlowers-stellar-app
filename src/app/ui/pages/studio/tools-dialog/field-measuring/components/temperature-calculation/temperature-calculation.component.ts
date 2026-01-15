import { Component, input, model, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { SelectButtonModule } from 'primeng/selectbutton';
import { RadioButtonModule } from 'primeng/radiobutton';
import { IconComponent } from '@src/app/ui/shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@src/app/ui/shared/components/atoms/button/button.component';
import { FieldMeasure } from '@ui/pages/studio/tools-dialog/field-measuring/types';
import { WorkerPythonService } from '@src/app/core/services/worker_python/worker-python.service';
import { WIND_SPEED_UNIT_OPTIONS } from '../../constants';
import { Task } from '@core/services/worker_python/tasks/types';

@Component({
  selector: 'app-temperature-calculation',
  imports: [
    FormsModule,
    SelectModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    SelectButtonModule,
    RadioButtonModule,
    IconComponent,
    ButtonComponent
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
export class TemperatureCalculationComponent {
  windDirectionOptions = input.required<{ label: string; value: string }[]>();
  skyCoverOptions = input.required<{ label: string; value: string }[]>();
  measureData = model.required<FieldMeasure>();

  temperatureCalculationError = signal<boolean>(false);

  readonly windSpeedUnitOptions = WIND_SPEED_UNIT_OPTIONS;

  readonly windIncidenceModeOptions = [
    { label: $localize`Auto`, value: 'auto' },
    { label: $localize`Perpendicular`, value: 'perpendicular' }
  ];

  constructor(private readonly workerPythonService: WorkerPythonService) {}

  isFormValid = computed(() => {
    const data = this.measureData();
    return (
      data.cableName !== null && data.transit !== null && data.skyCover !== null
    );
  });

  localizedWindDirection = computed(() => {
    const windDirection = this.measureData().windDirection;
    const option = this.windDirectionOptions().find(
      (opt) => opt.value === windDirection
    );
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
    const { result, error } = await this.workerPythonService.runTask(
      Task.temperatureCalculation,
      {
        cableName: data.cableName!,
        ambientTemperature: data.ambientTemperature || 0,
        longitude: data.longitude || 0,
        latitude: data.latitude || 0,
        transit: data.transit!,
        skyCover: data.skyCover!
      }
    );
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
