import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputText } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { PlotService } from '@services/plot/plot.service';
import { CableLengthChangeFormControls, CableWidthType } from './cable-length-change.interfaces';
import { CableModificationsService } from '../../services/cableModifications.service';

@Component({
  selector: 'app-cable-length-change',
  imports: [
    ReactiveFormsModule,
    InputText,
    InputGroupModule,
    InputGroupAddonModule,
    SelectModule,
    ButtonComponent,
    IconComponent
  ],
  templateUrl: './cable-length-change.html',
  styleUrl: './cable-length-change.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Component for configuring cable length modifications (shortening or lengthening) on a span. */
export class CableLengthChangeComponent {
  private readonly fb = inject(FormBuilder);
  private readonly plotService = inject(PlotService);
  private readonly cableModificationsService = inject(CableModificationsService);

  readonly isLoading = signal(false);
  readonly isCalculating = computed(() => this.plotService.loading());
  readonly error = signal<string | null>(null);
  /** Whether the form has been modified since the last save (RG.LON-CAB.ENR-BTN.1). */
  readonly isDirtySinceLastSave = signal(false);

  readonly form = this.fb.group<CableLengthChangeFormControls>({
    scope: new FormControl<string | null>(null, { validators: [Validators.required] }),
    supportRef: new FormControl<'LEFT' | 'RIGHT' | null>(
      { value: null, disabled: true },
      { validators: [Validators.required] }
    ),
    widthCable: new FormControl<CableWidthType | null>('lengthening', { validators: [Validators.required] }),
    sizeCable: new FormControl<number | null>(0, {
      validators: [Validators.required, Validators.min(0), Validators.max(1000)]
    }),
    distanceSupportRef: new FormControl<number | null>(0, {
      validators: [Validators.required, Validators.min(0), Validators.max(5000)]
    })
  });

  /** Span options per RG.LON-CAB.POR.1. */
  readonly spansOptions = this.plotService.getSpanOptions;

  readonly supportRefOptions = signal<{ label: string; value: 'LEFT' | 'RIGHT' }[]>([]);

  readonly widthCableOptions = [
    { label: $localize`Lengthening`, value: 'lengthening' as CableWidthType },
    { label: $localize`Shortening`, value: 'shortening' as CableWidthType }
  ];

  hasSavedModification = signal<boolean>(true);
  readonly hasActiveModification = computed(() => {
    return this.hasSavedModification();
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
    this.form.controls.supportRef.setValue('LEFT', { emitEvent: false });

    this.plotService.plotOptionsChange({
      startSupport: index,
      endSupport: index + 1
    });

    const savedMod = untracked(() => this.plotService.section()?.cable_modifications?.find((m) => m.spanUuid === uuid));
    if (savedMod) {
      this.hasSavedModification.set(false);
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
      this.form.patchValue({ widthCable: 'lengthening', sizeCable: 0, distanceSupportRef: 0 }, { emitEvent: false });
      this.hasSavedModification.set(true);
    }
    this.statesFormControls();
    this.isDirtySinceLastSave.set(false);
  }

  resetForm(): void {
    const currentScope = this.form.controls.scope.value;
    this.form.patchValue(
      {
        supportRef: 'LEFT',
        widthCable: 'lengthening',
        sizeCable: null,
        distanceSupportRef: null
      },
      { emitEvent: false }
    );
    // If there is an active span, keep it selected and its support options
    if (currentScope) {
      this.form.controls.scope.setValue(currentScope, { emitEvent: false });
    }
    this.statesFormControls();
    this.isDirtySinceLastSave.set(false);
  }

  private statesFormControls() {
    this.form.controls.widthCable.markAsPristine();
    this.form.controls.widthCable.markAsUntouched();
    this.form.controls.sizeCable.markAsPristine();
    this.form.controls.sizeCable.markAsUntouched();
    this.form.controls.distanceSupportRef.markAsPristine();
    this.form.controls.distanceSupportRef.markAsUntouched();
    this.form.controls.supportRef.markAsPristine();
    this.form.controls.supportRef.markAsUntouched();
  }

  /** Reload section from DB and update plotService.section signal */
  private async reloadSectionFromDb(): Promise<void> {
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.plotService.section()?.uuid;
    if (!studyUuid || !sectionUuid) return;
    const study = await this.cableModificationsService.getStudy(studyUuid);
    if (!study) return;
    const section = study.sections.find((s) => s?.uuid === sectionUuid);
    if (section) {
      this.plotService.section.set(section);
    }
  }

  async saveForm(): Promise<void> {
    if (this.form.invalid) return;
    const { scope, supportRef, widthCable, sizeCable, distanceSupportRef } = this.form.getRawValue();
    if (!scope || !supportRef || !widthCable || sizeCable === null || distanceSupportRef === null) return;
    this.isLoading.set(true);
    try {
      await this.calculate({ scope, supportRef, widthCable, sizeCable, distanceSupportRef });
      await this.cableModificationsService.save({
        spanUuid: scope,
        supportRef,
        widthCable,
        sizeCable,
        distanceSupportRef
      });
      this.hasSavedModification.set(false);
      await this.reloadSectionFromDb();
      this.isDirtySinceLastSave.set(false);
    } finally {
      this.isLoading.set(false);
    }
  }

  async calculate(params?: {
    scope: string;
    supportRef: 'LEFT' | 'RIGHT';
    widthCable: CableWidthType;
    sizeCable: number;
    distanceSupportRef: number;
  }): Promise<void> {
    const values = params ?? this.form.getRawValue();
    const { scope, supportRef, widthCable, sizeCable, distanceSupportRef } = values;
    if (this.form.invalid && !params) return;
    if (!scope || !supportRef || !widthCable || sizeCable === null || distanceSupportRef === null) return;
    this.error.set(null);
    await this.cableModificationsService.calculate({
      spanUuid: scope,
      supportRef,
      widthCable,
      sizeCable: sizeCable ?? 0,
      distanceSupportRef: distanceSupportRef ?? 0
    });
    const workerError = this.plotService.error();
    this.error.set(workerError ? String(workerError) : null);
  }

  deleteForm(): void {
    const spanUuid = this.form.controls.scope.value;
    const uuid = spanUuid
      ? (this.plotService.section()?.cable_modifications?.find((m) => m.spanUuid === spanUuid)?.uuid ?? null)
      : null;
    if (uuid) {
      this.cableModificationsService.delete(uuid).then(async () => {
        await this.reloadSectionFromDb();
        if (spanUuid) {
          this.cableModificationsService.clearPersistedFormData(spanUuid);
        }
      });
    } else {
      // Suppression des données persistées en mémoire pour ce span
      if (spanUuid) {
        this.cableModificationsService.clearPersistedFormData(spanUuid);
      }
    }
    this.form.patchValue(
      {
        supportRef: 'LEFT',
        widthCable: 'lengthening',
        sizeCable: 0,
        distanceSupportRef: 0
      },
      { emitEvent: false }
    );
    this.hasSavedModification.set(true);
  }

  isFormInvalid(): boolean {
    return this.form.invalid;
  }
}
