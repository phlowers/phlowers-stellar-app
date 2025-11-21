import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { SelectModule } from 'primeng/select';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { FieldMeasureData } from '../../types';
import {
  TIME_MODE_OPTIONS,
  WIND_SPEED_UNIT_OPTIONS,
  WIND_DIRECTION_OPTIONS,
  SKY_COVER_OPTIONS
} from '../../constants';

@Component({
  selector: 'app-field-datas',
  imports: [
    FormsModule,
    InputTextModule,
    DatePickerModule,
    SelectButtonModule,
    InputGroupModule,
    InputGroupAddonModule,
    SelectModule,
    IconComponent
  ],
  templateUrl: './field-datas.component.html',
  styleUrls: ['./field-datas.component.scss']
})
export class FieldDatasComponent {
  measureData = input.required<FieldMeasureData>();
  fieldChange = output<{ field: keyof FieldMeasureData; value: FieldMeasureData[keyof FieldMeasureData] }>();

  readonly timeModeOptions = TIME_MODE_OPTIONS;
  readonly windSpeedUnitOptions = WIND_SPEED_UNIT_OPTIONS;
  readonly windDirectionOptions = WIND_DIRECTION_OPTIONS;
  readonly skyCoverOptions = SKY_COVER_OPTIONS;

  onFieldChange(field: keyof FieldMeasureData, value: FieldMeasureData[keyof FieldMeasureData]): void {
    this.fieldChange.emit({ field, value });
  }
}