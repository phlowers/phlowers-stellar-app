import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputText } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { PlotService } from '@services/plot/plot.service';
import { CableSpanFormControls, CableWidthType } from './cable-span.interfaces';
import { CableModificationsService } from '../../services/cableModifications.service';

@Component({
  selector: 'app-cable-span',
  imports: [
    ReactiveFormsModule,
    InputText,
    InputGroupModule,
    InputGroupAddonModule,
    SelectModule,
    ButtonComponent,
    IconComponent
  ],
  templateUrl: './cable-span.html',
  styleUrl: './cable-span.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Component for configuring cable length modifications (shortening or lengthening) on a span. */
export class CableSpanComponent {
  private readonly fb = inject(FormBuilder);
  private readonly plotService = inject(PlotService);
  private readonly cableModificationsService = inject(CableModificationsService);

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  /** Whether the form has been modified since the last save (RG.LON-CAB.ENR-BTN.1). */
  readonly isDirtySinceLastSave = signal(false);

  readonly form = this.fb.group<CableSpanFormControls>({
    scope: new FormControl<string | null>(null, { validators: [Validators.required] }),
    supportRef: new FormControl<'LEFT' | 'RIGHT' | null>(
      { value: null, disabled: true },
      { validators: [Validators.required] }
    ),
    widthCable: new FormControl<CableWidthType | null>(null, { validators: [Validators.required] }),
    sizeCable: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0), Validators.max(1000)]
    }),
    distanceSupportRef: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0), Validators.max(5000)]
    })
  });

  /** Span options per RG.LON-CAB.POR.1. */
  readonly spansOptions = this.plotService.getSpanOptions;

  readonly supportRefOptions = signal<{ label: number; value: 'LEFT' | 'RIGHT' }[]>([]);

  readonly widthCableOptions = [
    { label: $localize`Lengthening`, value: 'lengthening' as CableWidthType },
    { label: $localize`Shortening`, value: 'shortening' as CableWidthType }
  ];

  private readonly scopeSignal = toSignal(this.form.controls.scope.valueChanges, {
    initialValue: this.form.controls.scope.value
  });

  /** Whether a modification is already saved for the selected span (RG.LON-CAB.SUP-BTN.1). */
  readonly hasSavedModification = computed(() => {
    const spanUuid = this.scopeSignal();
    if (!spanUuid) return false;
    return (this.plotService.section()?.cable_modifications ?? []).some((m) => m.spanUuid === spanUuid);
  });

  /** UUID of the section last seen — used to reset the form when the section changes. */
  private previousSectionUuid: string | null = null;

  constructor() {
    // Track dirty state when user edits content fields (RG.LON-CAB.ENR-BTN.1)
    merge(
      this.form.controls.widthCable.valueChanges,
      this.form.controls.sizeCable.valueChanges,
      this.form.controls.distanceSupportRef.valueChanges,
      this.form.controls.supportRef.valueChanges
    )
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.isDirtySinceLastSave.set(true);
      });

    // Auto-select the currently visible span when section loads or changes (RG.LON-CAB.POR.5)
    effect(() => {
      const section = this.plotService.section();
      if (!section) {
        untracked(() => {
          this.resetForm();
          this.previousSectionUuid = null;
        });
        return;
      }
      if (section.uuid === this.previousSectionUuid) return;
      this.previousSectionUuid = section.uuid;

      const startIndex = untracked(() => this.plotService.plotOptions().startSupport);
      const defaultUuid = section.supports?.[startIndex]?.uuid ?? section.supports?.[0]?.uuid ?? null;
      untracked(() => {
        this.form.controls.scope.setValue(defaultUuid, { emitEvent: false });
        if (defaultUuid) this.onScopeChange(defaultUuid);
      });
    });
  }

  onScopeChange(uuid: string | null): void {
    if (!uuid) {
      this.supportRefOptions.set([]);
      this.form.controls.supportRef.reset();
      this.form.controls.supportRef.disable({ emitEvent: false });
      this.isDirtySinceLastSave.set(false);
      return;
    }
    const index = untracked(() => this.plotService.getSupportIndex(uuid));
    if (index < 0) return;

    this.supportRefOptions.set(untracked(() => this.plotService.getSupportOptions(uuid)));
    this.form.controls.supportRef.enable({ emitEvent: false });
    // RG.LON-CAB.SUP.2: pre-select first support by default
    this.form.controls.supportRef.setValue('LEFT', { emitEvent: false });

    this.plotService.plotOptionsChange({
      startSupport: index,
      endSupport: index + 1
    });

    // RG.LON-CAB.POR.4: reload saved modification for this span if one exists
    const savedMod = untracked(() => this.plotService.section()?.cable_modifications?.find((m) => m.spanUuid === uuid));
    if (savedMod) {
      this.form.patchValue(
        {
          supportRef: savedMod.supportRef,
          widthCable: savedMod.widthCable,
          sizeCable: savedMod.sizeCable,
          distanceSupportRef: savedMod.distanceSupportRef
        },
        { emitEvent: false }
      );
    } else {
      this.form.patchValue({ widthCable: null, sizeCable: null, distanceSupportRef: null }, { emitEvent: false });
    }
    // Selecting a span is not a user content edit — reset dirty
    this.isDirtySinceLastSave.set(false);
  }

  resetForm(): void {
    this.form.reset();
    this.form.controls.supportRef.disable({ emitEvent: false });
    this.supportRefOptions.set([]);
    this.isDirtySinceLastSave.set(false);
  }

  async saveForm(): Promise<void> {
    if (this.form.invalid) return;
    const { scope, supportRef, widthCable, sizeCable, distanceSupportRef } = this.form.getRawValue();
    if (!scope || !supportRef || !widthCable || sizeCable === null || distanceSupportRef === null) return;
    await this.cableModificationsService.save({
      spanUuid: scope,
      supportRef,
      widthCable,
      sizeCable,
      distanceSupportRef
    });
    this.isDirtySinceLastSave.set(false);
  }

  calculate(): void {
    if (this.form.invalid) return;
    const { scope, supportRef, widthCable, sizeCable, distanceSupportRef } = this.form.getRawValue();
    if (!scope || !supportRef || !widthCable || sizeCable === null || distanceSupportRef === null) return;
    this.isLoading.set(true);
    this.error.set(null);
    this.cableModificationsService
      .calculate({
        spanUuid: scope,
        supportRef,
        widthCable,
        sizeCable,
        distanceSupportRef
      })
      .then(() => {
        const workerError = this.plotService.error();
        this.error.set(workerError ? String(workerError) : null);
      })
      .finally(() => {
        this.isLoading.set(false);
      });
  }

  deleteForm(): void {
    const spanUuid = this.form.controls.scope.value;
    const uuid = spanUuid
      ? (this.plotService.section()?.cable_modifications?.find((m) => m.spanUuid === spanUuid)?.uuid ?? null)
      : null;
    if (uuid) {
      this.cableModificationsService.delete(uuid);
    }
    this.resetForm();
  }

  isFormInvalid(): boolean {
    return this.form.invalid;
  }
}
