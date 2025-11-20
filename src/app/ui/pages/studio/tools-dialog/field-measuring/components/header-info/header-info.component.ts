import { Component, input } from '@angular/core';
import { TerrainMeasureData } from '../../types';

@Component({
  selector: 'app-header-info',
  imports: [],
  templateUrl: './header-info.component.html',
  styleUrls: ['./header-info.component.scss']
})
export class HeaderInfoComponent {
  measureData = input.required<TerrainMeasureData>();
}
