import { ChangeDetectionStrategy, Component, computed, effect, inject, Signal, signal, untracked } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputText } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { CableModification } from '@shared/domain';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import {
  CableLengthChangeFormControls,
  CableWidthType,
  CableModificationControlName
} from './cable-length-change.interfaces';
import { CableModificationsService } from '../../services/cableModifications.service';
import { LoadFormsService } from '../../services/loadForms.service';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { twoDecimalValidator } from '@shared/helpers/numberValidators';

@Component({
  selector: 'app-cable-length-change',
  imports: [
    ReactiveFormsModule,
    InputText,
    InputGroupModule,
    InputGroupAddonModule,
    SelectModule,
    ButtonComponent,
    IconComponent,
    TranslocoModule
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
  private readonly loadFormsService = inject(LoadFormsService);
  private readonly translocoService = inject(TranslocoService);

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
    modificationType: new FormControl<CableWidthType | null>('lengthening', { validators: [Validators.required] }),
    modifiedLengthCable: new FormControl<number | null>(0, {
      validators: [Validators.required, Validators.min(0), Validators.max(1000), twoDecimalValidator]
    }),
    distanceSupportRef: new FormControl<number | null>(0, {
      validators: [Validators.required, Validators.min(0), Validators.max(5000), twoDecimalValidator]
    })
  });

  private readonly scopeSignal = toSignal(this.form.controls.scope.valueChanges, {
    initialValue: this.form.controls.scope.value
  });

  readonly scopeValue = computed(() => this.scopeSignal());

  /** Span options per RG.LON-CAB.POR.1. */
  readonly spansOptions = this.spanService.getSpanOptions;

  readonly supportRefOptions = signal<{ label: string; value: 'LEFT' | 'RIGHT' }[]>([]);

  readonly modificationTypeOptions = [
    {
      label: this.translocoService.translate('shared.studio.cable-mod-lengthening'),
      value: 'lengthening' as CableWidthType
    },
    {
      label: this.translocoService.translate('shared.studio.cable-mod-shortening'),
      value: 'shortening' as CableWidthType
    }
  ];

  hasSavedModification = signal<boolean>(true);
  readonly hasActiveModification = computed(() => {
    return this.hasSavedModification();
  });

  private previousSectionUuid: string | null = null;

  private readonly cableModificationControlSignals: Record<CableModificationControlName, Signal<unknown>> = {
    supportRef: toSignal(this.form.controls.supportRef.valueChanges, {
      initialValue: this.form.controls.supportRef.value,
      equal: () => false
    }),
    modificationType: toSignal(this.form.controls.modificationType.valueChanges, {
      initialValue: this.form.controls.modificationType.value,
      equal: () => false
    }),
    modifiedLengthCable: toSignal(this.form.controls.modifiedLengthCable.valueChanges, {
      initialValue: this.form.controls.modifiedLengthCable.value,
      equal: () => false
    }),
    distanceSupportRef: toSignal(this.form.controls.distanceSupportRef.valueChanges, {
      initialValue: this.form.controls.distanceSupportRef.value,
      equal: () => false
    })
  };

  private readonly scopeEffect = effect(() => {
    this.onScopeChange(this.scopeSignal() ?? null);
  });

  private readonly supportRefEffect = effect(() => {
    const value = this.cableModificationControlSignals.supportRef();
    if (value !== null) {
      this.onCableModificationControlChange('supportRef', value);
    }
  });

  private readonly modificationTypeEffect = effect(() => {
    const value = this.cableModificationControlSignals.modificationType();
    if (value !== null) {
      this.onCableModificationControlChange('modificationType', value);
    }
  });

  private readonly modifiedLengthCableEffect = effect(() => {
    const value = this.cableModificationControlSignals.modifiedLengthCable();
    if (value !== null) {
      this.onCableModificationControlChange('modifiedLengthCable', value);
    }
  });

  private readonly distanceSupportRefEffect = effect(() => {
    const value = this.cableModificationControlSignals.distanceSupportRef();
    if (value !== null) {
      this.onCableModificationControlChange('distanceSupportRef', value);
    }
  });

  constructor() {
    // Track dirty state when user edits content fields (RG.LON-CAB.ENR-BTN.1)
    merge(
      this.form.controls.modificationType.valueChanges,
      this.form.controls.modifiedLengthCable.valueChanges,
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
      // spanUuid is misleading: is actually same thing as supportUuid
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

    const savedMod = untracked(() => this.findCableModification(uuid));
    if (savedMod) {
      this.hasSavedModification.set(false);
      this.form.patchValue(
        {
          supportRef: savedMod.supportRef,
          modificationType: savedMod.modificationType,
          modifiedLengthCable: savedMod.modifiedLengthCable,
          distanceSupportRef: savedMod.distanceSupportRef
        },
        { emitEvent: false }
      );
    } else {
      this.form.patchValue(
        { modificationType: 'lengthening', modifiedLengthCable: 0, distanceSupportRef: 0 },
        { emitEvent: false }
      );
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
        modificationType: 'lengthening',
        modifiedLengthCable: null,
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
    this.form.controls.modificationType.markAsPristine();
    this.form.controls.modificationType.markAsUntouched();
    this.form.controls.modifiedLengthCable.markAsPristine();
    this.form.controls.modifiedLengthCable.markAsUntouched();
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
    this.isLoading.set(true);
    try {
      await this.loadFormsService.saveTemporaryLoadDataInSection();
      this.hasSavedModification.set(false);
      await this.reloadSectionFromDb();
      this.isDirtySinceLastSave.set(false);
    } finally {
      this.isLoading.set(false);
    }
  }

  async calculateCableLength(): Promise<void> {
    if (this.form.invalid) return;
    this.isCalculatingOnly.set(true);
    this.error.set(null);
    try {
      await this.loadFormsService.calculateLoad();
      const workerError = this.plotService.error();
      this.error.set(workerError ? String(workerError) : null);
    } finally {
      this.isCalculatingOnly.set(false);
    }
  }

  deleteForm(): void {
    const spanUuid = this.form.controls.scope.value;
    const uuid = spanUuid ? (this.findCableModification(spanUuid)?.uuid ?? null) : null;
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
        modificationType: 'lengthening',
        modifiedLengthCable: 0,
        distanceSupportRef: 0
      },
      { emitEvent: false }
    );
    if (spanUuid) {
      this.deleteSelectedCableModification(spanUuid);
    }
    this.cableModificationsService.clearPreview();
    this.hasSavedModification.set(true);
  }

  isFormInvalid(): boolean {
    return this.form.invalid;
  }

  private findCableModification(spanUuid: string): CableModification | undefined {
    return (
      this.plotService.temporaryLoadData?.cableModifParams?.find(
        (cableModification) => cableModification.spanUuid === spanUuid
      ) ??
      this.spanService
        .section()
        ?.cable_modifications?.find((cableModification) => cableModification.spanUuid === spanUuid)
    );
  }

  private findSelectedCableModification(): CableModification | undefined {
    const spanUuid = this.form.controls.scope.value;
    if (!spanUuid) {
      return undefined;
    }

    return this.plotService.temporaryLoadData?.cableModifParams?.find(
      (cableModification) => cableModification.spanUuid === spanUuid
    );
  }

  private ensureSelectedCableModification(): CableModification | undefined {
    const spanUuid = this.form.controls.scope.value;
    const temporaryLoadData = this.plotService.temporaryLoadData;
    if (!spanUuid || !temporaryLoadData) {
      return undefined;
    }

    const selectedCableModification = this.findSelectedCableModification();
    if (selectedCableModification) {
      return selectedCableModification;
    }

    const fallbackCableModification = this.findCableModification(spanUuid);
    const nextCableModification: CableModification = fallbackCableModification
      ? { ...fallbackCableModification }
      : {
          uuid: uuidv4(),
          spanUuid,
          supportRef: this.form.controls.supportRef.value ?? 'LEFT',
          modificationType: this.form.controls.modificationType.value ?? 'lengthening',
          modifiedLengthCable: this.form.controls.modifiedLengthCable.value ?? 0,
          distanceSupportRef: this.form.controls.distanceSupportRef.value ?? 0
        };

    temporaryLoadData.cableModifParams = [...(temporaryLoadData.cableModifParams ?? []), nextCableModification];
    return nextCableModification;
  }

  private deleteSelectedCableModification(spanUuid: string): void {
    const temporaryLoadData = this.plotService.temporaryLoadData;
    if (!temporaryLoadData) {
      return;
    }

    temporaryLoadData.cableModifParams = (temporaryLoadData.cableModifParams ?? []).filter(
      (cableModification) => cableModification.spanUuid !== spanUuid
    );
  }

  private onCableModificationControlChange(controlName: CableModificationControlName, value: unknown): void {
    const cableModification = this.ensureSelectedCableModification();
    if (!cableModification) {
      return;
    }

    switch (controlName) {
      case 'supportRef':
        cableModification.supportRef = value === 'RIGHT' ? 'RIGHT' : 'LEFT';
        break;
      case 'modificationType':
        cableModification.modificationType = value === 'shortening' ? 'shortening' : 'lengthening';
        break;
      case 'modifiedLengthCable':
        cableModification.modifiedLengthCable = typeof value === 'number' ? value : 0;
        break;
      case 'distanceSupportRef':
        cableModification.distanceSupportRef = typeof value === 'number' ? value : 0;
        break;
    }
  }
}
