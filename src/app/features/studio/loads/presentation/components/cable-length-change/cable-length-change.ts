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
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
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
  private readonly spanService = inject(PlotSpanService);
  private readonly plotOptionsService = inject(PlotOptionsService);
  private readonly cableModificationsService = inject(CableModificationsService);

  readonly isLoading = signal(false);
  readonly isCalculatingOnly = signal(false);
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

  readonly scopeValue = toSignal(this.form.controls.scope.valueChanges, {
    initialValue: this.form.controls.scope.value
  });

  /** Span options per RG.LON-CAB.POR.1. */
  readonly spansOptions = this.spanService.getSpanOptions;

  readonly supportRefOptions = signal<{ label: string; value: 'LEFT' | 'RIGHT' }[]>([]);

  readonly widthCableOptions = [
    { label: $localize`Lengthening`, value: 'lengthening' as CableWidthType },
    { label: $localize`Shortening`, value: 'shortening' as CableWidthType }
  ];

  hasSavedModification = signal<boolean>(true);
  readonly hasActiveModification = computed(() => {
    return this.hasSavedModification();
  });

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
      const section = this.spanService.section();
      if (!section) {
        untracked(() => {
          this.resetForm();
          this.previousSectionUuid = null;
        });
        return;
      }
      if (section.uuid === this.previousSectionUuid) return;
      this.previousSectionUuid = section.uuid;

      const startIndex = untracked(() => this.plotOptionsService.plotOptions().startSupport);
      const defaultUuid = section.supports?.[startIndex]?.uuid ?? section.supports?.[0]?.uuid ?? null;
      untracked(() => {
        this.form.controls.scope.setValue(defaultUuid);
        if (defaultUuid) this.onScopeChange(defaultUuid);
      });
    });

    // React to a span pre-selection triggered by clicking the cable modification
    // annotation on the section plot. Patches the scope control and re-runs the
    // existing pre-fill flow, then clears the signal so it can fire again.
    effect(() => {
      const spanUuid = this.cableModificationsService.selectedSpanUuid();
      if (!spanUuid) return;
      untracked(() => {
        this.form.controls.scope.setValue(spanUuid);
        this.onScopeChange(spanUuid);
        this.cableModificationsService.clearSelectedSpan();
      });
    });
  }

  onScopeChange(uuid: string | null): void {
    // The preview belongs to the previously-edited span; drop it so the icon
    // falls back to whatever (if anything) was saved for the new scope.
    this.cableModificationsService.clearPreview();
    if (!uuid) {
      this.supportRefOptions.set([]);
      this.form.controls.supportRef.reset();
      this.form.controls.supportRef.disable({ emitEvent: false });
      this.isDirtySinceLastSave.set(false);
      return;
    }
    const index = untracked(() => this.spanService.getSupportIndex(uuid));
    if (index < 0) return;

    this.supportRefOptions.set(untracked(() => this.spanService.getSupportOptions(uuid)));
    this.form.controls.supportRef.enable({ emitEvent: false });
    this.form.controls.supportRef.setValue('LEFT', { emitEvent: false });
    this.plotService.plotOptionsChange({
      startSupport: index,
      endSupport: index + 1
    });

    const savedMod = untracked(() => this.spanService.section()?.cable_modifications?.find((m) => m.spanUuid === uuid));
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

  zoomToSpan(): void {
    const uuid = this.form.controls.scope.value;
    if (!uuid) return;
    const index = this.spanService.getSupportIndex(uuid);
    if (index < 0) return;
    this.plotService.plotOptionsChange({ startSupport: index, endSupport: index + 1 });
  }

  resetForm(): void {
    this.cableModificationsService.clearPreview();
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

  /** Reload section from DB and update spanService.section signal */
  private async reloadSectionFromDb(): Promise<void> {
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.spanService.section()?.uuid;
    if (!studyUuid || !sectionUuid) return;
    const study = await this.cableModificationsService.getStudy(studyUuid);
    if (!study) return;
    const section = study.sections.find((s) => s?.uuid === sectionUuid);
    if (section) {
      this.spanService.section.set(section);
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
    if (!params) this.isCalculatingOnly.set(true);
    this.error.set(null);
    try {
      await this.cableModificationsService.calculate({
        spanUuid: scope,
        supportRef,
        widthCable,
        sizeCable: sizeCable ?? 0,
        distanceSupportRef: distanceSupportRef ?? 0
      });
      const workerError = this.plotService.error();
      this.error.set(workerError ? String(workerError) : null);
    } finally {
      if (!params) this.isCalculatingOnly.set(false);
    }
  }

  deleteForm(): void {
    const spanUuid = this.form.controls.scope.value;
    const uuid = spanUuid
      ? (this.spanService.section()?.cable_modifications?.find((m) => m.spanUuid === spanUuid)?.uuid ?? null)
      : null;
    if (uuid) {
      this.cableModificationsService.delete(uuid).then(async () => {
        await this.reloadSectionFromDb();
        if (spanUuid) {
          this.cableModificationsService.clearPersistedFormData(spanUuid);
        }
      });
    } else if (spanUuid) {
      this.cableModificationsService.clearPersistedFormData(spanUuid);
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
