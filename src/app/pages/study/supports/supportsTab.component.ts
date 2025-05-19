/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, Input, Output, EventEmitter } from '@angular/core';
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

interface Support {
  name: string;
  suspension: boolean;
  conductor_attachment_altitude: number;
  crossarm_length: number;
  line_angle: number;
  insulator_length: number;
  span_length: number;
}

@Component({
  selector: 'app-supports-tab',
  standalone: true,
  imports: [
    ButtonModule,
    ProgressSpinnerModule,
    CommonModule,
    TableModule,
    InputTextModule,
    FormsModule,
    CheckboxModule,
    TabsModule,
    CardModule,
    DividerModule,
    DialogModule
  ],
  template: `<div>
    <div class="pb-5">
      <p-button i18n severity="info" (click)="addSupport()"
        >Add support</p-button
      >
    </div>
    <p-table
      [paginator]="true"
      [alwaysShowPaginator]="true"
      [showCurrentPageReport]="true"
      [rows]="10"
      [rowsPerPageOptions]="[10, 20, 30]"
      [value]="supports"
      [tableStyle]="{ 'min-width': '50rem' }"
    >
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
  </div>`
})
export class SupportsTabComponent {
  @Input() supports: Support[] = [];
  @Output() supportsChange = new EventEmitter<Support[]>();

  // ngOnInit() {
  //   // if (!this.supports || this.supports.length === 0) {
  //   //   this.supports = initialDataObjects;
  //   // }
  // }

  addSupport() {
    const lastSupport = this.supports[this.supports.length - 1];
    if (lastSupport && lastSupport.span_length === 0) {
      lastSupport.span_length = 300;
    }

    const newSupport: Support = {
      name: `support ${this.supports.length + 1}`,
      suspension: false,
      conductor_attachment_altitude: 30,
      crossarm_length: 5,
      line_angle: 0,
      insulator_length: 0,
      span_length: 0
    };

    this.supports.push(newSupport);
    this.supportsChange.emit(this.supports);
  }
}
