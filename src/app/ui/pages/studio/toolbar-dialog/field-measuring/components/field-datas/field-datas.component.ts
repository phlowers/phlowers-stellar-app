import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { SelectModule } from 'primeng/select';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { FieldMeasure } from '../../types';
import { TIME_MODE_OPTIONS, WIND_SPEED_UNIT_OPTIONS, WIND_DIRECTION_OPTIONS, SKY_COVER_OPTIONS } from '../../constants';
import { MessageModule } from 'primeng/message';

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
    IconComponent,
    MessageModule
  ],
  templateUrl: './field-datas.component.html',
  styleUrls: ['./field-datas.component.scss']
})
/** Component for editing field measurement data (date, wind, temperature, sky cover). */
export class FieldDatasComponent {
  /** Whether the measure name is already used by another measure. */
  isNameAlreadyTaken = input.required<boolean>();
  /** Current field measure data. */
  measureData = input.required<FieldMeasure>();
  /** Emits when a field value changes. */
  fieldChange = output<{
    field: keyof FieldMeasure;
    value: FieldMeasure[keyof FieldMeasure];
  }>();

  readonly timeModeOptions = TIME_MODE_OPTIONS;
  readonly windSpeedUnitOptions = WIND_SPEED_UNIT_OPTIONS;
  readonly windDirectionOptions = WIND_DIRECTION_OPTIONS;
  readonly skyCoverOptions = SKY_COVER_OPTIONS;

  onFieldChange(field: keyof FieldMeasure, value: FieldMeasure[keyof FieldMeasure]): void {
    this.fieldChange.emit({ field, value });
  }
}
