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

interface FormConfig {
  fields: string[];
  baseRequired: string[];
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
  private subscriptions = new Subscription();

  readonly spans = input.required<SpanOption[]>();
  readonly supports = input.required<SupportOption[]>();

  private readonly selectedSpan = signal<string | null>(null);
  private readonly selectedSupport = signal<number | null>(null);

  private readonly BASE_REQUIRED = ['spanSelect', 'loadType'];

  protected availableSpans = computed(() => {
    if (!this.selectedSupport()) {
      return this.spans();
    }
    return this.spans().filter((span) =>
      span.supports.includes(this.selectedSupport()!)
    );
  });

  protected availableSupports = computed(() => {
    if (!this.selectedSpan()) {
      return this.supports();
    }
    const selectedSpanData = this.spans().find(
      (s) => s.value === this.selectedSpan()
    );
    return this.supports().filter((support) =>
      selectedSpanData?.supports.includes(support.value)
    );
  });

  protected enabledFields = computed(() => {
    const loadType = this.form.get('loadType')?.value;
    return new Set(this.getFormConfig(loadType).fields);
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
    const config = this.getFormConfig(loadType);

    for (const controlName of Object.keys(this.form.controls)) {
      const control = this.form.get(controlName);
      if (control) {
        if (config.fields.includes(controlName)) {
          control.enable();
        } else {
          control.disable();
          control.setValue(null);
        }
      }
    }
  }

  private getFormConfig(loadType: string | null): FormConfig {
    switch (loadType) {
      case 'punctual':
        return {
          fields: [
            'spanSelect',
            'supportNumber',
            'loadType',
            'spanLoad',
            'pointLoadDist'
          ],
          baseRequired: this.BASE_REQUIRED
        };
      case 'distributed':
        return {
          fields: ['spanSelect', 'loadType', 'spanLoad'],
          baseRequired: this.BASE_REQUIRED
        };
      case 'shortlength':
        return {
          fields: ['spanSelect', 'loadType', 'cableLengthChange'],
          baseRequired: this.BASE_REQUIRED
        };
      default:
        return {
          fields: Object.keys(this.form.controls),
          baseRequired: this.BASE_REQUIRED
        };
    }
  }

  private getEnabledFormValues(): Record<string, any> {
    const loadType = this.form.value.loadType;
    const config = this.getFormConfig(loadType);

    return config.fields.reduce(
      (acc, field) => {
        acc[field] = this.form.value[field];
        return acc;
      },
      {} as Record<string, any>
    );
  }

  isFieldEnabled(fieldName: string): boolean {
    const loadType = this.form.get('loadType')?.value;
    const config = this.getFormConfig(loadType);
    return config.fields.includes(fieldName);
  }

  resetForm() {
    this.form.reset({
      spanSelect: [null, Validators.required],
      supportNumber: [null],
      loadType: [null, Validators.required],
      spanLoad: [null],
      cableLengthChange: [null],
      pointLoadDist: [null]
    });

    this.selectedSpan.set(null);
    this.selectedSupport.set(null);
    this.updateFormControlsState();
  }

  eraseForm() {
    alert('erase the load case!');
  }

  submitForm() {
    console.log('Submit (save):', this.getEnabledFormValues());
  }

  calculForm() {
    console.log('Calculus values:');
    for (const [key, val] of Object.entries(this.getEnabledFormValues())) {
      console.log(`${key}: ${val}`);
    }
  }

  isRequiredFieldsEmpty(): boolean {
    const config = this.getFormConfig(this.form.value.loadType);

    return config.baseRequired.some((field) => {
      const control = this.form.get(field);
      return (
        control?.value === null ||
        control?.value === undefined ||
        control?.value === ''
      );
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
