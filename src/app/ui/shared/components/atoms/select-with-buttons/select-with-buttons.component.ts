import {
  Component,
  computed,
  effect,
  input,
  OnInit,
  output,
  signal,
  ViewChild
} from '@angular/core';
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
export class SelectWithButtonsComponent<T extends Record<string, any>>
  implements OnInit
{
  @ViewChild('selectComponent') selectComponent!: Select;
  options = input.required<T[]>();
  selectedOption = input.required<string | undefined | null>();
  optionLabel = input.required<string>();
  optionValue = input.required<string>();
  ariaLabel = input.required<string>();
  placeholder = input<string>('');
  showClear = input<boolean>(false);

  selectOption = output<T>();
  viewOption = output<T>();
  editOption = output<T>();
  duplicateOption = output<T>();
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
      this.options().find(
        (option) => option[this.optionValue()] === this.selectedOption()
      )?.[this.optionLabel()] ?? ''
    );
  });

  onSelectionChange(value: string | undefined | null) {
    this.selectedOptionValue.set(value);
    if (value) {
      const selectedItem = this.options().find(
        (option) => option[this.optionValue()] === value
      );
      if (selectedItem) {
        this.selectOption.emit(selectedItem);
      }
    }
  }

  clearSelectedOptionValue() {
    this.selectedOptionValue.set(undefined);
    this.selectOption.emit(undefined as any);
    if (this.selectComponent) {
      this.selectComponent.writeValue(null);
      this.selectComponent.updateModel(null, null);
    }
  }

  onSelectItem(item: T) {
    this.selectedOptionValue.set(item[this.optionValue()]);
    this.selectOption.emit(item);
    this.selectComponent.hide();
  }
}
