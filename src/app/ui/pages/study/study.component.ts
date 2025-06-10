/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { WorkerService } from '@core/services/worker_python/worker_python.service';
import { Task } from '@core/services/worker_python/tasks';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';

const initialData = {
  name: ['1', '2', 'three', 'support 4'],
  suspension: [false, true, true, false],
  conductor_attachment_altitude: [50.0, 40.0, 20.0, 10.0],
  crossarm_length: [5.0, 5.0, 5.0, 5.0],
  line_angle: [0.0, 0.0, 0.0, 0.0],
  insulator_length: [0, 4, 3.2, 0],
  span_length: [100, 200, 300, 0]
};

const initialDataObjects = initialData.name.map((name, index) => ({
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
    ButtonModule,
    ProgressSpinnerModule,
    CommonModule,
    TableModule,
    InputTextModule,
    FormsModule,
    CheckboxModule
  ],
  template: `<div>
    <div class="pb-5">
      <p-button i18n [loading]="loading" (click)="runPython()">Run</p-button>
      <p-button i18n styleClass="ml-5" severity="info" (click)="addSupport()"
        >Add support</p-button
      >
    </div>
    <p-table [value]="dataToObject" [tableStyle]="{ 'min-width': '50rem' }">
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
          <td
            [pEditableColumn]="support.suspension"
            pEditableColumnField="suspension"
          >
            <p-checkbox
              [(ngModel)]="support.suspension"
              [binary]="true"
              [value]="support.suspension"
              [falseValue]="false"
              [trueValue]="true"
            />

            <!-- <p-cellEditor>
              <ng-template #input>
                <p-checkbox [(ngModel)]="support.suspension" [binary]="true" [value]="support.suspension" [falseValue]="false" [trueValue]="true" />
              </ng-template>
              <ng-template #output>
                <p-checkbox [(ngModel)]="support.suspension" [binary]="true" [value]="support.suspension" [falseValue]="false" [trueValue]="true" />
              </ng-template>
            </p-cellEditor> -->
          </td>
          <td
            [pEditableColumn]="support.conductor_attachment_altitude"
            pEditableColumnField="conductor_attachment_altitude"
          >
            <p-cellEditor>
              <ng-template #input>
                <input
                  pInputText
                  type="number"
                  [(ngModel)]="support.conductor_attachment_altitude"
                />
              </ng-template>
              <ng-template #output>
                {{ support.conductor_attachment_altitude }}
              </ng-template>
            </p-cellEditor>
          </td>
          <td
            [pEditableColumn]="support.crossarm_length"
            pEditableColumnField="crossarm_length"
          >
            <p-cellEditor>
              <ng-template #input>
                <input
                  pInputText
                  type="number"
                  [(ngModel)]="support.crossarm_length"
                />
              </ng-template>
              <ng-template #output>
                {{ support.crossarm_length }}
              </ng-template>
            </p-cellEditor>
          </td>
          <td
            [pEditableColumn]="support.line_angle"
            pEditableColumnField="line_angle"
          >
            <p-cellEditor>
              <ng-template #input>
                <input
                  pInputText
                  type="number"
                  [(ngModel)]="support.line_angle"
                />
              </ng-template>
              <ng-template #output>
                {{ support.line_angle }}
              </ng-template>
            </p-cellEditor>
          </td>
          <td
            [pEditableColumn]="support.insulator_length"
            pEditableColumnField="insulator_length"
          >
            <p-cellEditor>
              <ng-template #input>
                <input
                  pInputText
                  type="number"
                  [(ngModel)]="support.insulator_length"
                />
              </ng-template>
              <ng-template #output>
                {{ support.insulator_length }}
              </ng-template>
            </p-cellEditor>
          </td>
          <td
            [pEditableColumn]="support.span_length"
            pEditableColumnField="span_length"
          >
            <p-cellEditor>
              <ng-template #input>
                <input
                  pInputText
                  type="number"
                  [(ngModel)]="support.span_length"
                />
              </ng-template>
              <ng-template #output>
                {{ support.span_length }}
              </ng-template>
            </p-cellEditor>
          </td>
        </tr>
      </ng-template>
    </p-table>
    <div id="plotly-output1"></div>
  </div>`
})
export class StudyComponent implements OnInit {
  workerReady = false;
  subscriptions = new Subscription();
  loading = true;
  dataToObject = initialDataObjects;
  constructor(private readonly workerService: WorkerService) {}

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

  addSupport() {
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

  runPython() {
    const data = {
      name: this.dataToObject.map((item) => item.name),
      suspension: this.dataToObject.map((item) => item.suspension),
      conductor_attachment_altitude: this.dataToObject.map(
        (item) => item.conductor_attachment_altitude
      ),
      crossarm_length: this.dataToObject.map((item) => item.crossarm_length),
      line_angle: this.dataToObject.map((item) => item.line_angle),
      insulator_length: this.dataToObject.map((item) => item.insulator_length),
      span_length: this.dataToObject.map((item) => item.span_length)
    };

    this.workerService.runTask(Task.runPython, data);
  }
}
