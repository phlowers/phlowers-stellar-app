import { PlotService } from '@ui/pages/studio/services/plot.service';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputText } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ChargesService } from '@services/charges/charges.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { LoadFormsService } from '../loadForms.service';
import { emptySpanLoad } from '../helpers';
import { LoadType } from '@core/domain/models/charge.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface SupportOption {
  label: string;
  value: 'LEFT' | 'RIGHT';
}

@Component({
  selector: 'app-span',
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
  templateUrl: './span.component.html',
  styleUrl: './span.component.scss'
})
export class SpanComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly plotService = inject(PlotService);
  readonly chargesService = inject(ChargesService);
  readonly loadFormsService = inject(LoadFormsService);
  readonly workerPythonService = inject(WorkerPythonService);

  readonly spansOptions = computed(() => {
    return this.plotService.getSpanOptions();
  });

  readonly supportsOptions = signal<SupportOption[]>([]);

  form: FormGroup = this.fb.group({
    spanSelect: [null, Validators.required],
    referenceSupport: [{ value: null, disabled: true }, Validators.required],
    type: [null, Validators.required],
    loadWeight: [null],
    cableLengthChange: [null],
    loadPosition: [null]
  });

  loadTypeOptions = [
    { label: $localize`Punctual charge`, value: 'punctual' },
    { label: $localize`Marking`, value: 'marking' }
  ];

  ngOnInit() {
    this.form
      .get('spanSelect')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value: string) => this.onSpanSelectChange(value));

    for (const controlName of ['loadPosition', 'loadWeight', 'type', 'referenceSupport']) {
      this.form
        .get(controlName)
        ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((value) => this.onLoadControlChange(controlName, value));
    }
  }

  resetForm() {
    this.form.reset();
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

  private findSelectedLoad() {
    const uuidToFind = this.form.get('spanSelect')?.value;
    if (!uuidToFind) {
      return undefined;
    }
    return this.plotService.temporaryLoadData?.spanLoads.find((spanLoad) => spanLoad.supportUuid === uuidToFind);
  }

  private onSpanSelectChange(value: string) {
    const index = this.plotService.getSupportIndex(value) ?? null;
    if (index === null) {
      return;
    }
    this.supportsOptions.set([
      { label: (index + 1).toString(), value: 'LEFT' },
      { label: (index + 2).toString(), value: 'RIGHT' }
    ]);
    if (value) {
      this.form.get('referenceSupport')?.enable();
    } else {
      this.form.get('referenceSupport')?.disable();
    }
    this.plotService.plotOptionsChange({
      startSupport: index,
      endSupport: index + 1
    });
    const load = this.findSelectedLoad();
    if (load !== undefined) {
      this.form.get('referenceSupport')?.setValue(load?.referenceSupport, { emitEvent: false });
      this.form.get('type')?.setValue(load!.type, { emitEvent: false });
      this.form.get('loadWeight')?.setValue(load?.loadWeight ?? 0, { emitEvent: false });
      this.form.get('loadPosition')?.setValue(load?.loadPosition ?? 0, { emitEvent: false });
    }
  }

  private onLoadControlChange(controlName: string, value: unknown) {
    const load = this.findSelectedLoad();
    if (load) {
      switch (controlName) {
        case 'loadPosition':
          load.loadPosition = typeof value === 'number' ? value : emptySpanLoad.loadPosition;
          break;
        case 'loadWeight':
          load.loadWeight = typeof value === 'number' ? value : emptySpanLoad.loadWeight;
          break;
        case 'type':
          load.type = value === LoadType.MARKING || value === LoadType.PUNCTUAL ? value : emptySpanLoad.type;
          if (load.type === LoadType.MARKING) {
            this.form.get('loadWeight')?.setValue(0);
          }
          break;
        case 'referenceSupport':
          load.referenceSupport = value === 'LEFT' || value === 'RIGHT' ? value : emptySpanLoad.referenceSupport;
          break;
        default:
          break;
      }
    }
  }
}
