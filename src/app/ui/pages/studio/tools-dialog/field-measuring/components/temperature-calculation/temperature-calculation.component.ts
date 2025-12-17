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
import { FieldMeasureData } from '@src/app/ui/pages/studio/tools-dialog/field-measuring/types';
import { WorkerPythonService } from '@src/app/core/services/worker_python/worker-python.service';

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
    trigger('expandCollapse', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        style({ overflow: 'hidden' }),
        animate('300ms ease-in', style({ height: 0, opacity: 0 }))
      ])
    ])
  ]
})
export class TemperatureCalculationComponent {
  cableOptions = input.required<{ label: string; value: string }[]>();
  windDirectionOptions = input.required<{ label: string; value: string }[]>();
  skyCoverOptions = input.required<{ label: string; value: string }[]>();
  measureData = model.required<FieldMeasureData>();

  temperatureResult = signal<{
    cableSolarFlux: number;
    cableTemperature: number;
    cableTemperatureUncertainty: number;
  } | null>(null);

  temperatureError = signal<boolean>(false);

  solarFluxMode: 'skyCover' | 'fieldSurvey' = 'skyCover';

  readonly windSpeedUnitOptions = [
    { label: '(m/s)', value: 'ms' as const },
    { label: '(km/h)', value: 'kmh' as const }
  ];

  readonly windIncidenceModeOptions = [
    { label: $localize`Auto`, value: 'auto' },
    { label: $localize`Perpendicular`, value: 'perpendicular' }
  ];

  constructor(private readonly workerPythonService: WorkerPythonService) {}

  isFormValid = computed(() => {
    // const data = this.measureData();
    return true;
  });

  updateField<K extends keyof FieldMeasureData>(
    field: K,
    value: FieldMeasureData[K]
  ) {
    this.measureData.update((d) => ({ ...d, [field]: value }));
  }

  updateSolarFluxMode(mode: 'skyCover' | 'fieldSurvey') {
    this.solarFluxMode = mode;
  }

  async calculateTemperature() {
    // const data = this.measureData();
    // TODO: Implement actual temperature calculation when Task is available
    // For now, this is a placeholder
    // const { result, error } = await this.workerPythonService.runTask(
    //   Task.calculateTemperature,
    //   {
    //     cableName: data.cableName,
    //     ambientTemperature: data.ambientTemperature || 0,
    //     longitude: data.longitude || 0,
    //     latitude: data.latitude || 0,
    //     transit: data.transit,
    //     azimuth: data.azimuth || 0,
    //     windSpeed: data.windSpeed || 0,
    //     windSpeedUnit: data.windSpeedUnit,
    //     windDirection: data.windDirection,
    //     windIncidence: data.windIncidence || 0,
    //     windIncidenceMode: data.windIncidenceMode,
    //     skyCover: data.skyCover,
    //     diffusedSolarFlux: data.diffusedSolarFlux
    //   }
    // );
    // if (error) {
    //   this.temperatureError.set(true);
    //   return;
    // }
    // this.temperatureResult.set(result);

    // Placeholder result for UI testing
    this.temperatureResult.set({
      cableSolarFlux: 123,
      cableTemperature: 123,
      cableTemperatureUncertainty: 123
    });
  }
}
