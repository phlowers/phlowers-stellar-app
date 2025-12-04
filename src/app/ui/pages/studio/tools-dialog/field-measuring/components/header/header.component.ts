import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { FieldMeasureData } from '../../types';
import { SelectOption } from '../../constants';

@Component({
  selector: 'app-header',
  imports: [
    FormsModule,
    SelectModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    IconComponent
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  measureData = input.required<FieldMeasureData>();
  spanOptions = input.required<SelectOption[]>();
  fieldChange = output<{
    field: keyof FieldMeasureData;
    value: FieldMeasureData[keyof FieldMeasureData];
  }>();

  onFieldChange(
    field: keyof FieldMeasureData,
    value: FieldMeasureData[keyof FieldMeasureData]
  ): void {
    this.fieldChange.emit({ field, value });
  }
}
