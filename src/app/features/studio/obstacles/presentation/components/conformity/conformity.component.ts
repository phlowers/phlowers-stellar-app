import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputText } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ObstacleFormService } from '@services/obstacles-form/obstaclesForm.service';
import { truncateTwoDecimals } from '@shared/helpers/truncateDecimals';
import { CONFORMITY_BOUNDS } from './conformity.constantes';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';

@Component({
  selector: 'app-conformity',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    SelectModule,
    CheckboxModule,
    MultiSelectModule,
    InputText,
    MessageModule,
    ButtonComponent
  ],
  templateUrl: './conformity.component.html',
  styleUrl: './conformity.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConformityComponent {
  private readonly fb = inject(FormBuilder);
  readonly obstacleFormService = inject(ObstacleFormService);
  private readonly spanService = inject(PlotSpanService);

  readonly form = this.fb.group({
    selectedPoint: [null as number | null],
    windZone: [null as string | null],
    windMinus: [false],
    redZonePresence: [false],
    distributedTemperature: [null as number | null, [Validators.required, Validators.min(CONFORMITY_BOUNDS.distributedTemperature.min), Validators.max(CONFORMITY_BOUNDS.distributedTemperature.max)]],
    lateralDistanceTemperature: [null as number | null, [Validators.required, Validators.min(CONFORMITY_BOUNDS.lateralDistanceTemperature.min), Validators.max(CONFORMITY_BOUNDS.lateralDistanceTemperature.max)]],
    conformity: [null as string[] | null, Validators.required]
  });

  private readonly selectedPointValue = toSignal(this.form.controls.selectedPoint.valueChanges, {
    initialValue: null as number | null
  });

  private readonly formStatus = toSignal(
    this.form.statusChanges.pipe(startWith(this.form.status)),
    { initialValue: this.form.status }
  );

  readonly obstacleData = computed(() => this.obstacleFormService.formValue());

  readonly positions = computed(() => this.obstacleFormService.formValue().positions ?? []);

  readonly hasMultiplePoints = computed(() => this.positions().length > 1);

  readonly pointOptions = computed(() =>
    this.positions().map((_, i) => ({ label: $localize`Point ${i + 1}`, value: i }))
  );

  readonly activePoint = computed(() => {
    const positions = this.positions();
    if (!positions.length) return null;
    if (!this.hasMultiplePoints()) return positions[0] ?? null;
    const index = this.selectedPointValue();
    return index === null ? null : (positions[index] ?? null);
  });

  readonly spanLabel = computed(() => {
    const supportUuid = this.obstacleData().supportUuid;
    if (!supportUuid) return '-';
    return this.spanService.getSpanOptions().find((o) => o.value === supportUuid)?.label ?? '-';
  });

  readonly electricTensionLabel = computed(() => {
    const voltage = this.spanService.section()?.voltage_idr;
    return voltage ?? '-';
  });

  private readonly altitudeTypeLabels: Record<string, string> = {
    absolute: $localize`Absolute (NGF)`,
    relative: $localize`Relative to support`,
    relative_cable: $localize`Relative to cable attachment`
  };

  private readonly lateralDistanceTypeLabels: Record<string, string> = {
    SPAN_AXIS: $localize`Span axis`
  };

  readonly altitudeTypeLabel = computed(() => {
    const type = this.obstacleData().altitudeType;
    return type ? (this.altitudeTypeLabels[type] ?? type) : '-';
  });

  readonly lateralDistanceTypeLabel = computed(() => {
    const type = this.obstacleData().lateralDistanceType;
    return type ? (this.lateralDistanceTypeLabels[type] ?? type) : '-';
  });

  readonly referenceSupportLabel = computed(() => {
    const ref = this.obstacleData().referenceSupport;
    if (!ref) return '-';
    return this.obstacleFormService.supportsOptions().find((o) => o.value === ref)?.label ?? ref;
  });

  readonly BOUNDS = CONFORMITY_BOUNDS;
  readonly truncateTwoDecimals = truncateTwoDecimals;

  private readonly distributedTemperatureErrors = toSignal(
    this.form.controls.distributedTemperature.valueChanges.pipe(
      startWith(this.form.controls.distributedTemperature.value),
      map(() => this.form.controls.distributedTemperature.errors)
    )
  );

  private readonly lateralDistanceTemperatureErrors = toSignal(
    this.form.controls.lateralDistanceTemperature.valueChanges.pipe(
      startWith(this.form.controls.lateralDistanceTemperature.value),
      map(() => this.form.controls.lateralDistanceTemperature.errors)
    )
  );

  readonly distributedTemperatureErrorId = computed(() => {
    const errors = this.distributedTemperatureErrors();
    if (errors?.['min']) return 'distributed-temperature-min-error';
    if (errors?.['max']) return 'distributed-temperature-max-error';
    return null;
  });

  readonly lateralDistanceTemperatureErrorId = computed(() => {
    const errors = this.lateralDistanceTemperatureErrors();
    if (errors?.['min']) return 'lateral-distance-temperature-min-error';
    if (errors?.['max']) return 'lateral-distance-temperature-max-error';
    return null;
  });

  // Placeholder option arrays — will be replaced with dynamic data after rebase
  readonly windZoneOptions: { label: string; value: string }[] = [];
  readonly conformityOptions: { label: string; value: string }[] = [];

  readonly canCalculate = computed(() => {
    if (this.formStatus() !== 'VALID') return false;
    return !this.hasMultiplePoints() || this.selectedPointValue() !== null;
  });
}
