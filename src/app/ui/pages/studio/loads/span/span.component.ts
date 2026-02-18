import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputText } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Subscription } from 'rxjs';
import { PlotService } from '../../services/plot.service';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ChargesService } from '@services/charges/charges.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { LoadFormsService } from '../loadForms.service';
import { emptySpanLoad } from '../helpers';
import { LoadType } from '@core/domain/models/charge.model';

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
export class SpanComponent implements OnDestroy {
  private readonly subscriptions = new Subscription();
  private readonly fb = inject(FormBuilder);

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

  findSelectedLoad = () => {
    const uuidToFind = this.form.get('spanSelect')?.value?.uuid;
    let load = undefined;
    if (uuidToFind) {
      load = this.plotService.temporaryLoadData?.spanLoads.find(
        (spanLoad) => spanLoad.supportUuid === uuidToFind
      );
    }
    return load;
  };

  constructor(
    public readonly plotService: PlotService,
    public readonly chargesService: ChargesService,
    public readonly loadFormsService: LoadFormsService,
    public readonly workerPythonService: WorkerPythonService
  ) {
    this.subscriptions.add(
      this.form
        .get('spanSelect')
        ?.valueChanges.subscribe((value: { index: number; uuid: string }) => {
          this.supportsOptions.set([
            {
              label: (value.index + 1).toString(),
              value: 'LEFT'
            },
            {
              label: (value.index + 2).toString(),
              value: 'RIGHT'
            }
          ]);
          if (value) {
            this.form.get('referenceSupport')?.enable();
          } else {
            this.form.get('referenceSupport')?.disable();
          }
          const load = this.findSelectedLoad();
          if (load !== undefined) {
            this.form
              .get('referenceSupport')
              ?.setValue(load?.referenceSupport, { emitEvent: false });
            this.form.get('type')?.setValue(load!.type, { emitEvent: false });
            this.form
              .get('loadWeight')
              ?.setValue(load?.loadWeight ?? 0, { emitEvent: false });
            this.form
              .get('loadPosition')
              ?.setValue(load?.loadPosition ?? 0, { emitEvent: false });
          }
        })
    );
    ['loadPosition', 'loadWeight', 'type', 'referenceSupport'].forEach(
      (controlName) => {
        this.subscriptions.add(
          this.form.get(controlName)?.valueChanges.subscribe((value) => {
            const load = this.findSelectedLoad();
            if (load) {
              (load as any)[controlName] =
                value ?? (emptySpanLoad as any)[controlName];
              if (controlName === 'type' && value === LoadType.MARKING) {
                // reset load weight when type is changed
                this.form.get('loadWeight')?.setValue(0);
              }
            }
          })
        );
      }
    );
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

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
