/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { v4 as uuidv4 } from 'uuid';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { TabsModule } from 'primeng/tabs';
import { DividerModule } from 'primeng/divider';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { GeneralTabComponent } from './general/generalTab.component';
import { SupportsTabComponent } from './supports/supportsTab.component';
import { ObstaclesTabComponent } from './obstacles/obstaclesTab.component';
import { VisualizationTabComponent } from './visualization/visualizationTab.component';
import { Support, Obstacle, Data } from './types';
import { WeatherTabComponent } from './weather/weather.component';
import { CalculationsTabComponent } from './calculations/calculationsTab.component';

const initialData = {
  name: [
    'support 1',
    'support 2',
    'support 3',
    'support 4',
    'support 5',
    'support 6',
    'support 7'
  ],
  suspension: [false, true, true, false, true, true, true],
  conductor_attachment_altitude: [50.0, 40.0, 20.0, 10.0, 10.0, 10.0, 10.0],
  crossarm_length: [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
  line_angle: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  insulator_length: [0, 4, 3.2, 0, 0, 0, 0],
  span_length: [100, 200, 300, 300, 300, 300, 0]
};

const initialObstacles = {
  name: ['obstacle 1', 'obstacle 2', 'obstacle 3', 'obstacle 4'],
  type: ['tree', 'pole', 'building', 'other'],
  support: ['support 1', 'support 2', 'support 3', 'support 4'],
  position: [
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 }
  ],
  height: [10, 10, 10, 10],
  width: [10, 10, 10, 10],
  length: [10, 10, 10, 10]
};

const initialObstaclesObjects: Obstacle[] = initialObstacles.name.map(
  (name, index) => ({
    uuid: uuidv4(),
    name,
    type: initialObstacles.type[index],
    support: initialObstacles.support[index],
    positions: [initialObstacles.position[index]],
    height: initialObstacles.height[index],
    width: initialObstacles.width[index],
    length: initialObstacles.length[index]
  })
);

const initialDataObjects: Support[] = initialData.name.map((name, index) => ({
  name,
  suspension: initialData.suspension[index],
  conductor_attachment_altitude:
    initialData.conductor_attachment_altitude[index],
  crossarm_length: initialData.crossarm_length[index],
  line_angle: initialData.line_angle[index],
  insulator_length: initialData.insulator_length[index],
  span_length: initialData.span_length[index]
}));

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    GeneralTabComponent,
    VisualizationTabComponent,
    SupportsTabComponent,
    ObstaclesTabComponent,
    ButtonModule,
    ProgressSpinnerModule,
    CommonModule,
    CommonModule,
    TableModule,
    InputTextModule,
    FormsModule,
    CheckboxModule,
    TabsModule,
    CardModule,
    DividerModule,
    DialogModule,
    WeatherTabComponent,
    CalculationsTabComponent
  ],
  template: `<div>
    <p-tabs value="General">
      <p-tablist>
        <p-tab [value]="tab" *ngFor="let tab of tabs">{{ tab }}</p-tab>
      </p-tablist>
      <p-tabpanels>
        <p-tabpanel value="General">
          <app-general-tab></app-general-tab>
        </p-tabpanel>
        <p-tabpanel value="Supports">
          <app-supports-tab [supports]="data.supports"></app-supports-tab>
        </p-tabpanel>
        <p-tabpanel value="Obstacles">
          <app-obstacles-tab
            [initialObstaclesObjects]="data.obstacles"
          ></app-obstacles-tab>
        </p-tabpanel>
        <p-tabpanel value="Weather">
          <app-weather-tab [data]="data"></app-weather-tab>
        </p-tabpanel>
        <p-tabpanel value="Visualization">
          @defer (on viewport) {
            <app-visualization-tab></app-visualization-tab>
          } @placeholder {
            <div></div>
          }
        </p-tabpanel>
        <p-tabpanel value="Calculations">
          <app-calculations-tab [data]="data"></app-calculations-tab>
        </p-tabpanel>
      </p-tabpanels>
    </p-tabs>
  </div>`
})
export class StudyComponent {
  loading = true;
  dataToObject = initialDataObjects;
  tabs = [
    'General',
    'Supports',
    'Obstacles',
    'Weather',
    'Visualization',
    'Calculations'
  ];
  currentTab = this.tabs[0];
  data: Data = {
    general: {
      sagging: {
        temperature: 15,
        parameter: 800
      },
      cable: {
        section: 345.55,
        diameter: 22.4,
        linear_weight: 9.55494,
        young_modulus: 59,
        dilatation_coefficient: 23,
        temperature_reference: 15,
        a0: 0,
        a1: 59,
        a2: 0,
        a3: 0,
        a4: 0,
        b0: 0,
        b1: 0,
        b2: 0,
        b3: 0,
        b4: 0
      },
      weather: {
        wind_pressure: 0.6,
        ice_thickness: 0
      }
    },
    obstacles: initialObstaclesObjects,
    supports: initialDataObjects
  };
}
