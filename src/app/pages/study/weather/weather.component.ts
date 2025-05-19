/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { Data } from '../types';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-weather-tab',
  standalone: true,
  imports: [CardModule, FormsModule, InputTextModule],
  template: `<div class="flex flex-col gap-2">
    <label i18n for="temperature">Wind Pressure</label>
    <input
      placeholder="Set wind pressure"
      pInputText
      class="w-48"
      id="wind_pressure"
      aria-describedby="wind_pressure-help"
      [ngModel]="data().general.weather.wind_pressure"
    />
    <label i18n for="temperature">Ice Thickness</label>
    <input
      placeholder="Set ice thickness"
      pInputText
      class="w-48"
      id="ice_thickness"
      aria-describedby="ice_thickness-help"
      [ngModel]="data().general.weather.ice_thickness"
    />
  </div>`
})
export class WeatherTabComponent {
  data = input.required<Data>();
}
