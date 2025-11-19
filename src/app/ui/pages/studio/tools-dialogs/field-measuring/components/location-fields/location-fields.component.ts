import { Component, input, output } from '@angular/core';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { TerrainMeasureData } from '../../types';

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
  spanOptions = input.required<{ label: string; value: string }[]>();
  fieldChange = output<{ field: keyof TerrainMeasureData; value: any }>();

  onFieldChange(field: keyof TerrainMeasureData, value: any) {
    this.fieldChange.emit({ field, value });
  }
}
