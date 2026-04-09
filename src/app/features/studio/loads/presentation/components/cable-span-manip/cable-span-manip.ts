import { ChangeDetectionStrategy, Component, computed, inject, signal, untracked } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { merge, of } from 'rxjs';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputText } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { PlotService } from '@services/plot/plot.service';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { AnchoringType, CableManipMethod, CableManipType } from '@shared/domain';
import { CableSpanManipService } from '../../services/cableSpanManip.service';
import { CableSpanManipFormControls } from './cable-span-manip.interfaces';

@Component({
  selector: 'app-cable-span-manip',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputText,
    InputGroupModule,
    InputGroupAddonModule,
    SelectModule,
    ButtonComponent,
    IconComponent
  ],
  templateUrl: './cable-span-manip.html',
  styleUrl: './cable-span-manip.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Component for configuring cable span manipulations (crane or temporary support) on a span. */
export class CableSpanManipComponent {
  private readonly fb = inject(FormBuilder);
  private readonly plotService = inject(PlotService);
  private readonly cableSpanManipService = inject(CableSpanManipService);
  private readonly chainsService = inject(ChainsService);

  readonly isLoading = signal(false);
  readonly isCalculating = computed(() => this.plotService.loading());
  /** Whether the form has been modified since the last save. */
  readonly isDirtySinceLastSave = signal(false);
  /** Whether a saved manipulation exists for the currently selected span. */
  readonly hasSavedManipulation = signal(true);

  /** Dynamic min for distanceToRefSupport — updated on scope change. */
  readonly distRefSupportMin = signal(0);
  /** Dynamic max for distanceToRefSupport — updated on scope change. */
  readonly distRefSupportMax = signal(0);

  readonly form = this.fb.group<CableSpanManipFormControls>({
    scope: new FormControl<string | null>(null, { validators: [Validators.required] }),
    referenceSupport: new FormControl<'LEFT' | 'RIGHT' | null>(
      { value: null, disabled: true },
      { validators: [Validators.required] }
    ),
    distanceToRefSupport: new FormControl<number | null>(0, { validators: [Validators.required] }),
    cableManipType: new FormControl<CableManipType | null>({ value: 'with_a_crane', disabled: true }),
    cableManipMethod: new FormControl<CableManipMethod | null>({ value: 'clamp', disabled: true }),
    longitudinalDistance: new FormControl<number | null>(0),
    lateralDistance: new FormControl<number | null>(0, {
      validators: [Validators.required, Validators.min(-100), Validators.max(100)]
    }),
    altitude: new FormControl<number | null>(0, {
      validators: [Validators.required, Validators.min(-100), Validators.max(9000)]
    }),
    anchoring: new FormControl<AnchoringType | null>({ value: 'with_sling', disabled: true }),
    chainName: new FormControl<string | null>(null),
    chainLength: new FormControl<number | null>(null),
    chainWeight: new FormControl<number | null>(null),
    chainSurface: new FormControl<number | null>(null),
    counterWeight: new FormControl<number | null>(null),
    slingLength: new FormControl<number | null>(5)
  });

  readonly spansOptions = this.plotService.getSpanOptions;
  readonly supportRefOptions = signal<{ label: string; value: 'LEFT' | 'RIGHT' }[]>([]);
  readonly chainNameOptions = signal<{ label: string; value: string }[]>([]);

  readonly cableManipTypeOptions = [
    { label: $localize`With a crane`, value: 'with_a_crane' as CableManipType },
    { label: $localize`Temporary support`, value: 'temporary_support' as CableManipType }
  ];

  readonly cableManipMethodOptions = [
    { label: $localize`Clamp`, value: 'clamp' as CableManipMethod },
    { label: $localize`Pulley`, value: 'pulley' as CableManipMethod }
  ];

  readonly anchoringOptions = [
    { label: $localize`With sling`, value: 'with_sling' as AnchoringType },
    { label: $localize`With chain`, value: 'with_chain' as AnchoringType }
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
    // Track dirty state when user edits content fields
    merge(
      this.form.controls.referenceSupport.valueChanges,
      this.form.controls.distanceToRefSupport.valueChanges,
      this.form.controls.longitudinalDistance.valueChanges,
      this.form.controls.lateralDistance.valueChanges,
      this.form.controls.altitude.valueChanges,
      this.form.controls.slingLength.valueChanges,
      this.form.controls.chainName.valueChanges,
      this.form.controls.chainLength.valueChanges,
      this.form.controls.chainWeight.valueChanges,
      this.form.controls.chainSurface.valueChanges,
      this.form.controls.counterWeight.valueChanges
    )
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.isDirtySinceLastSave.set(true);
      });

    // Conditional validators: longitudinalDistance required only when using a crane
    merge(of(this.form.controls.cableManipType.value), this.form.controls.cableManipType.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe((type) => this.updateLongitudinalDistanceValidators(type));

    // Conditional validators: chain fields required when with_chain; slingLength required when with_sling
    merge(of(this.form.controls.anchoring.value), this.form.controls.anchoring.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe((anchoring) => this.updateAnchoringValidators(anchoring));

    this.loadChains();
  }

  private async loadChains(): Promise<void> {
    const chains = (await this.chainsService.getChains()) ?? [];
    this.chainNameOptions.set(
      chains
        .sort((a, b) => a.chain_name.localeCompare(b.chain_name))
        .map((c) => ({ label: c.chain_name, value: c.chain_name }))
    );
  }

  onScopeChange(uuid: string | null): void {
    if (!uuid) {
      this.supportRefOptions.set([]);
      this.form.controls.referenceSupport.reset();
      this.form.controls.referenceSupport.disable({ emitEvent: false });
      this.isDirtySinceLastSave.set(false);
      return;
    }

    const index = untracked(() => this.plotService.getSupportIndex(uuid));
    if (index < 0) return;

    const supports = untracked(() => this.plotService.section()?.supports ?? []);
    const support = supports[index];
    const armLength = Math.abs(support?.armLength ?? 0);
    const spanLength = support?.spanLength ?? 0;
    const min = -armLength;
    const max = spanLength + armLength;

    this.distRefSupportMin.set(min);
    this.distRefSupportMax.set(max);
    this.form.controls.distanceToRefSupport.setValidators([
      Validators.required,
      Validators.min(min),
      Validators.max(max)
    ]);
    this.form.controls.distanceToRefSupport.updateValueAndValidity({ emitEvent: false });

    this.supportRefOptions.set(untracked(() => this.plotService.getSupportOptions(uuid)));
    this.form.controls.referenceSupport.enable({ emitEvent: false });
    this.form.controls.referenceSupport.setValue('LEFT', { emitEvent: false });

    const savedManip = untracked(() =>
      this.plotService.section()?.cable_span_manipulations?.find((m) => m.spanUuid === uuid)
    );

    if (savedManip) {
      this.hasSavedManipulation.set(false);
      this.form.patchValue(
        {
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
      this.form.patchValue(
        {
          referenceSupport: 'LEFT',
          distanceToRefSupport: 0,
          longitudinalDistance: 0,
          lateralDistance: 0,
          altitude: 0,
          chainName: null,
          chainLength: null,
          chainWeight: null,
          chainSurface: null,
          counterWeight: null,
          slingLength: 5
        },
        { emitEvent: false }
      );
      this.hasSavedManipulation.set(true);
    }

    this.statesFormControls();
    // New manipulation: allow saving defaults immediately. Existing: require a change first.
    this.isDirtySinceLastSave.set(savedManip == null);
  }

  resetForm(): void {
    const currentScope = this.form.controls.scope.value;
    this.form.patchValue(
      {
        referenceSupport: 'LEFT',
        distanceToRefSupport: 0,
        longitudinalDistance: 0,
        lateralDistance: 0,
        altitude: 0,
        chainName: null,
        chainLength: null,
        chainWeight: null,
        chainSurface: null,
        counterWeight: null,
        slingLength: 5
      },
      { emitEvent: false }
    );
    if (currentScope) {
      this.form.controls.scope.setValue(currentScope, { emitEvent: false });
    }
    this.statesFormControls();
    this.isDirtySinceLastSave.set(false);
  }

  zoomToSpan(): void {
    const uuid = this.form.controls.scope.value;
    if (!uuid) return;
    const index = this.plotService.getSupportIndex(uuid);
    if (index < 0) return;
    this.plotService.plotOptionsChange({ startSupport: index, endSupport: index + 1 });
  }

  async saveForm(): Promise<void> {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const {
      scope,
      referenceSupport,
      distanceToRefSupport,
      longitudinalDistance,
      lateralDistance,
      altitude,
      chainName,
      chainLength,
      chainWeight,
      chainSurface,
      counterWeight,
      slingLength
    } = raw;
    if (
      !scope ||
      !referenceSupport ||
      distanceToRefSupport === null ||
      lateralDistance === null ||
      altitude === null ||
      slingLength === null ||
      !raw.cableManipType ||
      !raw.cableManipMethod ||
      !raw.anchoring
    )
      return;

    this.isLoading.set(true);
    await this.cableSpanManipService
      .save({
        spanUuid: scope,
        referenceSupport,
        distanceToRefSupport,
        cableManipType: raw.cableManipType,
        cableManipMethod: raw.cableManipMethod,
        longitudinalDistance,
        lateralDistance,
        altitude,
        anchoring: raw.anchoring,
        chainName,
        chainLength,
        chainWeight,
        chainSurface,
        counterWeight,
        slingLength
      })
      .finally(() => {
        this.isLoading.set(false);
        this.hasSavedManipulation.set(false);
      });
    await this.reloadSectionFromDb();
    this.isDirtySinceLastSave.set(false);
  }

  deleteForm(): void {
    const spanUuid = this.form.controls.scope.value;
    const uuid = spanUuid
      ? (this.plotService.section()?.cable_span_manipulations?.find((m) => m.spanUuid === spanUuid)?.uuid ?? null)
      : null;

    if (uuid) {
      this.cableSpanManipService.delete(uuid).then(async () => {
        await this.reloadSectionFromDb();
        if (spanUuid) {
          this.cableSpanManipService.clearPersistedFormData(spanUuid);
        }
      });
    } else if (spanUuid) {
      this.cableSpanManipService.clearPersistedFormData(spanUuid);
    }

    this.form.patchValue(
      {
        referenceSupport: 'LEFT',
        distanceToRefSupport: 0,
        longitudinalDistance: 0,
        lateralDistance: 0,
        altitude: 0,
        chainName: null,
        chainLength: null,
        chainWeight: null,
        chainSurface: null,
        counterWeight: null,
        slingLength: 5
      },
      { emitEvent: false }
    );
    this.hasSavedManipulation.set(true);
  }

  calculate(): void {
    // No Python task implemented yet — placeholder for future calculation.
    if (this.isFormInvalid()) return;
  }

  isFormInvalid(): boolean {
    return this.form.invalid;
  }

  private statesFormControls(): void {
    const controls: (keyof CableSpanManipFormControls)[] = [
      'referenceSupport',
      'distanceToRefSupport',
      'longitudinalDistance',
      'lateralDistance',
      'altitude',
      'chainName',
      'chainLength',
      'chainWeight',
      'chainSurface',
      'counterWeight',
      'slingLength'
    ];
    for (const name of controls) {
      const control = this.form.controls[name];
      control.markAsPristine();
      control.markAsUntouched();
    }
  }

  private updateLongitudinalDistanceValidators(type: CableManipType | null): void {
    const ctrl = this.form.controls.longitudinalDistance;
    if (type === 'with_a_crane') {
      ctrl.setValidators([Validators.required]);
    } else {
      ctrl.clearValidators();
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  private updateAnchoringValidators(anchoring: AnchoringType | null): void {
    const chainFields = ['chainName', 'chainLength', 'chainWeight', 'chainSurface', 'counterWeight'] as const;
    if (anchoring === 'with_chain') {
      for (const field of chainFields) {
        this.form.controls[field].setValidators([Validators.required]);
        this.form.controls[field].updateValueAndValidity({ emitEvent: false });
      }
      this.form.controls.slingLength.clearValidators();
      this.form.controls.slingLength.updateValueAndValidity({ emitEvent: false });
    } else {
      for (const field of chainFields) {
        this.form.controls[field].clearValidators();
        this.form.controls[field].updateValueAndValidity({ emitEvent: false });
      }
      this.form.controls.slingLength.setValidators([Validators.required, Validators.min(0), Validators.max(99)]);
      this.form.controls.slingLength.updateValueAndValidity({ emitEvent: false });
    }
  }

  private async reloadSectionFromDb(): Promise<void> {
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.plotService.section()?.uuid;
    if (!studyUuid || !sectionUuid) return;
    const study = await this.cableSpanManipService['studiesService'].getStudy(studyUuid);
    if (!study) return;
    const section = study.sections.find((s) => s?.uuid === sectionUuid);
    if (section) {
      this.plotService.section.set(section);
    }
  }
}
