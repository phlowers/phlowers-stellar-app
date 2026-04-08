import { ChangeDetectionStrategy, Component, computed, effect, inject, Signal, signal, untracked } from '@angular/core';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputText } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { PlotService } from '@services/plot/plot.service';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { LoadFormsService } from '../../services/loadForms.service';
import { emptySpanLoad } from '../../helpers';
import { LoadType, SpanLoad } from '@shared/domain/models/charge.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { LoadControlName, SpanFormControls, SupportOption } from './load-marking.interfaces';

@Component({
  selector: 'app-load-marking',
  imports: [
    ReactiveFormsModule,
    InputText,
    InputGroupModule,
    InputGroupAddonModule,
    SelectModule,
    ButtonComponent,
    IconComponent,
    ToggleSwitchModule,
    FormsModule
  ],
  templateUrl: './load-marking.component.html',
  styleUrl: './load-marking.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Component for configuring span-level loads including type, weight, and position relative to supports. */
export class LoadMarkingComponent {
  private readonly fb = inject(FormBuilder);
  private readonly plotService = inject(PlotService);
  readonly loadFormsService = inject(LoadFormsService);

  readonly form = this.fb.group<SpanFormControls>({
    spanSelect: new FormControl<string | null>(null, {
      validators: [Validators.required]
    }),
    referenceSupport: new FormControl<'LEFT' | 'RIGHT' | null>(
      { value: null, disabled: true },
      {
        validators: [Validators.required]
      }
    ),
    type: new FormControl<LoadType>(LoadType.PUNCTUAL, {
      nonNullable: true,
      validators: [Validators.required]
    }),
    loadPosition: new FormControl<number>(0, { nonNullable: true }),
    loadWeight: new FormControl<number>(0, { nonNullable: true })
  });

  readonly spansOptions = computed(() => {
    return this.plotService.getSpanOptions();
  });
  readonly isCalculating = computed(() => this.plotService.loading());

  readonly supportsOptions = signal<SupportOption[]>([]);

  private readonly spanSelectSignal = toSignal(this.form.controls.spanSelect.valueChanges, {
    initialValue: this.form.controls.spanSelect.value
  });

  private readonly loadControlSignals: Record<LoadControlName, Signal<unknown>> = {
    loadPosition: toSignal(this.form.controls.loadPosition.valueChanges, {
      initialValue: this.form.controls.loadPosition.value
    }),
    loadWeight: toSignal(this.form.controls.loadWeight.valueChanges, {
      initialValue: this.form.controls.loadWeight.value
    }),
    type: toSignal(this.form.controls.type.valueChanges, {
      initialValue: this.form.controls.type.value
    }),
    referenceSupport: toSignal(this.form.controls.referenceSupport.valueChanges, {
      initialValue: this.form.controls.referenceSupport.value
    })
  };

  private readonly spanSelectEffect = effect(() => {
    const value = this.spanSelectSignal();
    this.onSpanSelectChange(value ?? null);
  });

  private readonly externalSpanSelectionEffect = effect(() => {
    const uuid = this.loadFormsService.selectedSpanSupportUuid();
    if (uuid) {
      this.form.controls.spanSelect.setValue(uuid);
      this.loadFormsService.selectedSpanSupportUuid.set(null);
    }
  });

  private readonly loadPositionEffect = effect(() => {
    const value = this.loadControlSignals.loadPosition();
    if (value !== undefined) this.onLoadControlChange('loadPosition', value);
  });

  private readonly loadWeightEffect = effect(() => {
    const value = this.loadControlSignals.loadWeight();
    if (value !== undefined) this.onLoadControlChange('loadWeight', value);
  });

  private readonly typeEffect = effect(() => {
    const value = this.loadControlSignals.type();
    if (value !== undefined) this.onLoadControlChange('type', value);
  });

  private readonly referenceSupportEffect = effect(() => {
    const value = this.loadControlSignals.referenceSupport();
    if (value !== undefined) this.onLoadControlChange('referenceSupport', value);
  });

  loadTypeOptions = [
    { label: $localize`Punctual charge`, value: 'punctual' },
    { label: $localize`Marking`, value: 'marking' }
  ];

  resetForm() {
    this.form.reset();
    this.form.controls.referenceSupport.disable();
    this.loadFormsService.initTemporaryLoadData();
  }

  deleteCharge() {
    this.resetForm();
    this.loadFormsService.deleteLoad();
  }

  saveLoadCase() {
    if (this.form.invalid) return;
    this.loadFormsService.saveTemporaryLoadDataInSection();
  }

  async calculateLoadCase() {
    if (this.form.invalid) return;
    this.loadFormsService.calculateLoad();
  }

  isFormInvalid(): boolean {
    return this.form.invalid;
  }

  zoomToSpan(): void {
    const uuid = this.form.controls.spanSelect.value;
    if (!uuid) return;
    const index = this.plotService.getSupportIndex(uuid);
    if (index < 0) return;
    this.plotService.plotOptionsChange({
      startSupport: index,
      endSupport: index + 1
    });
  }

  private findSelectedLoad(): SpanLoad | undefined {
    const uuidToFind = this.form.controls.spanSelect.value;
    if (!uuidToFind) {
      return undefined;
    }
    return this.plotService.temporaryLoadData?.spanLoads.find((spanLoad) => spanLoad.supportUuid === uuidToFind);
  }

  private onSpanSelectChange(supportUuid: string | null) {
    if (!supportUuid) {
      this.supportsOptions.set([]);
      this.form.controls.referenceSupport.reset();
      this.form.controls.referenceSupport.disable();
      return;
    }

    const index = untracked(() => this.plotService.getSupportIndex(supportUuid));
    if (index < 0) {
      return;
    }

    this.supportsOptions.set(untracked(() => this.plotService.getSupportOptions(supportUuid)));
    this.form.controls.referenceSupport.enable({ emitEvent: false });
    this.applySelectedLoadValues();
  }

  private applySelectedLoadValues(): void {
    const load = this.findSelectedLoad();
    if (!load) {
      return;
    }
    this.form.controls.referenceSupport.setValue(load.referenceSupport, {
      emitEvent: false
    });
    this.form.controls.type.setValue(load.type, { emitEvent: false });
    this.form.controls.loadWeight.setValue(load.loadWeight ?? 0);
    this.form.controls.loadPosition.setValue(load.loadPosition ?? 0);
  }

  private onLoadControlChange(controlName: LoadControlName, value: unknown) {
    const load = this.findSelectedLoad();
    if (!load) {
      return;
    }

    switch (controlName) {
      case 'loadPosition':
        load.loadPosition = typeof value === 'number' ? value : emptySpanLoad.loadPosition;
        break;
      case 'loadWeight':
        load.loadWeight = typeof value === 'number' ? value : emptySpanLoad.loadWeight;
        break;
      case 'type':
        if (value === LoadType.PUNCTUAL || value === LoadType.MARKING) {
          load.type = value;
        } else {
          load.type = emptySpanLoad.type;
        }
        if (load.type === LoadType.MARKING) {
          load.loadWeight = 0;
          this.form.controls.loadWeight.setValue(0, { emitEvent: false });
        }
        break;
      case 'referenceSupport':
        if (value === 'LEFT' || value === 'RIGHT') {
          load.referenceSupport = value;
        } else {
          load.referenceSupport = emptySpanLoad.referenceSupport;
        }
        break;
    }
  }
}
