import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  OnDestroy,
  signal,
  untracked
} from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { DecimalPipe, DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { from, map, of, startWith, switchMap } from 'rxjs';
import { CatalogObstacleWindZoneEntity } from '@infrastructure/database/entities/catalog-obstacle-wind-zone.entity';
import { ObstacleConformityType } from '@infrastructure/database/entities/catalog-obstacle-configuration.entity';
import { OBSTACLE_CONFORMITY_CONFIG_KEY } from '@infrastructure/database';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputText } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ObstacleFormService } from '@services/obstacles-form/obstaclesForm.service';
import { truncateTwoDecimals } from '@shared/helpers/truncateDecimals';
import {
  ALTITUDE_TYPE_LABELS,
  CONFORMITY_BOUNDS,
  CONFORMITY_CABLE_TRACK_ROWS,
  CONFORMITY_COMMON_ROWS,
  LATERAL_DISTANCE_TYPE_LABELS
} from './conformity.constantes';
import { ConformityOption, ConformityRuleResult } from './conformity.model';
import { ConformityPlotResponse } from './conformity-plot.model';
import { CONFORMITY_PLOT_MOCK } from './conformity-plot.mock';
import { createConformityPlot, CONFORMITY_PLOT_ID, purgeConformityPlot } from './helpers/createConformityPlot';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { StorageService } from '@services/storage/storage.service';
import { NotificationService } from '@services/notification/notification.service';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';

@Component({
  selector: 'app-conformity',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    SelectModule,
    CheckboxModule,
    MultiSelectModule,
    InputText,
    InputGroupModule,
    InputGroupAddonModule,
    MessageModule,
    ButtonComponent,
    DecimalPipe,
    NgTemplateOutlet,
    IconComponent
  ],
  templateUrl: './conformity.component.html',
  styleUrl: './conformity.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('expandHeight', [
      transition(':enter', [
        style({ height: 0, overflow: 'hidden', opacity: 0 }),
        animate('300ms ease-out', style({ height: '*', overflow: 'hidden', opacity: 1 }))
      ])
    ])
  ]
})
export class ConformityComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  readonly obstacleFormService = inject(ObstacleFormService);
  private readonly spanService = inject(PlotSpanService);
  private readonly storageService = inject(StorageService);
  private readonly notificationService = inject(NotificationService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  readonly isOpen = input<boolean>(false);

  readonly isCalculating = signal(false);
  readonly calculationError = signal<string | null>(null);

  private readonly _conformityResults = signal<Record<string, ConformityRuleResult> | null>(null);
  /** Computed results, set only by `calculate`. Null hides the results section. */
  readonly conformityResults = this._conformityResults.asReadonly();

  /** Graph data feeding the `#conformity-plot` cross-section, set alongside the results. */
  private readonly _conformityPlotData = signal<ConformityPlotResponse | null>(null);

  /** Zone color per rule type (from the catalog rule definitions), captured at calculation. */
  private readonly _ruleColorsByType = signal<Record<string, string>>({});

  readonly form = this.fb.group({
    selectedPoint: [null as number | null],
    windZone: [null as string | null],
    windMinus: [false],
    redZonePresence: [false],
    repartitionTemperature: [
      null as number | null,
      [
        Validators.required,
        Validators.min(CONFORMITY_BOUNDS.repartitionTemperature.min),
        Validators.max(CONFORMITY_BOUNDS.repartitionTemperature.max)
      ]
    ],
    lateralDistanceTemperature: [
      null as number | null,
      [
        Validators.required,
        Validators.min(CONFORMITY_BOUNDS.lateralDistanceTemperature.min),
        Validators.max(CONFORMITY_BOUNDS.lateralDistanceTemperature.max)
      ]
    ],
    conformity: this.fb.control<string[] | null>(null, Validators.required)
  });

  /** Single source of truth for the form's value — keeps every derived signal in sync, including
   * after programmatic patches (which is why population uses the default `emitEvent`). */
  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  private readonly formStatus = toSignal(this.form.statusChanges.pipe(startWith(this.form.status)), {
    initialValue: this.form.status
  });

  private readonly selectedPointValue = computed(() => this.formValue().selectedPoint ?? null);
  private readonly redZonePresenceValue = computed(() => this.formValue().redZonePresence ?? false);
  private readonly selectedConformityValues = computed(() => this.formValue().conformity ?? null);

  private readonly obstacleUuid = computed(() => this.obstacleFormService.formValue().uuid ?? null);

  readonly obstacleData = computed(() => {
    const uuid = this.obstacleUuid();
    if (!uuid) return null;
    return this.spanService.section()?.obstacles?.find((o) => o.uuid === uuid) ?? null;
  });

  private readonly obstacleType = computed(() => this.obstacleData()?.type ?? null);

  private readonly savedConformityData = computed(() => this.obstacleData()?.conformityData ?? null);

  readonly showRedZonePresence = toSignal(
    toObservable(this.obstacleType).pipe(
      switchMap((type) => {
        if (!type) return of(false);
        const query = this.storageService.db?.catObstacleConfigurations.where('obstacle_type').equals(type).first();
        return from(query ?? Promise.resolve(null)).pipe(map((config) => config?.red_zone ?? false));
      })
    ),
    { initialValue: false }
  );

  readonly conformityType = toSignal(
    toObservable(this.obstacleType).pipe(
      switchMap((type) => {
        if (!type) return of(null as ObstacleConformityType);
        const query = this.storageService.db?.catObstacleConfigurations.where('obstacle_type').equals(type).first();
        return from(query ?? Promise.resolve(null)).pipe(map((config) => config?.conformity ?? null));
      })
    ),
    { initialValue: null as ObstacleConformityType }
  );

  readonly positions = computed(() => this.obstacleData()?.positions ?? []);

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
    const supportUuid = this.obstacleData()?.supportUuid;
    if (!supportUuid) return '-';
    return this.spanService.getSpanOptions().find((o) => o.value === supportUuid)?.label ?? '-';
  });

  readonly electricTensionLabel = computed(() => {
    const voltage = this.spanService.section()?.voltage_idr;
    return voltage ?? '-';
  });

  readonly altitudeTypeLabel = computed(() => {
    const type = this.obstacleData()?.altitudeType;
    return type ? (ALTITUDE_TYPE_LABELS[type] ?? type) : '-';
  });

  readonly lateralDistanceTypeLabel = computed(() => {
    const type = this.obstacleData()?.lateralDistanceType;
    return type ? (LATERAL_DISTANCE_TYPE_LABELS[type] ?? type) : '-';
  });

  readonly referenceSupportLabel = computed(() => {
    const ref = this.obstacleData()?.referenceSupport;
    if (!ref) return '-';
    return this.obstacleFormService.supportsOptions().find((o) => o.value === ref)?.label ?? ref;
  });

  readonly commonRows = CONFORMITY_COMMON_ROWS;
  readonly cableTrackRows = CONFORMITY_CABLE_TRACK_ROWS;

  readonly BOUNDS = CONFORMITY_BOUNDS;
  readonly truncateTwoDecimals = truncateTwoDecimals;

  readonly repartitionTemperatureErrorId = computed(() => {
    this.formValue();
    const errors = this.form.controls.repartitionTemperature.errors;
    if (errors?.['min']) return 'repartition-temperature-min-error';
    if (errors?.['max']) return 'repartition-temperature-max-error';
    return null;
  });

  readonly lateralDistanceTemperatureErrorId = computed(() => {
    this.formValue();
    const errors = this.form.controls.lateralDistanceTemperature.errors;
    if (errors?.['min']) return 'lateral-distance-temperature-min-error';
    if (errors?.['max']) return 'lateral-distance-temperature-max-error';
    return null;
  });

  private readonly windZones = toSignal(
    from(this.storageService.db?.catObstacleWindZones.toArray() ?? Promise.resolve([])),
    { initialValue: [] as CatalogObstacleWindZoneEntity[] }
  );

  private readonly windZoneDefault = toSignal(
    from(
      this.storageService.db?.catObstacleConformityConfig
        .get(OBSTACLE_CONFORMITY_CONFIG_KEY)
        .then((c) => c?.wind_zone_default ?? null) ?? Promise.resolve(null as string | null)
    ),
    { initialValue: null as string | null }
  );

  private readonly repartitionTemperatureDefault = toSignal(
    from(
      this.storageService.db?.catObstacleConformityConfig
        .get(OBSTACLE_CONFORMITY_CONFIG_KEY)
        .then((c) => c?.repartition_temperature_default ?? null) ?? Promise.resolve(null as number | null)
    ),
    { initialValue: null as number | null }
  );

  private readonly intermediatePointsConfig = toSignal(
    from(
      this.storageService.db?.catObstacleConformityConfig
        .get(OBSTACLE_CONFORMITY_CONFIG_KEY)
        .then((c) => c?.intermediate_point_positions ?? []) ?? Promise.resolve([] as number[])
    ),
    { initialValue: [] as number[] }
  );

  private readonly lateralTemperatureConfig = toSignal(
    from(
      (async (): Promise<{ defaultTemp: number | null; message: string | null; ruleName: string | null }> => {
        const db = this.storageService.db;
        if (!db) return { defaultTemp: null, message: null, ruleName: null };
        const config = await db.catObstacleConformityConfig.get(OBSTACLE_CONFORMITY_CONFIG_KEY);
        const message = config?.lateral_temperature_message ?? null;
        if (!config?.lateral_temperature_rule_type) return { defaultTemp: null, message, ruleName: null };
        const rule = await db.catObstacleRuleDefinitions.get(config.lateral_temperature_rule_type);
        return { defaultTemp: rule?.lateral_point.temperature ?? null, message, ruleName: rule?.rule_name ?? null };
      })()
    ),
    {
      initialValue: { defaultTemp: null, message: null, ruleName: null } as {
        defaultTemp: number | null;
        message: string | null;
        ruleName: string | null;
      }
    }
  );

  readonly lateralTemperatureHint = computed(() => this.lateralTemperatureConfig().message);
  readonly lateralTemperatureRuleName = computed(() => this.lateralTemperatureConfig().ruleName);

  /** Async-loaded default values for the editable form fields. */
  private readonly defaults = computed(() => ({
    windZone: this.windZoneDefault(),
    repartitionTemperature: this.repartitionTemperatureDefault(),
    lateralDistanceTemperature: this.lateralTemperatureConfig().defaultTemp
  }));

  readonly windZoneOptions = computed(() => this.windZones().map((z) => ({ label: z.label, value: z.label })));

  readonly effectiveWindPressure = computed(() => {
    const label = this.formValue().windZone;
    const zone = this.windZones().find((z) => z.label === label);
    if (!zone) return null;
    return this.redZonePresenceValue() ? zone.red_zone : zone.normal;
  });

  readonly conformityOptions = toSignal(
    toObservable(this.obstacleType).pipe(
      switchMap((type) => {
        const db = this.storageService.db;
        if (!type || !db) return of([] as ConformityOption[]);
        return from(db.catObstacleDistances.where('obstacle_type').equals(type).toArray()).pipe(
          switchMap((distances) => {
            const ruleTypes = distances.map((d) => d.rule_type);
            return from(db.catObstacleRuleDefinitions.where('rule_type').anyOf(ruleTypes).toArray()).pipe(
              map((rules) => {
                const nameByType = new Map(rules.map((r) => [r.rule_type, r.rule_name]));
                return distances.map((d) => ({
                  label: nameByType.get(d.rule_type) ?? d.rule_type,
                  value: d.rule_type,
                  active: d.active
                }));
              })
            );
          })
        );
      })
    ),
    { initialValue: [] as ConformityOption[] }
  );

  /** Conformity rules active by default for the current obstacle type. */
  private readonly initialConformity = computed(() =>
    this.conformityOptions()
      .filter((o) => o.active)
      .map((o) => o.value)
  );

  readonly selectedConformityColumns = computed(() => {
    const selected = this.selectedConformityValues();
    if (!selected?.length) return [];
    const opts = this.conformityOptions();
    return selected.map((v) => opts.find((o) => o.value === v)).filter((o): o is ConformityOption => !!o);
  });

  readonly showLateralColumn = computed(() => this.conformityType() !== 'overhang');

  readonly totalColSpan = computed(
    () => 1 + this.selectedConformityColumns().length * (this.showLateralColumn() ? 2 : 1)
  );

  readonly canCalculate = computed(() => {
    if (this.formStatus() !== 'VALID') return false;
    return !this.hasMultiplePoints() || this.selectedPointValue() !== null;
  });

  /** Tracks which obstacle the form was last fully populated for, so async config/options arriving
   * later only fill still-empty fields instead of clobbering user edits. */
  private lastPopulatedUuid: string | null | undefined = undefined;

  /** Populate the form from the saved conformity data (falling back to defaults) when the obstacle
   * changes, and top up still-empty fields as async config/options resolve. */
  private readonly populateForm = effect(() => {
    const uuid = this.obstacleUuid();
    const saved = this.savedConformityData();
    const defaults = this.defaults();
    const conformityFallback = this.initialConformity();

    untracked(() => {
      const isNewObstacle = uuid !== this.lastPopulatedUuid;
      if (isNewObstacle) {
        this.lastPopulatedUuid = uuid;
        this._conformityResults.set(null);
        this._conformityPlotData.set(null);
        this._ruleColorsByType.set({});
      }

      const isEmpty = (value: unknown): boolean =>
        value === null || value === undefined || (Array.isArray(value) && value.length === 0);

      // On a new obstacle: reset every field. Otherwise only fill fields still empty, so
      // late-resolving defaults/options populate without overwriting the user's edits.
      const fill = <T>(control: { value: T; setValue: (value: T) => void }, value: T): void => {
        if (isNewObstacle || isEmpty(control.value)) control.setValue(value);
      };

      const c = this.form.controls;
      fill(c.selectedPoint, saved?.selectedPoint ?? null);
      fill(c.windZone, saved?.windZone ?? defaults.windZone);
      fill(c.repartitionTemperature, saved?.repartitionTemperature ?? defaults.repartitionTemperature);
      fill(c.lateralDistanceTemperature, saved?.lateralDistanceTemperature ?? defaults.lateralDistanceTemperature);
      fill(c.conformity, saved?.conformity ?? conformityFallback);
      if (isNewObstacle) {
        c.windMinus.setValue(saved?.windMinus ?? false);
        c.redZonePresence.setValue(saved?.redZonePresence ?? false);
      }
    });
  });

  /** Clear results when the modal closes so a reopen starts from a clean slate. */
  private readonly clearResultsOnClose = effect(() => {
    if (!this.isOpen())
      untracked(() => {
        this._conformityResults.set(null);
        this._conformityPlotData.set(null);
        this._ruleColorsByType.set({});
      });
  });

  /**
   * Render (or purge) the `#conformity-plot` cross-section. Reacts to the graph data plus the
   * live conformity selection so toggling a rule adds/removes its zone immediately. The plot div
   * lives inside the results `@if`, so defer to `afterNextRender` and re-check its existence.
   */
  private readonly renderPlot = effect(() => {
    const data = this._conformityPlotData();
    const selectedRuleTypes = this.selectedConformityValues() ?? [];
    const ruleColors = this._ruleColorsByType();
    const conformityType = this.conformityType();
    if (!data) {
      untracked(() => purgeConformityPlot(this.document));
      return;
    }
    afterNextRender(
      () => {
        if (this.document.getElementById(CONFORMITY_PLOT_ID)) {
          createConformityPlot(this.document, data, { selectedRuleTypes, ruleColors, conformityType });
        }
      },
      { injector: this.injector }
    );
  });

  /** Auto-display results when reopening a saved conformity whose inputs are all present. */
  private readonly autoCalculate = effect(() => {
    const open = this.isOpen();
    const saved = this.savedConformityData();
    const canCalc = this.canCalculate();
    if (!open || !saved || !canCalc) return;
    untracked(() => {
      if (this._conformityResults() === null && !this.isCalculating()) void this.calculate();
    });
  });

  async saveConformityData(): Promise<void> {
    if (!this.canCalculate()) return;
    const uuid = this.obstacleFormService.form.value.uuid;
    if (!uuid) return;
    const v = this.form.getRawValue();
    await this.obstacleFormService.saveConformityData(uuid, {
      selectedPoint: v.selectedPoint,
      windZone: v.windZone,
      windMinus: v.windMinus ?? false,
      redZonePresence: v.redZonePresence ?? false,
      repartitionTemperature: v.repartitionTemperature,
      lateralDistanceTemperature: v.lateralDistanceTemperature,
      conformity: v.conformity
    });
  }

  async calculate(): Promise<void> {
    if (!this.canCalculate()) return;
    const obstacle = this.obstacleData();
    if (!obstacle) return;
    const v = this.form.getRawValue();
    const point = this.activePoint();
    const db = this.storageService.db;
    const selectedRuleTypes = v.conformity ?? [];
    const obstacleType = obstacle.type ?? '';

    this.isCalculating.set(true);
    this.calculationError.set(null);

    try {
      const [distances, rules] = await Promise.all([
        db && obstacleType
          ? db.catObstacleDistances
              .where('obstacle_type')
              .equals(obstacleType)
              .filter((d) => selectedRuleTypes.includes(d.rule_type))
              .toArray()
          : Promise.resolve([]),
        db && selectedRuleTypes.length
          ? db.catObstacleRuleDefinitions.where('rule_type').anyOf(selectedRuleTypes).toArray()
          : Promise.resolve([])
      ]);

      // TODO: replace with actual Pyodide/Python calculation
      // eslint-disable-next-line no-console
      console.log('--- Conformity calculation inputs ---', {
        obstacle: {
          uuid: obstacle.uuid,
          name: obstacle.name,
          type: obstacle.type,
          supportIndex: obstacle.supportIndex,
          altitudeType: obstacle.altitudeType,
          lateralDistanceType: obstacle.lateralDistanceType,
          referenceSupport: obstacle.referenceSupport,
          allPositions: obstacle.positions,
          activePoint: point
        },
        electricTension: this.spanService.section()?.voltage_idr ?? null,
        form: {
          windZone: v.windZone,
          windPressure: this.effectiveWindPressure(),
          windMinus: v.windMinus,
          redZonePresence: v.redZonePresence,
          repartitionTemperature: v.repartitionTemperature,
          lateralDistanceTemperature: v.lateralDistanceTemperature,
          selectedConformityRules: selectedRuleTypes,
          conformity: v.conformity,
          intermediatePoints: this.intermediatePointsConfig()
        },
        rulesClimaticConditions: rules.map((r) => ({
          ruleType: r.rule_type,
          ruleName: r.rule_name,
          lateralPoint: r.lateral_point,
          overhangPoint: r.overhang_point
        })),
        rulesDistances: distances.map((d) => ({
          ruleType: d.rule_type,
          lateral: d.lateral,
          overhang: d.overhang
        }))
      });

      const isCableTrack = this.conformityType() === 'cable_track';
      const results: Record<string, ConformityRuleResult> = {};
      selectedRuleTypes.forEach((ruleType, index) => {
        results[ruleType] = this.generateMockResult(isCableTrack, index === 0);
      });
      this._conformityResults.set(results);
      this._ruleColorsByType.set(Object.fromEntries(rules.map((r) => [r.rule_type, r.color])));
      this._conformityPlotData.set(CONFORMITY_PLOT_MOCK);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.calculationError.set(errorMessage);
      this.notificationService.error($localize`Calculation failed: ${errorMessage}`);
    } finally {
      this.isCalculating.set(false);
    }
  }

  private generateMockResult(isCableTrack: boolean, conformityCompliance: boolean): ConformityRuleResult {
    const result: ConformityRuleResult = {
      overhangCableAltitude: 42,
      lateralCableAltitude: 38,
      overhangCableLineAxisDistance: 150,
      lateralCableLineAxisDistance: 120,
      overhangDistanceToComply: 5,
      lateralDistanceToComply: 3,
      overhangComplianceAltitude: 7,
      lateralComplianceLineAxisDistance: 4,
      conformityCompliance
    };
    if (isCableTrack) {
      result.overhangTemperature = 15;
      result.lateralTemperature = -5;
      result.overhangWindPressure = 500;
      result.lateralWindPressure = 450;
      result.overhangMinimalDistance = 6;
      result.lateralMinimalDistance = 4;
    }
    return result;
  }

  ngOnDestroy(): void {
    purgeConformityPlot(this.document);
  }

  /** Single accessor for any overhang/lateral result field, replacing the four per-section getters. */
  getValue(ruleValue: string, key: keyof ConformityRuleResult | null): number | null {
    if (!key) return null;
    const value = this._conformityResults()?.[ruleValue]?.[key];
    return typeof value === 'number' ? value : null;
  }

  getConformityCompliance(ruleValue: string): boolean | null {
    return this._conformityResults()?.[ruleValue]?.conformityCompliance ?? null;
  }
}
