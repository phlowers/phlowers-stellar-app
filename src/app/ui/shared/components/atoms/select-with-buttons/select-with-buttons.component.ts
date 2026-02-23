import { Component, computed, effect, input, OnInit, output, signal, ViewChild } from '@angular/core';
import { Select, SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { DividerModule } from 'primeng/divider';
import { IconComponent } from '../icon/icon.component';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-select-with-buttons',
  imports: [SelectModule, FormsModule, DividerModule, IconComponent, ButtonComponent],
  templateUrl: './select-with-buttons.component.html',
  styleUrl: './select-with-buttons.component.scss'
})
/**
 * Generic dropdown select component with action buttons (view, edit, duplicate, delete)
 * rendered alongside each option.
 */
export class SelectWithButtonsComponent<T extends Record<string, any>> implements OnInit {
  @ViewChild('selectComponent') selectComponent!: Select;
  /** List of selectable options. */
  options = input.required<T[]>();
  /** Value of the currently selected option. */
  selectedOption = input.required<string | undefined | null>();
  /** Property name used as the display label for each option. */
  optionLabel = input.required<string>();
  /** Property name used as the unique value for each option. */
  optionValue = input.required<string>();
  /** Accessible label for the select element. */
  ariaLabel = input.required<string>();
  /** Placeholder text shown when no option is selected. */
  placeholder = input<string>('');
  /** Whether a clear button is shown to reset the selection. */
  showClear = input<boolean>(false);

  /** Emits the selected option when the user picks one from the dropdown. */
  selectOption = output<T>();
  /** Emits when the user clicks the "view" action on an option. */
  viewOption = output<T>();
  /** Emits when the user clicks the "edit" action on an option. */
  editOption = output<T>();
  /** Emits when the user clicks the "duplicate" action on an option. */
  duplicateOption = output<T>();
  /** Emits when the user clicks the "delete" action on an option. */
  deleteOption = output<T>();

  /** Internal signal tracking the currently selected option value. */
  selectedOptionValue = signal<string | undefined | null>(null);

  constructor() {
    effect(() => this.selectedOptionValue.set(this.selectedOption()));
  }

  ngOnInit(): void {
    this.selectedOptionValue.set(this.selectedOption());
  }

  /** Computed display label of the currently selected option. */
  selectedOptionLabel = computed(() => {
    return (
      this.options().find((option) => option[this.optionValue()] === this.selectedOption())?.[this.optionLabel()] ?? ''
    );
  });

  /** Handles a selection change from the dropdown and emits the corresponding item. */
  onSelectionChange(value: string | undefined | null) {
    this.selectedOptionValue.set(value);
    if (value) {
      const selectedItem = this.options().find((option) => option[this.optionValue()] === value);
      if (selectedItem) {
        this.selectOption.emit(selectedItem);
      }
    }
  }

  /** Resets the selected option to `undefined` and clears the underlying PrimeNG select. */
  clearSelectedOptionValue() {
    this.selectedOptionValue.set(undefined);
    this.selectOption.emit(undefined as any);
    if (this.selectComponent) {
      this.selectComponent.writeValue(null);
      this.selectComponent.updateModel(null, null);
    }
  }

  /** Selects the given item, updates the internal value, emits the selection, and closes the dropdown. */
  onSelectItem(item: T) {
    this.selectedOptionValue.set(item[this.optionValue()]);
    this.selectOption.emit(item);
    this.selectComponent.hide();
  }
}
