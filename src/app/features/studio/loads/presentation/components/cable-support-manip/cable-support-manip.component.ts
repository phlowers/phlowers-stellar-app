import { animate, style, transition, trigger } from '@angular/animations';
import { afterRender, ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputText } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { NotificationService } from '@services/notification/notification.service';
import { formatSupportNumber } from '@shared/helpers/formatSupportNumber';
import { truncateTwoDecimals } from '@shared/helpers/truncateDecimals';
import { CableSupportManipService } from '../../services/cableSupportManip.service';
import {
  CABLE_SUPPORT_MANIP_DEFAULTS,
  CableSupportManipFormControls,
  SupportAnchoringType,
  SupportManipType
} from './cable-support-manip.interfaces';

@Component({
  selector: 'app-cable-support-manip',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputText,
    InputGroupModule,
    InputGroupAddonModule,
    SelectModule,
    MessageModule,
    ButtonComponent,
    IconComponent
  ],
  templateUrl: './cable-support-manip.component.html',
  styleUrl: './cable-support-manip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('expandCollapse', [
      transition(':enter', [
        style({ height: 0, overflow: 'hidden', opacity: 0 }),
        animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        style({ overflow: 'hidden' }),
        animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)', style({ height: 0, opacity: 0 }))
      ])
    ])
  ]
})
export class CableSupportManipComponent {
  private readonly fb = inject(FormBuilder);
  private readonly plotService = inject(PlotService);
  private readonly spanService = inject(PlotSpanService);
  private readonly cableSupportManipService = inject(CableSupportManipService);
  private readonly notificationService = inject(NotificationService);

  readonly isLoading = signal(false);
  readonly isCalculating = computed(() => this.plotService.loading());
  readonly hasSavedManipulation = signal(false);
  /** Disables manip2 animations for one render cycle during programmatic load-case changes. */
  readonly disableManip2Anim = signal(false);

  readonly form = this.fb.group<CableSupportManipFormControls>({
    support: new FormControl<string | null>(null, { validators: [Validators.required] }),
    manip1Type: new FormControl<SupportManipType | null>(null, { validators: [Validators.required] }),
    vertDisplacement: new FormControl<number | null>(0),
    anchoring: new FormControl<SupportAnchoringType | null>('without_chain'),
    lateralDistance: new FormControl<number | null>(0),
    ropeLength: new FormControl<number | null>(0),
    shiftingClampLength: new FormControl<number | null>(0),
    manip2Type: new FormControl<SupportManipType | null>('shifting'),
    manip2ShiftingClampLength: new FormControl<number | null>(0)
  });

  /** All supports from the current section as select options. */
  readonly supportsOptions = computed<{ label: string; value: string }[]>(() => {
    const supports = this.spanService.section()?.supports ?? [];
    return supports.map((s, i) => ({
      label: s.number ? formatSupportNumber(s.number) : String(i + 1),
      value: s.uuid
    }));
  });

  readonly manip1TypeOptions = [
    { label: $localize`Crane handling`, value: 'crane' as SupportManipType },
    { label: $localize`Rope handling`, value: 'rope' as SupportManipType },
    { label: $localize`Shifting`, value: 'shifting' as SupportManipType }
  ];

  readonly anchoringOptions = [
    { label: $localize`Without chain`, value: 'without_chain' as SupportAnchoringType },
    { label: $localize`With chain`, value: 'with_chain' as SupportAnchoringType, disabled: true }
  ];

  private readonly manip1TypeSignal = toSignal(this.form.controls.manip1Type.valueChanges, {
    initialValue: this.form.controls.manip1Type.value
  });

  readonly isCrane = computed(() => this.manip1TypeSignal() === 'crane');
  readonly isRope = computed(() => this.manip1TypeSignal() === 'rope');
  readonly isShifting = computed(() => this.manip1TypeSignal() === 'shifting');

  /** Whether manipulation 2 is currently shown. */
  readonly showManip2 = signal(false);
  /** Whether adding a second manipulation is allowed (crane or rope in manip1). */
  readonly isManip2Available = computed(
    () => this.manip1TypeSignal() === 'crane' || this.manip1TypeSignal() === 'rope'
  );

  readonly manip2TypeOptions = [{ label: $localize`Shifting`, value: 'shifting' as SupportManipType }];

  private readonly manip2TypeSignal = toSignal(this.form.controls.manip2Type.valueChanges, {
    initialValue: this.form.controls.manip2Type.value
  });

  readonly isManip2Shifting = computed(() => this.showManip2() && this.manip2TypeSignal() === 'shifting');

  readonly truncateTwoDecimals = truncateTwoDecimals;

  constructor() {
    this.form.controls.vertDisplacement.setValidators([
      (ctrl) => (this.manip1TypeSignal() === 'crane' ? Validators.required(ctrl) : null),
      (ctrl) => (this.manip1TypeSignal() === 'crane' ? Validators.min(-150)(ctrl) : null),
      (ctrl) => (this.manip1TypeSignal() === 'crane' ? Validators.max(50)(ctrl) : null)
    ]);

    this.form.controls.anchoring.setValidators([
      (ctrl) => (this.manip1TypeSignal() === 'crane' ? Validators.required(ctrl) : null)
    ]);

    this.form.controls.lateralDistance.setValidators([
      (ctrl) => (this.manip1TypeSignal() === 'crane' ? Validators.required(ctrl) : null),
      (ctrl) => (this.manip1TypeSignal() === 'crane' ? Validators.min(-50)(ctrl) : null),
      (ctrl) => (this.manip1TypeSignal() === 'crane' ? Validators.max(50)(ctrl) : null)
    ]);

    this.form.controls.ropeLength.setValidators([
      (ctrl) => (this.manip1TypeSignal() === 'rope' ? Validators.required(ctrl) : null),
      (ctrl) => (this.manip1TypeSignal() === 'rope' ? Validators.min(0)(ctrl) : null),
      (ctrl) => (this.manip1TypeSignal() === 'rope' ? Validators.max(50)(ctrl) : null)
    ]);

    this.form.controls.shiftingClampLength.setValidators([
      (ctrl) => (this.manip1TypeSignal() === 'shifting' ? Validators.required(ctrl) : null),
      (ctrl) => (this.manip1TypeSignal() === 'shifting' ? Validators.min(-10)(ctrl) : null),
      (ctrl) => (this.manip1TypeSignal() === 'shifting' ? Validators.max(10)(ctrl) : null)
    ]);

    this.form.controls.manip2ShiftingClampLength.setValidators([
      (ctrl) => (this.isManip2Shifting() ? Validators.required(ctrl) : null),
      (ctrl) => (this.isManip2Shifting() ? Validators.min(-10)(ctrl) : null),
      (ctrl) => (this.isManip2Shifting() ? Validators.max(10)(ctrl) : null)
    ]);

    effect(() => {
      this.manip1TypeSignal();
      untracked(() => {
        this.form.controls.vertDisplacement.updateValueAndValidity({ emitEvent: false });
        this.form.controls.anchoring.updateValueAndValidity({ emitEvent: false });
        this.form.controls.lateralDistance.updateValueAndValidity({ emitEvent: false });
        this.form.controls.ropeLength.updateValueAndValidity({ emitEvent: false });
        this.form.controls.shiftingClampLength.updateValueAndValidity({ emitEvent: false });
      });
    });

    // Hide and reset manip2 when manip1 type no longer allows it.
    effect(() => {
      if (!this.isManip2Available()) {
        untracked(() => this.clearManip2());
      }
    });

    effect(() => {
      this.isManip2Shifting();
      untracked(() => this.form.controls.manip2ShiftingClampLength.updateValueAndValidity({ emitEvent: false }));
    });

    // Re-populate the form when the active load case changes so that each
    // (support, charge) pair shows its own saved manipulation.
    let previousChargeUuid: string | null | undefined = undefined;
    effect(() => {
      const chargeUuid = this.spanService.section()?.selected_charge_uuid ?? null;
      if (chargeUuid === previousChargeUuid) return;
      previousChargeUuid = chargeUuid;
      // Suppress manip2 animations for this render to prevent overlapping
      // enter/leave transitions when switching load cases rapidly.
      this.disableManip2Anim.set(true);
      untracked(() => this.onSupportChange(this.form.controls.support.value));
    });

    // Re-enable manip2 animations after each render cycle so that
    // user-triggered add/remove interactions still animate normally.
    afterRender(() => {
      if (untracked(() => this.disableManip2Anim())) {
        this.disableManip2Anim.set(false);
      }
    });
  }

  zoomToSupport(): void {
    const uuid = this.form.controls.support.value;
    if (!uuid) return;
    const supports = this.spanService.section()?.supports ?? [];
    const index = supports.findIndex((s) => s.uuid === uuid);
    if (index < 0) return;
    const start = Math.max(0, index - 1);
    const end = Math.min(supports.length - 1, index + 1);
    this.plotService.plotOptionsChange({ startSupport: start, endSupport: end });
  }

  addManip2(): void {
    this.showManip2.set(true);
  }

  removeManip2(): void {
    this.clearManip2();
  }

  private clearManip2(): void {
    this.showManip2.set(false);
    this.form.controls.manip2Type.reset('shifting', { emitEvent: false });
    this.form.controls.manip2ShiftingClampLength.reset(0, { emitEvent: false });
    this.form.controls.manip2ShiftingClampLength.updateValueAndValidity({ emitEvent: false });
  }

  onSupportChange(uuid: string | null): void {
    if (!uuid) {
      this.hasSavedManipulation.set(false);
      return;
    }
    const chargeUuid = this.spanService.section()?.selected_charge_uuid ?? null;
    const saved = this.spanService
      .section()
      ?.cable_support_manipulations?.find((m) => m.supportUuid === uuid && m.chargeUuid === chargeUuid);

    if (saved) {
      this.hasSavedManipulation.set(true);
      this.showManip2.set(saved.manip2 != null);
      this.form.reset({
        ...CABLE_SUPPORT_MANIP_DEFAULTS,
        support: uuid,
        manip1Type: saved.manip1.type,
        vertDisplacement: saved.manip1.vertDisplacement ?? 0,
        anchoring: saved.manip1.anchoring ?? 'without_chain',
        lateralDistance: saved.manip1.lateralDistance ?? 0,
        ropeLength: saved.manip1.ropeLength ?? 0,
        shiftingClampLength: saved.manip1.shiftingClampLength ?? 0,
        manip2Type: saved.manip2?.type ?? 'shifting',
        manip2ShiftingClampLength: saved.manip2?.shiftingClampLength ?? 0
      });
    } else {
      this.hasSavedManipulation.set(false);
      this.clearManip2();
      this.form.reset({ ...CABLE_SUPPORT_MANIP_DEFAULTS, support: uuid });
    }
  }

  resetForm(): void {
    this.clearManip2();
    this.form.reset({ ...CABLE_SUPPORT_MANIP_DEFAULTS, support: this.form.controls.support.value });
  }

  async saveForm(): Promise<void> {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const chargeUuid = this.spanService.section()?.selected_charge_uuid ?? null;
    if (!chargeUuid) return;
    this.isLoading.set(true);
    try {
      await this.cableSupportManipService.save({
        supportUuid: raw.support!,
        chargeUuid,
        manip1: {
          type: raw.manip1Type!,
          vertDisplacement: raw.vertDisplacement,
          anchoring: raw.anchoring,
          lateralDistance: raw.lateralDistance,
          ropeLength: raw.ropeLength,
          shiftingClampLength: raw.shiftingClampLength
        },
        manip2: this.showManip2()
          ? {
              type: raw.manip2Type!,
              vertDisplacement: null,
              anchoring: null,
              lateralDistance: null,
              ropeLength: null,
              shiftingClampLength: raw.manip2ShiftingClampLength
            }
          : null
      });
      this.hasSavedManipulation.set(true);
      await this.cableSupportManipService.reloadSection();
      this.notificationService.success($localize`Cable support manipulation saved`);
    } catch {
      this.notificationService.error($localize`Failed to save cable support manipulation`);
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteForm(): Promise<void> {
    const supportUuid = this.form.controls.support.value;
    const chargeUuid = this.spanService.section()?.selected_charge_uuid ?? null;
    const uuid =
      supportUuid && chargeUuid
        ? (this.spanService
            .section()
            ?.cable_support_manipulations?.find(
              (m) => m.supportUuid === supportUuid && m.chargeUuid === chargeUuid
            )?.uuid ?? null)
        : null;

    this.isLoading.set(true);
    try {
      if (uuid) {
        await this.cableSupportManipService.delete(uuid);
        await this.cableSupportManipService.reloadSection();
      }
      this.clearManip2();
      this.form.reset({ ...CABLE_SUPPORT_MANIP_DEFAULTS, support: this.form.controls.support.value });
      this.hasSavedManipulation.set(false);
      this.notificationService.success($localize`Cable support manipulation deleted`);
    } catch {
      this.notificationService.error($localize`Failed to delete cable support manipulation`);
    } finally {
      this.isLoading.set(false);
    }
  }

  async calculate(): Promise<void> {
    if (this.isFormInvalid()) return;
    this.isLoading.set(true);
    try {
      // Python task placeholder — to be wired once the calculation API is defined.
    } finally {
      this.isLoading.set(false);
    }
  }

  isFormInvalid(): boolean {
    return this.form.invalid;
  }

  getErrorIds(controlName: keyof CableSupportManipFormControls, errorTypes: string[]): string | null {
    const control = this.form.get(controlName);
    if (!control?.errors) return null;
    const ids = errorTypes.filter((type) => control.errors?.[type]).map((type) => `${controlName}-error-${type}`);
    return ids.length > 0 ? ids.join(' ') : null;
  }
}
