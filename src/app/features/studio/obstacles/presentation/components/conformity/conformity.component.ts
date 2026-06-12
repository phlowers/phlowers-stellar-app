import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { from, map, of, startWith, switchMap } from 'rxjs';
import { CatalogObstacleWindZoneEntity } from '@infrastructure/database/entities/catalog-obstacle-wind-zone.entity';
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
import { StorageService } from '@services/storage/storage.service';

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
  private readonly storageService = inject(StorageService);

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

  private readonly obstacleType = computed(() => this.obstacleData().type ?? null);

  readonly showRedZonePresence = toSignal(
    toObservable(this.obstacleType).pipe(
      switchMap((type) => {
        if (!type) return of(false);
        const query = this.storageService.db?.catObstacleConfigurations
          .where('obstacle_type')
          .equals(type)
          .first();
        if (!query) return of(false);
        return from(query).pipe(map((config) => config?.red_zone ?? false));
      })
    ),
    { initialValue: false }
  );

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

  private readonly windZones = toSignal(
    from(this.storageService.db?.catObstacleWindZones.toArray() ?? Promise.resolve([])),
    { initialValue: [] as CatalogObstacleWindZoneEntity[] }
  );

  private readonly redZonePresenceValue = toSignal(
    this.form.controls.redZonePresence.valueChanges.pipe(
      startWith(this.form.controls.redZonePresence.value)
    ),
    { initialValue: false }
  );

  readonly windZoneOptions = computed(() =>
    this.windZones().map((z) => ({ label: z.label, value: z.label }))
  );

  readonly effectiveWindPressure = computed(() => {
    const label = this.form.controls.windZone.value;
    const zone = this.windZones().find((z) => z.label === label);
    if (!zone) return null;
    return this.redZonePresenceValue() ? zone.red_zone : zone.normal;
  });

  readonly conformityOptions = toSignal(
    toObservable(this.obstacleType).pipe(
      switchMap((type) => {
        const db = this.storageService.db;
        if (!type || !db) return of([] as { label: string; value: string }[]);
        return from(db.catObstacleDistances.where('obstacle_type').equals(type).filter((d) => d.active).toArray()).pipe(
          switchMap((distances) => {
            const ruleTypes = distances.map((d) => d.rule_type);
            return from(db.catObstacleRuleDefinitions.where('rule_type').anyOf(ruleTypes).toArray()).pipe(
              map((rules) => {
                const nameByType = new Map(rules.map((r) => [r.rule_type, r.rule_name]));
                return distances.map((d) => ({ label: nameByType.get(d.rule_type) ?? d.rule_type, value: d.rule_type }));
              })
            );
          })
        );
      })
    ),
    { initialValue: [] as { label: string; value: string }[] }
  );

  readonly canCalculate = computed(() => {
    if (this.formStatus() !== 'VALID') return false;
    return !this.hasMultiplePoints() || this.selectedPointValue() !== null;
  });

  async saveConformityData(): Promise<void> {
    if (!this.canCalculate()) return;
    const uuid = this.obstacleFormService.form.value.uuid;
    if (!uuid) return;
    const v = this.form.value;
    await this.obstacleFormService.saveConformityData(uuid, {
      windZone: v.windZone ?? null,
      windMinus: v.windMinus ?? false,
      redZonePresence: v.redZonePresence ?? false,
      distributedTemperature: v.distributedTemperature ?? null,
      lateralDistanceTemperature: v.lateralDistanceTemperature ?? null,
      conformity: (v.conformity as string[] | null) ?? null
    });
  }
}
