import { Component, computed, forwardRef, input, signal } from '@angular/core';
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
  /** Valeur minimale autorisée */
  readonly min = input(25);
  /** Valeur maximale autorisée */
  readonly max = input(250);
  /** Label affiché au-dessus du champ */
  readonly label = input('');
  /** Placeholder affiché quand le champ est vide */
  readonly placeholder = input('');
  /** Texte d'aide affiché sous le champ */
  readonly assistiveText = input('');
  /** Message d'erreur affiché sous le champ */
  readonly errorMessage = input('');
  /** Indique si le champ est en état d'erreur */
  readonly hasError = input(false);

  readonly inputId = `input-number-${nextId++}`;
  readonly disabled = signal(false);
  readonly pointsCountControl = new FormControl<number | null>(null);

  /** ID de l'élément assistif pour aria-describedby */
  readonly assistiveId = computed(() =>
    this.assistiveText() || this.errorMessage()
      ? `${this.inputId}-assistive`
      : null
  );

  /** Texte affiché sous le champ (erreur prioritaire sur assistif) */
  readonly displayedAssistiveText = computed(() =>
    this.hasError() ? this.errorMessage() : this.assistiveText()
  );

  readonly isAtMin = computed(
    () => (this.pointsCountControl.value ?? 0) <= this.min()
  );
  readonly isAtMax = computed(
    () => (this.pointsCountControl.value ?? 0) >= this.max()
  );

  private onChange: (value: number | null) => void = () => {
    // Callback will be set by registerOnChange
  };
  private onTouched: () => void = () => {
    // Callback will be set by registerOnTouched
  };

  writeValue(value: number | null): void {
    this.pointsCountControl.setValue(this.clamp(value), { emitEvent: false });
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
    this.onChange(next);
  }

  private clamp(value: number | null): number | null {
    if (value == null) return value;
    return Math.min(this.max(), Math.max(this.min(), value));
  }
}
