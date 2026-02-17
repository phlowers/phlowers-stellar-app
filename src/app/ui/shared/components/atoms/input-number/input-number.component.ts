import {
  Component,
  computed,
  effect,
  forwardRef,
  input,
  signal
} from '@angular/core';
import {
  ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule
} from '@angular/forms';

let nextId = 0;

@Component({
  selector: 'app-input-number',
  imports: [ReactiveFormsModule],
  templateUrl: './input-number.component.html',
  styleUrl: './input-number.component.scss',
  host: {
    '[class.stepper--disabled]': 'disabled()'
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputNumberComponent),
      multi: true
    }
  ]
})
export class InputNumberComponent implements ControlValueAccessor {
  readonly min = input(25);
  readonly max = input(250);
  readonly label = input('');
  readonly placeholder = input('');
  /** Assistive text displayed below the field */
  readonly assistiveText = input('');
  readonly errorMessage = input('');
  /** Indicates whether the field is in an error state */
  readonly hasError = input(false);

  readonly inputId = `input-number-${nextId++}`;
  readonly disabled = signal(false);
  readonly pointsCountControl = new FormControl<number | null>(null);
  readonly pointsCountValue = signal<number | null>(
    this.pointsCountControl.value
  );

  /** ID of the assistive element for aria-describedby */
  readonly assistiveId = computed(() =>
    this.assistiveText() || this.errorMessage()
      ? `${this.inputId}-assistive`
      : null
  );

  /** Text displayed below the field (error takes priority over assistive) */

  readonly displayedAssistiveText = computed(() =>
    this.hasError() ? this.errorMessage() : this.assistiveText()
  );

  readonly isAtMin = computed(
    () => (this.pointsCountValue() ?? 0) === this.min()
  );
  readonly isAtMax = computed(() => {
    console.log('isAtMax computed:', this.pointsCountValue());
    return (this.pointsCountValue() ?? 0) === this.max();
  });

  private onChange: (value: number | null) => void = () => {
    // Callback will be set by registerOnChange
  };
  private onTouched: () => void = () => {
    // Callback will be set by registerOnTouched
  };

  writeValue(value: number | null): void {
    const next = this.clamp(value);
    this.pointsCountControl.setValue(next, { emitEvent: false });
    this.pointsCountValue.set(next);
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
    if (isDisabled) {
      this.pointsCountControl.disable({ emitEvent: false });
    } else {
      this.pointsCountControl.enable({ emitEvent: false });
    }
  }

  increment(): void {
    if (this.disabled()) return;
    const current = this.pointsCountControl.value ?? 0;
    if (current < this.max()) {
      this.updateValue(current + 1);
    }
    this.onTouched();
  }

  decrement(): void {
    if (this.disabled()) return;
    const current = this.pointsCountControl.value ?? 0;
    if (current > this.min()) {
      this.updateValue(current - 1);
    }
    this.onTouched();
  }

  markTouched(): void {
    if (!this.disabled()) {
      this.onTouched();
    }
  }

  private updateValue(value: number | null): void {
    const next = this.clamp(value);
    this.pointsCountControl.setValue(next);
    this.pointsCountValue.set(next);
    this.onChange(next);
  }

  private clamp(value: number | null): number | null {
    if (value == null) return value;
    return Math.min(this.max(), Math.max(this.min(), value));
  }
}
