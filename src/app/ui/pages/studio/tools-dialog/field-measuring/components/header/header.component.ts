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
  selector: 'app-header',
  imports: [
    SelectModule,
    InputTextModule,
    FormsModule,
    InputGroupModule,
    InputGroupAddonModule,
    IconComponent
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  measureData = input.required<TerrainMeasureData>();
  spanOptions = input.required<SelectOption[]>();
  fieldChange = output<{ field: keyof TerrainMeasureData; value: TerrainMeasureData[keyof TerrainMeasureData] }>();

  onFieldChange(field: keyof TerrainMeasureData, value: TerrainMeasureData[keyof TerrainMeasureData]): void {
    this.fieldChange.emit({ field, value });
  }
}
