import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputText } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { AnchoringType, CableManipMethod, CableManipType } from '@shared/domain';
import { CableSpanManipService } from '../../services/cableSpanManip.service';
import { CABLE_SPAN_MANIP_DEFAULTS, CableSpanManipFormControls } from './cable-span-manip.interfaces';
import { twoDecimalValidator } from '@shared/helpers/numberValidators';
import { getControlErrorIds } from '@shared/helpers/formErrors.helpers';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-cable-span-manip',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputText,
    InputGroupModule,
    InputGroupAddonModule,
    SelectModule,
    MessageModule,
    ButtonComponent,
    IconComponent,
    TranslocoModule
  ],
  templateUrl: './cable-span-manip.html',
  styleUrl: './cable-span-manip.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Component for configuring cable span manipulations (crane or temporary support) on a span. */
export class CableSpanManipComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly plotService = inject(PlotService);
  private readonly spanService = inject(PlotSpanService);
  private readonly cableSpanManipService = inject(CableSpanManipService);
  private readonly chainsService = inject(ChainsService);
  private readonly translocoService = inject(TranslocoService);

  readonly isLoading = signal(false);
  readonly isCalculating = computed(() => this.plotService.loading());
  /** Whether the form has been modified since the last save. */
  readonly isDirtySinceLastSave = signal(false);
  /** Whether a saved manipulation exists for the currently selected span. */
  readonly hasSavedManipulation = signal(false);

  readonly form = this.fb.group<CableSpanManipFormControls>({
    scope: new FormControl<string | null>(null, { validators: [Validators.required] }),
    referenceSupport: new FormControl<'LEFT' | 'RIGHT' | null>(
      { value: null, disabled: true },
      { validators: [Validators.required] }
    ),
    distanceToRefSupport: new FormControl<number | null>(0),
    cableManipType: new FormControl<CableManipType | null>({ value: 'with_a_crane', disabled: true }),
    cableManipMethod: new FormControl<CableManipMethod | null>({ value: 'clamp', disabled: true }),
    longitudinalDistance: new FormControl<number | null>(0),
    lateralDistance: new FormControl<number | null>(0, {
      validators: [Validators.required, Validators.min(-100), Validators.max(100), twoDecimalValidator]
    }),
    altitude: new FormControl<number | null>(0, {
      validators: [Validators.required, Validators.min(-100), Validators.max(9000), twoDecimalValidator]
    }),
    anchoring: new FormControl<AnchoringType | null>({ value: 'with_sling', disabled: true }),
    chainName: new FormControl<string | null>(null),
    chainLength: new FormControl<number | null>(null),
    chainWeight: new FormControl<number | null>(null),
    chainSurface: new FormControl<number | null>(null),
    counterWeight: new FormControl<number | null>(null),
    slingLength: new FormControl<number | null>(5)
  });

  private readonly scopeValueSignal = toSignal(this.form.controls.scope.valueChanges, {
    initialValue: this.form.controls.scope.value
  });
  readonly scopeValue = computed(() => this.scopeValueSignal());

  /** Support data for the currently selected span's left support, reactive to section changes. */
  private readonly selectedSupportData = computed(() => {
    const uuid = this.scopeValueSignal();
    if (!uuid) return null;
    return this.spanService.section()?.supports?.find((s) => s.uuid === uuid) ?? null;
  });

  /** Dynamic min for distanceToRefSupport — reactive to section and scope changes. */
  readonly distRefSupportMin = computed(() => -Math.abs(this.selectedSupportData()?.armLength ?? 0));
  /** Dynamic max for distanceToRefSupport — reactive to section and scope changes. */
  readonly distRefSupportMax = computed(() => {
    const support = this.selectedSupportData();
    return (support?.spanLength ?? 0) + Math.abs(support?.armLength ?? 0);
  });

  readonly spansOptions = this.spanService.getSpanOptions;
  readonly supportRefOptions = signal<{ label: string; value: 'LEFT' | 'RIGHT' }[]>([]);
  readonly chainNameOptions = signal<{ label: string; value: string }[]>([]);

  readonly cableManipTypeOptions = [
    {
      label: this.translocoService.translate('loads.cable-span-manip.with-a-crane-option'),
      value: 'with_a_crane' as CableManipType
    },
    {
      label: this.translocoService.translate('loads.cable-span-manip.temporary-support-option'),
      value: 'temporary_support' as CableManipType
    }
  ];

  readonly cableManipMethodOptions = [
    {
      label: this.translocoService.translate('loads.cable-span-manip.clamp-option'),
      value: 'clamp' as CableManipMethod
    },
    {
      label: this.translocoService.translate('loads.cable-span-manip.pulley-option'),
      value: 'pulley' as CableManipMethod
    }
  ];

  readonly anchoringOptions = [
    {
      label: this.translocoService.translate('loads.cable-span-manip.with-sling-option'),
      value: 'with_sling' as AnchoringType
    },
    { label: this.translocoService.translate('loads.shared.with-chain-option'), value: 'with_chain' as AnchoringType }
  ];

  // Signals derived from form values to drive conditional template rendering
  private readonly cableManipTypeSignal = toSignal(this.form.controls.cableManipType.valueChanges, {
    initialValue: this.form.controls.cableManipType.value
  });
  private readonly anchoringSignal = toSignal(this.form.controls.anchoring.valueChanges, {
    initialValue: this.form.controls.anchoring.value
  });

  readonly isWithCrane = computed(() => this.cableManipTypeSignal() === 'with_a_crane');
  readonly isWithChain = computed(() => this.anchoringSignal() === 'with_chain');
  readonly isWithSling = computed(() => this.anchoringSignal() === 'with_sling');

  constructor() {
    // Track dirty state whenever any enabled form field changes.
    // scope changes are corrected immediately by onScopeChange().
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.isDirtySinceLastSave.set(true);
    });

    // Dynamic range validators that read min/max from signals on each validation run.
    // updateValueAndValidity() is called explicitly in onScopeChange() to re-validate
    // when the selected span changes.
    this.form.controls.distanceToRefSupport.setValidators([
      Validators.required,
      (ctrl) => Validators.min(this.distRefSupportMin())(ctrl),
      (ctrl) => Validators.max(this.distRefSupportMax())(ctrl),
      twoDecimalValidator
    ]);

    // Dynamic validators for longitudinalDistance — required only when using a crane
    this.form.controls.longitudinalDistance.setValidators([
      (ctrl) => (this.cableManipTypeSignal() === 'with_a_crane' ? Validators.required(ctrl) : null),
      (ctrl) => (this.cableManipTypeSignal() === 'with_a_crane' ? Validators.min(-100)(ctrl) : null),
      (ctrl) => (this.cableManipTypeSignal() === 'with_a_crane' ? Validators.max(5000)(ctrl) : null),
      twoDecimalValidator
    ]);
    effect(() => {
      this.cableManipTypeSignal();
      untracked(() => this.form.controls.longitudinalDistance.updateValueAndValidity({ emitEvent: false }));
    });

    // Dynamic validators for anchoring-dependent fields
    const chainFields = ['chainName'] as const;
    for (const field of chainFields) {
      this.form.controls[field].setValidators([
        (ctrl) => (this.anchoringSignal() === 'with_chain' ? Validators.required(ctrl) : null)
      ]);
    }
    const chainNumericFields = ['chainWeight', 'chainSurface', 'counterWeight'] as const;
    for (const field of chainNumericFields) {
      this.form.controls[field].setValidators([
        (ctrl) => (this.anchoringSignal() === 'with_chain' ? Validators.required(ctrl) : null),
        twoDecimalValidator
      ]);
    }
    this.form.controls.chainLength.setValidators([
      (ctrl) => (this.anchoringSignal() === 'with_chain' ? Validators.required(ctrl) : null),
      twoDecimalValidator
    ]);
    this.form.controls.slingLength.setValidators([
      (ctrl) => (this.anchoringSignal() === 'with_sling' ? Validators.required(ctrl) : null),
      (ctrl) => (this.anchoringSignal() === 'with_sling' ? Validators.min(0)(ctrl) : null),
      (ctrl) => (this.anchoringSignal() === 'with_sling' ? Validators.max(99)(ctrl) : null),
      twoDecimalValidator
    ]);
    effect(() => {
      this.anchoringSignal();
      untracked(() => {
        for (const field of chainFields) {
          this.form.controls[field].updateValueAndValidity({ emitEvent: false });
        }
        for (const field of chainNumericFields) {
          this.form.controls[field].updateValueAndValidity({ emitEvent: false });
        }
        this.form.controls.chainLength.updateValueAndValidity({ emitEvent: false });
        this.form.controls.slingLength.updateValueAndValidity({ emitEvent: false });
      });
    });
  }

  ngOnInit(): void {
    this.loadChains();
  }

  private async loadChains(): Promise<void> {
    const chains = (await this.chainsService.getChains()) ?? [];
    chains.sort((a, b) => a.chain_name.localeCompare(b.chain_name));
    this.chainNameOptions.set(chains.map((c) => ({ label: c.chain_name, value: c.chain_name })));
  }

  onScopeChange(uuid: string | null): void {
    if (!uuid) {
      this.supportRefOptions.set([]);
      this.form.controls.referenceSupport.reset();
      this.form.controls.referenceSupport.disable({ emitEvent: false });
      this.isDirtySinceLastSave.set(false);
      return;
    }

    const index = this.spanService.getSupportIndex(uuid);
    if (index < 0) return;

    this.supportRefOptions.set(this.spanService.getSupportOptions(uuid));
    this.form.controls.referenceSupport.enable({ emitEvent: false });

    const savedManip = this.spanService.section()?.cable_span_manipulations?.find((m) => m.spanUuid === uuid);

    if (savedManip) {
      this.hasSavedManipulation.set(true);
      this.form.reset(
        {
          ...CABLE_SPAN_MANIP_DEFAULTS,
          scope: uuid,
          referenceSupport: savedManip.referenceSupport,
          distanceToRefSupport: savedManip.distanceToRefSupport,
          longitudinalDistance: savedManip.longitudinalDistance ?? 0,
          lateralDistance: savedManip.lateralDistance,
          altitude: savedManip.altitude,
          chainName: savedManip.chainName,
          chainLength: savedManip.chainLength,
          chainWeight: savedManip.chainWeight,
          chainSurface: savedManip.chainSurface,
          counterWeight: savedManip.counterWeight,
          slingLength: savedManip.slingLength
        },
        { emitEvent: false }
      );
    } else {
      this.form.reset({ ...CABLE_SPAN_MANIP_DEFAULTS, scope: uuid }, { emitEvent: false });
      this.hasSavedManipulation.set(false);
    }

    this.form.controls.distanceToRefSupport.updateValueAndValidity({ emitEvent: false });
    // New manipulation: allow saving defaults immediately. Existing: require a change first.
    this.isDirtySinceLastSave.set(savedManip == null);
  }

  resetForm(): void {
    this.form.reset({ ...CABLE_SPAN_MANIP_DEFAULTS, scope: this.form.controls.scope.value }, { emitEvent: false });
    this.isDirtySinceLastSave.set(false);
  }

  zoomToSpan(): void {
    const uuid = this.form.controls.scope.value;
    if (!uuid) return;
    const index = this.spanService.getSupportIndex(uuid);
    if (index < 0) return;
    this.plotService.plotOptionsChange({ startSupport: index, endSupport: index + 1 });
  }

  async saveForm(): Promise<void> {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    // form.invalid guard above ensures required fields are non-null;
    // disabled controls (cableManipType, cableManipMethod, anchoring) are always initialised.
    this.isLoading.set(true);
    try {
      await this.cableSpanManipService.save({
        spanUuid: raw.scope!,
        referenceSupport: raw.referenceSupport!,
        distanceToRefSupport: raw.distanceToRefSupport!,
        cableManipType: raw.cableManipType!,
        cableManipMethod: raw.cableManipMethod!,
        longitudinalDistance: raw.longitudinalDistance,
        lateralDistance: raw.lateralDistance!,
        altitude: raw.altitude!,
        anchoring: raw.anchoring!,
        chainName: raw.chainName,
        chainLength: raw.chainLength,
        chainWeight: raw.chainWeight,
        chainSurface: raw.chainSurface,
        counterWeight: raw.counterWeight,
        slingLength: raw.slingLength!
      });
      this.hasSavedManipulation.set(true);
      await this.cableSpanManipService.reloadSection();
      this.isDirtySinceLastSave.set(false);
    } finally {
      this.isLoading.set(false);
    }
  }

  deleteForm(): void {
    const spanUuid = this.form.controls.scope.value;
    const uuid = spanUuid
      ? (this.spanService.section()?.cable_span_manipulations?.find((m) => m.spanUuid === spanUuid)?.uuid ?? null)
      : null;

    if (uuid) {
      this.cableSpanManipService.delete(uuid).then(async () => {
        await this.cableSpanManipService.reloadSection();
        if (spanUuid) {
          this.cableSpanManipService.clearPersistedFormData(spanUuid);
        }
      });
    } else if (spanUuid) {
      this.cableSpanManipService.clearPersistedFormData(spanUuid);
    }

    this.form.reset({ ...CABLE_SPAN_MANIP_DEFAULTS, scope: this.form.controls.scope.value }, { emitEvent: false });
    this.hasSavedManipulation.set(false);
  }

  calculate(): void {
    // No Python task implemented yet — placeholder for future calculation.
    if (this.isFormInvalid()) return;
  }

  isFormInvalid(): boolean {
    return this.form.invalid;
  }

  getErrorIds(controlName: keyof CableSpanManipFormControls, errorTypes: string[]): string | null {
    return getControlErrorIds(this.form, controlName, errorTypes);
  }
}
