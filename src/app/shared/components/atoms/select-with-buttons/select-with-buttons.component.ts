import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  OnInit,
  output,
  signal,
  viewChild
} from '@angular/core';
import { Select, SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { DividerModule } from 'primeng/divider';
import { IconComponent } from '../icon/icon.component';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-select-with-buttons',
  imports: [SelectModule, FormsModule, DividerModule, IconComponent, ButtonComponent],
  templateUrl: './select-with-buttons.component.html',
  styleUrl: './select-with-buttons.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Generic select dropdown with action buttons (view, edit, duplicate, delete) for each option.
 * @typeParam T - The option object type.
 */
export class SelectWithButtonsComponent<T extends Record<string, any>> implements OnInit {
  readonly selectComponent = viewChild<Select>('selectComponent');
  /** List of selectable options. */
  options = input.required<T[]>();
  /** Currently selected option value. */
  selectedOption = input.required<string | undefined | null>();
  /** Property name used as the display label for each option. */
  optionLabel = input.required<string>();
  /** Property name used as the unique value for each option. */
  optionValue = input.required<string>();
  /** Accessible label for the select element. */
  ariaLabel = input.required<string>();
  /** Placeholder text when no option is selected. */
  placeholder = input<string>('');
  /** Whether to show a clear button to deselect. */
  showClear = input<boolean>(false);

  /** Emitted when an option is selected. */
  selectOption = output<T>();
  /** Emitted when the view action is triggered for an option. */
  viewOption = output<T>();
  /** Emitted when the edit action is triggered for an option. */
  editOption = output<T>();
  /** Emitted when the duplicate action is triggered for an option. */
  duplicateOption = output<T>();
  /** Emitted when the delete action is triggered for an option. */
  deleteOption = output<T>();

  selectedOptionValue = signal<string | undefined | null>(null);

  constructor() {
    effect(() => this.selectedOptionValue.set(this.selectedOption()));
  }

  ngOnInit(): void {
    this.selectedOptionValue.set(this.selectedOption());
  }

  selectedOptionLabel = computed(() => {
    return (
      this.options().find((option) => option[this.optionValue()] === this.selectedOption())?.[this.optionLabel()] ?? ''
    );
  });

  onSelectionChange(value: string | undefined | null) {
    this.selectedOptionValue.set(value);
    if (value) {
      const selectedItem = this.options().find((option) => option[this.optionValue()] === value);
      if (selectedItem) {
        this.selectOption.emit(selectedItem);
      }
    }
  }

  clearSelectedOptionValue() {
    this.selectedOptionValue.set(undefined);
    this.selectOption.emit(undefined as any);
    this.selectComponent()?.writeValue(null);
    this.selectComponent()?.updateModel(null, null);
  }

  onSelectItem(item: T) {
    this.selectedOptionValue.set(item[this.optionValue()]);
    this.selectOption.emit(item);
    this.selectComponent()?.hide();
  }
}
