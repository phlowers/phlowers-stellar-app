/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, effect, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { WorkerService } from '../../core/engine/worker/worker.service';
import { Task } from '../../core/engine/worker/tasks';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { TabsModule } from 'primeng/tabs';
import { DividerModule } from 'primeng/divider';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import Plotly from 'plotly.js';

// declare const Plotly: PlotlyTypes;

const initialData = {
  name: ['support 1', 'support 2', 'support 3', 'support 4', 'support 5', 'support 6', 'support 7'],
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
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 }
  ],
  height: [10, 10, 10, 10],
  width: [10, 10, 10, 10],
  length: [10, 10, 10, 10]
};

const initialObstaclesObjects: Obstacle[] = initialObstacles.name.map((name, index) => ({
  name,
  type: initialObstacles.type[index],
  support: initialObstacles.support[index],
  position: initialObstacles.position[index],
  height: initialObstacles.height[index],
  width: initialObstacles.width[index],
  length: initialObstacles.length[index]
}));

const initialDataObjects: Support[] = initialData.name.map((name, index) => ({
  name,
  suspension: initialData.suspension[index],
  conductor_attachment_altitude: initialData.conductor_attachment_altitude[index],
  crossarm_length: initialData.crossarm_length[index],
  line_angle: initialData.line_angle[index],
  insulator_length: initialData.insulator_length[index],
  span_length: initialData.span_length[index]
}));

interface Obstacle {
  name: string;
  type: string;
  support: string;
  position: {
    x: number;
    y: number;
  };
  height: number;
  width: number;
  length: number;
}

interface Support {
  name: string;
  suspension: boolean;
  conductor_attachment_altitude: number;
  crossarm_length: number;
  line_angle: number;
  insulator_length: number;
  span_length: number;
}

interface Data {
  general: {
    sagging: {
      temperature: number | null;
      parameter: number | null;
    };
    cable: {
      section: number | null;
      diameter: number | null;
      linear_weight: number | null;
      young_modulus: number | null;
      dilatation_coefficient: number | null;
      temperature_reference: number | null;
      a0: number | null;
      a1: number | null;
      a2: number | null;
      a3: number | null;
      a4: number | null;
      b0: number | null;
      b1: number | null;
      b2: number | null;
      b3: number | null;
      b4: number | null;
    };
    weather: {
      wind_pressure: number | null;
      ice_thickness: number | null;
    };
  };
  obstacles: Obstacle[];
  supports: Support[];
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [ButtonModule, ProgressSpinnerModule, CommonModule, CommonModule, TableModule, InputTextModule, FormsModule, CheckboxModule, TabsModule, CardModule, DividerModule, DialogModule],
  template: `<div>
    <!-- <p-dialog dismissableMask="true" [style]="{ width: '80vw', height: '90vh' }" header="Add Obstacle" [(visible)]="isObstacleModalOpen" (onHide)="closeObstacleModal()" [modal]="true">
      <ng-template #content>
        <div class="flex flex-col gap-2">
          <div class="grid grid-cols-2 gap-5">
            <label for="username">Type</label>
            <input styleClass="w-50" placeholder="Set type" pInputText id="username" aria-describedby="username-help" [(ngModel)]="newObstacle.type" />
          </div>
          <div class="grid grid-cols-2 gap-5">
            <label for="username">Support</label>
            <input styleClass="w-50" placeholder="Set support" pInputText id="username" aria-describedby="username-help" [(ngModel)]="newObstacle.support" />
          </div>
          <div class="grid grid-cols-2 gap-5">
            <label for="username">Position</label>
            <input styleClass="w-50" placeholder="Set position" pInputText id="username" aria-describedby="username-help" [ngModel]="newObstacle.position | json" />
          </div>
          <div class="grid grid-cols-2 gap-5">
            <label for="username">Height</label>
            <input styleClass="w-50" placeholder="Set height" pInputText id="username" aria-describedby="username-help" [(ngModel)]="newObstacle.height" />
          </div>
          <div class="grid grid-cols-2 gap-5">
            <label for="username">Width</label>
            <input styleClass="w-50" placeholder="Set width" pInputText id="username" aria-describedby="username-help" [(ngModel)]="newObstacle.width" />
          </div>
          <div class="grid grid-cols-2 gap-5">
            <label for="username">Length</label>
            <input styleClass="w-50" placeholder="Set length" pInputText id="username" aria-describedby="username-help" [(ngModel)]="newObstacle.length" />
          </div>
        </div>
      </ng-template>
    </p-dialog> -->
    <p-tabs value="Obstacles">
      <p-tablist>
        <p-tab [value]="tab" *ngFor="let tab of tabs">{{ tab }}</p-tab>
      </p-tablist>
      <p-tabpanels>
        <p-tabpanel value="General">
          <div class="grid grid-cols-2 gap-5">
            <p-card [style]="{ overflow: 'hidden', boxShadow: 'rgba(0, 0, 0, 0.02) 0px 1px 3px 0px, rgba(27, 31, 35, 0.15) 0px 0px 0px 1px' }" role="region">
              <ng-template #title><h6 [style]="{ marginBottom: '0' }">Sagging</h6></ng-template>
              <p-divider styleClass="!my-2" />
              <div class="flex flex-col gap-2">
                <label for="username">Temperature</label>
                <input styleClass="w-50" placeholder="Set temperature" pInputText id="username" aria-describedby="username-help" [(ngModel)]="data.general.sagging.temperature" />
                <label for="username">Parameter</label>
                <input styleClass="w-50" placeholder="Set parameter" pInputText id="username" aria-describedby="username-help" [(ngModel)]="data.general.sagging.temperature" />
              </div>
            </p-card>
            <p-card [style]="{ overflow: 'hidden', boxShadow: 'rgba(0, 0, 0, 0.02) 0px 1px 3px 0px, rgba(27, 31, 35, 0.15) 0px 0px 0px 1px' }" role="region">
              <ng-template #title><h6 [style]="{ marginBottom: '0' }">Weather</h6></ng-template>
              <p-divider styleClass="!my-2" />
              <div class="flex flex-col gap-2">
                <label for="username">Wind pressure</label>
                <input styleClass="w-50" placeholder="Set pressure" pInputText id="username" aria-describedby="username-help" [(ngModel)]="data.general.sagging.temperature" />
                <label for="username">Ice thickness</label>
                <input styleClass="w-50" placeholder="Set ice thickness" pInputText id="username" aria-describedby="username-help" [(ngModel)]="data.general.sagging.temperature" />
              </div>
            </p-card>
            <p-card class="col-span-2" [style]="{ overflow: 'hidden', boxShadow: 'rgba(0, 0, 0, 0.02) 0px 1px 3px 0px, rgba(27, 31, 35, 0.15) 0px 0px 0px 1px' }" role="region">
              <ng-template #title><h6 [style]="{ marginBottom: '0' }">Cable</h6></ng-template>
              <p-divider styleClass="!my-2" />
              <div class="grid grid-cols-4 gap-5">
                <div class="flex flex-col gap-2">
                  <label for="username">Section</label>
                  <input styleClass="w-50" placeholder="Set section" pInputText id="username" aria-describedby="username-help" [(ngModel)]="data.general.cable.section" />
                </div>
                <div class="flex flex-col gap-2">
                  <label for="username">Diameter</label>
                  <input styleClass="w-50" placeholder="Set diameter" pInputText id="username" aria-describedby="username-help" [(ngModel)]="data.general.cable.diameter" />
                </div>
                <div class="flex flex-col gap-2">
                  <label for="username">Linear weight</label>
                  <input styleClass="w-50" placeholder="Set linear weight" pInputText id="username" aria-describedby="username-help" [(ngModel)]="data.general.cable.linear_weight" />
                </div>
                <div class="flex flex-col gap-2">
                  <label for="username">Young modulus</label>
                  <input styleClass="w-50" placeholder="Set young modulus" pInputText id="username" aria-describedby="username-help" [(ngModel)]="data.general.cable.young_modulus" />
                </div>
                <div class="flex flex-col gap-2">
                  <label for="username">Dilatation coefficient</label>
                  <input styleClass="w-50" placeholder="Set dilatation coefficient" pInputText id="username" aria-describedby="username-help" [(ngModel)]="data.general.cable.dilatation_coefficient" />
                </div>
                <div class="flex flex-col gap-2">
                  <label for="username">Temperature reference</label>
                  <input styleClass="w-50" placeholder="Set temperature reference" pInputText id="username" aria-describedby="username-help" [(ngModel)]="data.general.cable.temperature_reference" />
                </div>
                <div class="flex flex-col gap-2">
                  <label for="username">a0</label>
                  <input styleClass="w-50" placeholder="Set a0" pInputText id="username" aria-describedby="username-help" [(ngModel)]="data.general.cable.a0" />
                </div>
                <div class="flex flex-col gap-2">
                  <label for="username">a1</label>
                  <input styleClass="w-50" placeholder="Set a1" pInputText id="username" aria-describedby="username-help" [(ngModel)]="data.general.cable.a1" />
                </div>
                <div class="flex flex-col gap-2">
                  <label for="username">a2</label>
                  <input styleClass="w-50" placeholder="Set a2" pInputText id="username" aria-describedby="username-help" [(ngModel)]="data.general.cable.a2" />
                </div>
                <div class="flex flex-col gap-2">
                  <label for="username">a3</label>
                  <input styleClass="w-50" placeholder="Set a3" pInputText id="username" aria-describedby="username-help" [(ngModel)]="data.general.cable.a3" />
                </div>
                <div class="flex flex-col gap-2">
                  <label for="username">a4</label>
                  <input styleClass="w-50" placeholder="Set a4" pInputText id="username" aria-describedby="username-help" [(ngModel)]="data.general.cable.a4" />
                </div>
                <div class="flex flex-col gap-2">
                  <label for="username">b0</label>
                  <input styleClass="w-50" placeholder="Set b0" pInputText id="username" aria-describedby="username-help" [(ngModel)]="data.general.cable.b0" />
                </div>
                <div class="flex flex-col gap-2">
                  <label for="username">b1</label>
                  <input styleClass="w-50" placeholder="Set b1" pInputText id="username" aria-describedby="username-help" [(ngModel)]="data.general.cable.b1" />
                </div>
                <div class="flex flex-col gap-2">
                  <label for="username">b2</label>
                  <input styleClass="w-50" placeholder="Set b2" pInputText id="username" aria-describedby="username-help" [(ngModel)]="data.general.cable.b2" />
                </div>
                <div class="flex flex-col gap-2">
                  <label for="username">b3</label>
                  <input styleClass="w-50" placeholder="Set b3" pInputText id="username" aria-describedby="username-help" [(ngModel)]="data.general.cable.b3" />
                </div>
                <div class="flex flex-col gap-2">
                  <label for="username">b4</label>
                  <input styleClass="w-50" placeholder="Set b4" pInputText id="username" aria-describedby="username-help" [(ngModel)]="data.general.cable.b4" />
                </div>
              </div>
            </p-card>
          </div>
        </p-tabpanel>
        <p-tabpanel value="Supports">
          <div class="pb-5">
            <!-- <p-button i18n [loading]="loading" (click)="runPython()">Run</p-button> -->
            <p-button i18n severity="info" (click)="addSupport()">Add support</p-button>
            <!-- <p-button i18n styleClass="ml-5" severity="info" (click)="addSupport()">Add random span</p-button> -->
          </div>
          <p-table [paginator]="true" [alwaysShowPaginator]="true" [showCurrentPageReport]="true" [rows]="10" [rowsPerPageOptions]="[10, 20, 30]" [value]="dataToObject" [tableStyle]="{ 'min-width': '50rem' }">
            <ng-template #header>
              <tr>
                <th i18n>Name</th>
                <th i18n>Suspension</th>
                <th i18n>Conductor attachment altitude</th>
                <th i18n>Crossarm length</th>
                <th i18n>Line angle</th>
                <th i18n>Insulator length</th>
                <th i18n>Span length</th>
              </tr>
            </ng-template>
            <ng-template #body let-support let-editing="editing">
              <tr>
                <td [pEditableColumn]="support.name" pEditableColumnField="name">
                  <p-cellEditor>
                    <ng-template #input>
                      <input pInputText type="text" [(ngModel)]="support.name" />
                    </ng-template>
                    <ng-template #output>
                      {{ support.name }}
                    </ng-template>
                  </p-cellEditor>
                </td>
                <td [pEditableColumn]="support.suspension" pEditableColumnField="suspension">
                  <p-checkbox [(ngModel)]="support.suspension" [binary]="true" [value]="support.suspension" [falseValue]="false" [trueValue]="true" />
                </td>
                <td [pEditableColumn]="support.conductor_attachment_altitude" pEditableColumnField="conductor_attachment_altitude">
                  <p-cellEditor>
                    <ng-template #input>
                      <input pInputText type="number" [(ngModel)]="support.conductor_attachment_altitude" />
                    </ng-template>
                    <ng-template #output>
                      {{ support.conductor_attachment_altitude }}
                    </ng-template>
                  </p-cellEditor>
                </td>
                <td [pEditableColumn]="support.crossarm_length" pEditableColumnField="crossarm_length">
                  <p-cellEditor>
                    <ng-template #input>
                      <input pInputText type="number" [(ngModel)]="support.crossarm_length" />
                    </ng-template>
                    <ng-template #output>
                      {{ support.crossarm_length }}
                    </ng-template>
                  </p-cellEditor>
                </td>
                <td [pEditableColumn]="support.line_angle" pEditableColumnField="line_angle">
                  <p-cellEditor>
                    <ng-template #input>
                      <input pInputText type="number" [(ngModel)]="support.line_angle" />
                    </ng-template>
                    <ng-template #output>
                      {{ support.line_angle }}
                    </ng-template>
                  </p-cellEditor>
                </td>
                <td [pEditableColumn]="support.insulator_length" pEditableColumnField="insulator_length">
                  <p-cellEditor>
                    <ng-template #input>
                      <input pInputText type="number" [(ngModel)]="support.insulator_length" />
                    </ng-template>
                    <ng-template #output>
                      {{ support.insulator_length }}
                    </ng-template>
                  </p-cellEditor>
                </td>
                <td [pEditableColumn]="support.span_length" pEditableColumnField="span_length">
                  <p-cellEditor>
                    <ng-template #input>
                      <input pInputText type="number" [(ngModel)]="support.span_length" />
                    </ng-template>
                    <ng-template #output>
                      {{ support.span_length }}
                    </ng-template>
                  </p-cellEditor>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabpanel>
        <p-tabpanel value="Obstacles">
          <div class="pb-5">
            <!-- <p-button i18n [loading]="loading" (click)="runPython()">Run</p-button> -->
            <p-button i18n severity="info" (click)="addObstacle()">Add Obstacle</p-button>
            <!-- <p-button i18n styleClass="ml-5" severity="info" (click)="addSupport()">Add random span</p-button> -->
          </div>
          <p-table [paginator]="true" [alwaysShowPaginator]="true" [showCurrentPageReport]="true" [rows]="10" [rowsPerPageOptions]="[10, 20, 30]" [value]="this.data.obstacles" [tableStyle]="{ 'min-width': '50rem' }">
            <ng-template #header>
              <tr>
                <th i18n>Name</th>
                <th i18n>Type</th>
                <th i18n>Support</th>
                <th i18n>Position X</th>
                <th i18n>Position Y</th>
                <th i18n>Height</th>
                <th i18n>Width</th>
                <th i18n>Length</th>
              </tr>
            </ng-template>
            <ng-template #body let-obstacle let-editing="editing">
              <tr>
                <td [pEditableColumn]="obstacle.name" pEditableColumnField="name">
                  <p-cellEditor>
                    <ng-template #input>
                      <input pInputText type="text" [(ngModel)]="obstacle.name" />
                    </ng-template>
                    <ng-template #output>
                      {{ obstacle.name }}
                    </ng-template>
                  </p-cellEditor>
                </td>
                <td [pEditableColumn]="obstacle.type" pEditableColumnField="type">
                  <p-cellEditor>
                    <ng-template #input>
                      <input pInputText type="text" [(ngModel)]="obstacle.type" />
                    </ng-template>
                    <ng-template #output>
                      {{ obstacle.type }}
                    </ng-template>
                  </p-cellEditor>
                </td>
                <td [pEditableColumn]="obstacle.support" pEditableColumnField="support">
                  <p-cellEditor>
                    <ng-template #input>
                      <input pInputText type="text" [(ngModel)]="obstacle.support" />
                    </ng-template>
                    <ng-template #output>
                      {{ obstacle.support }}
                    </ng-template>
                  </p-cellEditor>
                </td>
                <td [pEditableColumn]="obstacle.position.x" pEditableColumnField="position">
                  <p-cellEditor>
                    <ng-template #input>
                      <input pInputText type="number" [(ngModel)]="obstacle.position" />
                    </ng-template>
                    <ng-template #output>
                      {{ obstacle.position.x }}
                    </ng-template>
                  </p-cellEditor>
                </td>
                <td [pEditableColumn]="obstacle.position.y" pEditableColumnField="position">
                  <p-cellEditor>
                    <ng-template #input>
                      <input pInputText type="number" [(ngModel)]="obstacle.position" />
                    </ng-template>
                    <ng-template #output>
                      {{ obstacle.position.y }}
                    </ng-template>
                  </p-cellEditor>
                </td>
                <td [pEditableColumn]="obstacle.height" pEditableColumnField="height">
                  <p-cellEditor>
                    <ng-template #input>
                      <input pInputText type="number" [(ngModel)]="obstacle.height" />
                    </ng-template>
                    <ng-template #output>
                      {{ obstacle.height }}
                    </ng-template>
                  </p-cellEditor>
                </td>
                <td [pEditableColumn]="obstacle.width" pEditableColumnField="width">
                  <p-cellEditor>
                    <ng-template #input>
                      <input pInputText type="number" [(ngModel)]="obstacle.width" />
                    </ng-template>
                    <ng-template #output>
                      {{ obstacle.width }}
                    </ng-template>
                  </p-cellEditor>
                </td>
                <td [pEditableColumn]="obstacle.length" pEditableColumnField="length">
                  <p-cellEditor>
                    <ng-template #input>
                      <input pInputText type="number" [(ngModel)]="obstacle.length" />
                    </ng-template>
                    <ng-template #output>
                      {{ obstacle.length }}
                    </ng-template>
                  </p-cellEditor>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabpanel>
        <p-tabpanel value="Visualisation">
          <div class="pb-5">
            <p-button [loading]="loading" i18n severity="info" (click)="runPython()">Run</p-button>
          </div>
          <div class="grid grid-cols-2 gap-5">
            <p-card class="col-span-2" [style]="{ overflow: 'hidden', boxShadow: 'rgba(0, 0, 0, 0.02) 0px 1px 3px 0px, rgba(27, 31, 35, 0.15) 0px 0px 0px 1px' }">
              <ng-template #title><h6 [style]="{ marginBottom: '0' }">Global view</h6></ng-template>
              <p-divider styleClass="!my-2" />
              <ng-template #content>
                <div id="plotly-output">
                  <!-- <img src="https://placehold.co/300x300" crossorigin="anonymous" alt="plotly" /> -->
                </div>
              </ng-template>
            </p-card>
            <p-card [style]="{ overflow: 'hidden', boxShadow: 'rgba(0, 0, 0, 0.02) 0px 1px 3px 0px, rgba(27, 31, 35, 0.15) 0px 0px 0px 1px' }">
              <ng-template #title><h6 [style]="{ marginBottom: '0' }">Span view</h6></ng-template>
              <p-divider styleClass="!my-2" />
              <ng-template #content>
                <div>
                  <img src="https://placehold.co/300x300" crossorigin="anonymous" alt="plotly" />
                </div>
              </ng-template>
            </p-card>
            <p-card [style]="{ overflow: 'hidden', boxShadow: 'rgba(0, 0, 0, 0.02) 0px 1px 3px 0px, rgba(27, 31, 35, 0.15) 0px 0px 0px 1px' }">
              <ng-template #title><h6 [style]="{ marginBottom: '0' }">Support view</h6></ng-template>
              <p-divider styleClass="!my-2" />
              <ng-template #content>
                <div>
                  <img src="https://placehold.co/300x300" crossorigin="anonymous" alt="plotly" />
                </div>
              </ng-template>
            </p-card>
          </div>
        </p-tabpanel>
      </p-tabpanels>
    </p-tabs>
  </div>`
})
export class StudyComponent implements OnInit {
  workerReady = false;
  subscriptions = new Subscription();
  isObstacleModalOpen = false;
  loading = true;
  dataToObject = initialDataObjects;
  initialObstaclesObjects = initialObstaclesObjects;
  newObstacle: Obstacle = {
    name: '',
    type: '',
    support: '',
    position: {
      x: 0,
      y: 0
    },
    height: 0,
    width: 0,
    length: 0
  };
  tabs = ['General', 'Supports', 'Obstacles', 'Visualisation'];
  currentTab = this.tabs[0];
  data: Data = {
    general: {
      sagging: {
        temperature: null,
        parameter: null
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
        wind_pressure: null,
        ice_thickness: null
      }
    },
    obstacles: initialObstaclesObjects,
    supports: []
  };
  constructor(readonly workerService: WorkerService) {}

  closeObstacleModal() {
    this.isObstacleModalOpen = false;
  }

  openObstacleModal() {
    this.isObstacleModalOpen = true;
  }

  ngOnInit() {
    this.loading = true;
    this.subscriptions.add(
      this.workerService.ready$.subscribe((workerReady) => {
        this.workerReady = workerReady;
        if (workerReady) {
          this.loading = false;
        }
      })
    );
  }

  readonly effect = effect(() => {
    console.log('result in effect', this.workerService.result());
    // create plotly from json
    const result = this.workerService.result();
    if (result) {
      Plotly.newPlot('plotly-output', JSON.parse(result));
    }
  });

  addSupport() {
    const lastSupport = this.dataToObject[this.dataToObject.length - 1];
    if (lastSupport.span_length === 0) {
      lastSupport.span_length = 300;
    }
    this.dataToObject.push({
      name: `support ${this.dataToObject.length + 1}`,
      suspension: false,
      conductor_attachment_altitude: 30,
      crossarm_length: 5,
      line_angle: 0,
      insulator_length: 0,
      span_length: 0
    });
  }

  addObstacle() {
    this.data.obstacles.push({
      name: `obstacle ${this.data.obstacles.length + 1}`,
      type: 'cylinder',
      position: {
        x: 0,
        y: 0
      },
      support: '',
      height: 10,
      width: 10,
      length: 10
    });
  }

  runPython() {
    const data = {
      name: this.dataToObject.map((item) => item.name),
      suspension: this.dataToObject.map((item) => item.suspension),
      conductor_attachment_altitude: this.dataToObject.map((item) => item.conductor_attachment_altitude),
      crossarm_length: this.dataToObject.map((item) => item.crossarm_length),
      line_angle: this.dataToObject.map((item) => item.line_angle),
      insulator_length: this.dataToObject.map((item) => item.insulator_length),
      span_length: this.dataToObject.map((item) => item.span_length)
    };
    const inputs = {
      sections: data,
      cable: this.data.general.cable
    };

    this.workerService.runTask(Task.runPython, inputs);
  }
}
