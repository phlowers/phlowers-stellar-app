import { Component, computed, OnDestroy, signal } from '@angular/core';
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
import { ChargesService } from '@src/app/core/services/charges/charges.service';
import { LoadsService } from '../../services/loads.service';
import { WorkerPythonService } from '@core/services/worker_python/worker-python.service';
import { Task } from '@src/app/core/services/worker_python/tasks/types';

interface SpanOption {
  label: string;
  value: number[];
  supports: number[];
}

interface SupportOption {
  label: string;
  value: number;
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

  readonly spans = computed<SpanOption[]>(() => {
    const supportsLength =
      this.plotService.plotOptions().endSupport -
      this.plotService.plotOptions().startSupport +
      1;
    const spanAmount = Math.max(supportsLength - 1, 0);
    // create an array the length of spanAmount
    const spans = Array.from({ length: spanAmount }, (_, index) => ({
      label: `${index + 1} - ${index + 2}`,
      value: [index, index + 1],
      supports: [index, index + 1]
    }));
    return spans;
  });
  readonly supports = computed<SupportOption[]>(() => {
    return (
      this.selectedSpan()?.map((support) => ({
        label: (support + 1).toString(),
        value: support
      })) || []
    );
  });

  selectedSpan = signal<number[] | null>(null);
  selectedSupport = signal<number | null>(null);

  form: FormGroup;

  loadTypeOptions = [
    { label: $localize`Punctual`, value: 'punctual' },
    { label: $localize`Marking`, value: 'marking' }
  ];

  constructor(
    private readonly fb: FormBuilder,
    public readonly plotService: PlotService,
    public readonly chargesService: ChargesService,
    public readonly loadsService: LoadsService,
    public readonly workerPythonService: WorkerPythonService
  ) {
    this.form = this.fb.group({
      spanSelect: [null, Validators.required],
      supportNumber: [{ value: null, disabled: true }, Validators.required],
      loadType: [null, Validators.required],
      spanLoad: [null],
      cableLengthChange: [null],
      pointLoadDist: [null]
    });

    this.subscriptions.add(
      this.form.get('spanSelect')?.valueChanges.subscribe((value) => {
        this.selectedSpan.set(value);
        // Enable supportNumber when a span is selected, disable when cleared
        if (value) {
          this.form.get('supportNumber')?.enable();
        } else {
          this.form.get('supportNumber')?.disable();
        }
      })
    );

    this.subscriptions.add(
      this.form.get('supportNumber')?.valueChanges.subscribe((value) => {
        this.selectedSupport.set(value);
      })
    );
  }

  resetForm() {
    this.form.reset();
    this.selectedSpan.set(null);
    this.selectedSupport.set(null);
  }

  deleteLoadCase() {
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.plotService.section()?.uuid;
    const chargeUuid = this.plotService.section()?.selected_charge_uuid;
    if (!studyUuid || !sectionUuid || !chargeUuid) return;
    this.resetForm();
    this.chargesService.deleteCharge(studyUuid, sectionUuid, chargeUuid);
  }

  saveLoadCase() {
    if (this.form.invalid) return;

    // .value automatically excludes disabled fields
    console.log('Submit (save):', this.form.value);
  }

  async calculateLoadCase() {
    if (this.form.invalid) return;

    const { result } = await this.workerPythonService.runTask(Task.addLoad, {
      supportNumber: this.form.get('supportNumber')?.value ?? 0,
      pointLoadDist: this.form.get('pointLoadDist')?.value ?? 0,
      spanLoad: this.form.get('spanLoad')?.value ?? 0
    });
    this.loadsService.addLoadAnnotation(
      result?.coordinates ?? [],
      this.form.get('loadType')?.value
    );

    console.log('Calculus values:', this.form.value);
  }

  isFormInvalid(): boolean {
    return this.form.invalid;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
