import { ChangeDetectionStrategy, Component, inject, input, model, signal, computed, effect } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgClass, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { SelectButtonModule } from 'primeng/selectbutton';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MessageModule } from 'primeng/message';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { WIND_SPEED_UNIT_OPTIONS, TRANSIT_BOUNDS } from '../../constants';
import { Task } from '@services/worker_python/tasks/types';
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
    ProgressSpinnerModule,
    IconComponent,
    ButtonComponent,
    DecimalPipe
  ],
  templateUrl: './temperature-calculation.component.html',
  styleUrl: './temperature-calculation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  readonly isCalculating = signal(false);

  readonly transitBounds = TRANSIT_BOUNDS;

  readonly windSpeedUnitOptions = WIND_SPEED_UNIT_OPTIONS;

  readonly windIncidenceModeOptions = [
    { label: $localize`Auto`, value: 'auto' },
    { label: $localize`Perpendicular`, value: 'perpendicular' }
  ];

  private readonly workerPythonService = inject(WorkerPythonService);
  private readonly workerReady = toSignal(this.workerPythonService.ready$, { initialValue: false });

  readonly isWindIncidenceLoading = computed(() => !this.workerReady());

  readonly windIncidenceDisplayState = computed((): 'perpendicular' | 'missing-inputs' | 'loading' | 'value' => {
    const { windIncidenceMode, windDirection, azimuth, windIncidence } = this.measureData();
    if (windIncidenceMode !== 'auto') return 'perpendicular';
    if (windDirection === null || windDirection === undefined || azimuth === null || azimuth === undefined)
      return 'missing-inputs';
    if (this.isWindIncidenceLoading() || windIncidence === null) return 'loading';
    return 'value';
  });

  private readonly lastWindIncidenceInput = signal<{ azimuth: number; windDirection: string } | null>(null);

  private readonly windIncidenceEffect = effect(() => {
    const isWorkerReady = this.workerReady();
    const { azimuth, windDirection } = this.measureData();

    if (
      !isWorkerReady ||
      azimuth === null ||
      azimuth === undefined ||
      windDirection === null ||
      windDirection === undefined
    ) {
      this.lastWindIncidenceInput.set(null);
      return;
    }

    const lastInput = this.lastWindIncidenceInput();
    const hasSameInput =
      lastInput !== null && lastInput.azimuth === azimuth && lastInput.windDirection === windDirection;

    if (hasSameInput) {
      return;
    }

    this.lastWindIncidenceInput.set({ azimuth, windDirection });
    void this.computeWindIncidence(azimuth, windDirection);
  });

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

  private async computeWindIncidence(azimuth: number, windDirection: string): Promise<void> {
    const { result, error } = await this.workerPythonService.runTask(Task.getWindIncidence, {
      azimuth,
      windDirection
    });
    if (!error && result !== undefined) {
      this.measureData.update((d) => ({ ...d, windIncidence: Math.round(result.windIncidence) }));
    }
  }

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
    this.isCalculating.set(true);
    try {
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
    } finally {
      this.isCalculating.set(false);
    }
  }

  private async computeDiffuseAndBeamRadiation(): Promise<void> {
    const data = this.measureData();
    const { result, error } = await this.workerPythonService.runTask(Task.diffuseAndBeamRadiationsCalculation, {
      longitude: data.longitude || 0,
      latitude: data.latitude || 0,
      date: data.date ?? null,
      time: data.time ?? null,
      skyCover: data.skyCover ?? ''
    });
    if (!error && result !== undefined) {
      this.measureData.update((d) => ({
        ...d,
        diffusedSolarFlux: result.diffuseRadiation,
        directSolarFlux: result.beamRadiation,
        diffusedPlusDirectSolarFlux: result.diffusePlusBeamRadiation
      }));
    }
  }

  private readonly lastDiffuseAndBeamRadiationInput = signal<{
    longitude: number;
    latitude: number;
    date: Date | null;
    time: Date | null;
    skyCover: string;
  } | null>(null);

  private resetSolarFluxResults(): void {
    const { diffusedSolarFlux, directSolarFlux, diffusedPlusDirectSolarFlux } = this.measureData();
    if (diffusedSolarFlux !== null || directSolarFlux !== null || diffusedPlusDirectSolarFlux != null) {
      this.measureData.update((d) => ({
        ...d,
        diffusedSolarFlux: null,
        directSolarFlux: null,
        diffusedPlusDirectSolarFlux: null
      }));
    }
  }

  private readonly diffuseAndBeamRadiationEffect = effect(() => {
    console.log('diffuseAndBeamRadiationEffect triggered');

    const isWorkerReady = this.workerReady();
    const { longitude, latitude, date, time, skyCover } = this.measureData();

    if (
      !isWorkerReady ||
      longitude === null ||
      longitude === undefined ||
      latitude === null ||
      latitude === undefined ||
      date === null ||
      date === undefined ||
      time === null ||
      time === undefined ||
      skyCover === undefined ||
      skyCover === null
    ) {
      this.lastDiffuseAndBeamRadiationInput.set(null);
      this.resetSolarFluxResults();
      return;
    }

    const lastInput = this.lastDiffuseAndBeamRadiationInput();
    const hasSameInput =
      lastInput !== null &&
      lastInput.longitude === longitude &&
      lastInput.latitude === latitude &&
      lastInput.date === date &&
      lastInput.time === time &&
      lastInput.skyCover === skyCover;

    if (hasSameInput) {
      return;
    }

    this.lastDiffuseAndBeamRadiationInput.set({
      longitude,
      latitude,
      date,
      time,
      skyCover
    });

    void this.computeDiffuseAndBeamRadiation();
  });
}
