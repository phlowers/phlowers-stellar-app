import { Component, computed, input, output, ViewChild } from '@angular/core';
import { Select, SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { DividerModule } from 'primeng/divider';
import { IconComponent } from '../icon/icon.component';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-select-with-buttons',
  imports: [
    SelectModule,
    FormsModule,
    DividerModule,
    IconComponent,
    ButtonComponent
  ],
  templateUrl: './select-with-buttons.component.html',
  styleUrl: './select-with-buttons.component.scss'
})
export class SelectWithButtonsComponent<T extends Record<string, any>> {
  @ViewChild('selectComponent') selectComponent!: Select;
  options = input.required<T[]>();
  selectedOption = input.required<string | undefined | null>();
  optionLabel = input.required<string>();
  optionValue = input.required<string>();
  ariaLabel = input.required<string>();
  placeholder = input<string>('');

  selectOption = output<T>();
  viewOption = output<T>();
  editOption = output<T>();
  duplicateOption = output<T>();
  deleteOption = output<T>();

  selectedOptionLabel = computed(() => {
    return (
      this.options().find(
        (option) => option[this.optionValue()] === this.selectedOption()
      )?.[this.optionLabel()] ?? ''
    );
  });
}
