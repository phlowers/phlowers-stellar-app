import { Component, input, output } from '@angular/core';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { TerrainMeasureData } from '../../types';
import { SelectOption } from '../../constants';

@Component({
  selector: 'app-location-fields',
  imports: [
    SelectModule,
    InputTextModule,
    FormsModule,
    InputGroupModule,
    InputGroupAddonModule,
    IconComponent
  ],
  templateUrl: './location-fields.component.html',
  styleUrls: ['./location-fields.component.scss']
})
export class LocationFieldsComponent {
  measureData = input.required<TerrainMeasureData>();
  spanOptions = input.required<SelectOption[]>();
  fieldChange = output<{ field: keyof TerrainMeasureData; value: TerrainMeasureData[keyof TerrainMeasureData] }>();

  onFieldChange(field: keyof TerrainMeasureData, value: TerrainMeasureData[keyof TerrainMeasureData]): void {
    this.fieldChange.emit({ field, value });
  }
}
