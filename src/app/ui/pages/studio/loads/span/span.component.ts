import { Component, computed, input, OnDestroy, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
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

interface SpanOption {
  label: string;
  value: string;
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
    IconComponent
  ],
  templateUrl: './span.component.html',
  styleUrl: './span.component.scss'
})
export class SpanComponent implements OnDestroy {
  private readonly subscriptions = new Subscription();

  readonly spans = input.required<SpanOption[]>();
  readonly supports = input.required<SupportOption[]>();

  private readonly selectedSpan = signal<string | null>(null);
  private readonly selectedSupport = signal<number | null>(null);

  protected availableSpans = computed(() => {
    const support = this.selectedSupport();
    if (!support) return this.spans();

    return this.spans().filter((span) => span.supports.includes(support));
  });

  protected availableSupports = computed(() => {
    const span = this.selectedSpan();
    if (!span) return this.supports();

    const selectedSpanData = this.spans().find((s) => s.value === span);
    if (!selectedSpanData) return this.supports();

    return this.supports().filter((support) =>
      selectedSpanData.supports.includes(support.value)
    );
  });

  form: FormGroup;

  loadTypeOptions = [
    { label: $localize`Punctual`, value: 'punctual' },
    { label: $localize`Distributed`, value: 'distributed' },
    { label: $localize`Shortening / Lengthening`, value: 'shortlength' }
  ];

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.group({
      spanSelect: [null, Validators.required],
      supportNumber: [null],
      loadType: [null, Validators.required],
      spanLoad: [null],
      cableLengthChange: [null],
      pointLoadDist: [null]
    });

    this.subscriptions.add(
      this.form.get('loadType')?.valueChanges.subscribe(() => {
        this.updateFormControlsState();
      })
    );

    this.subscriptions.add(
      this.form.get('spanSelect')?.valueChanges.subscribe((value) => {
        this.selectedSpan.set(value);
      })
    );

    this.subscriptions.add(
      this.form.get('supportNumber')?.valueChanges.subscribe((value) => {
        this.selectedSupport.set(value);
      })
    );
  }

  private updateFormControlsState() {
    const loadType = this.form.get('loadType')?.value;

    // Disable all possible disabled fields then enable those who need to depending on loadType value.
    this.form.get('supportNumber')?.disable();
    this.form.get('spanLoad')?.disable();
    this.form.get('cableLengthChange')?.disable();
    this.form.get('pointLoadDist')?.disable();

    switch (loadType) {
      case 'punctual':
        this.form.get('supportNumber')?.enable();
        this.form.get('spanLoad')?.enable();
        this.form.get('pointLoadDist')?.enable();
        break;
      case 'distributed':
        this.form.get('spanLoad')?.enable();
        break;
      case 'shortlength':
        this.form.get('cableLengthChange')?.enable();
        break;
    }
  }

  resetForm() {
    this.form.reset();
    this.selectedSpan.set(null);
    this.selectedSupport.set(null);
  }

  eraseForm() {
    alert('erase the load case!');
  }

  submitForm() {
    if (this.form.invalid) return;

    // .value automatically excludes disabled fields
    console.log('Submit (save):', this.form.value);
  }

  calculForm() {
    if (this.form.invalid) return;

    console.log('Calculus values:', this.form.value);
  }

  isFormInvalid(): boolean {
    return this.form.invalid;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
