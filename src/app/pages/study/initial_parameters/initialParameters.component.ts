/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, effect, input, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { WorkerService } from '../../../core/engine/worker/worker.service';
import { Task } from '../../../core/engine/worker/tasks';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { Data } from '../types';
import { SupportsTabComponent } from '../supports/supportsTab.component';

@Component({
  selector: 'app-initial-parameters-tab',
  standalone: true,
  imports: [
    CardModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    CommonModule,
    DividerModule,
    SupportsTabComponent
  ],
  template: `<div class="flex flex-col gap-2">
    <p-card
      class="col-span-1"
      [style]="{
        overflow: 'hidden',
        boxShadow:
          'rgba(0, 0, 0, 0.02) 0px 1px 3px 0px, rgba(27, 31, 35, 0.15) 0px 0px 0px 1px'
      }"
      role="region"
    >
      <ng-template #title
        ><h6 i18n [style]="{ marginBottom: '0' }">Sagging</h6></ng-template
      >
      <p-divider styleClass="!my-2" />
      <div class="flex flex-col gap-2">
        <label i18n for="temperature">Temperature</label>
        <input
          styleClass="w-50"
          placeholder="Set temperature"
          pInputText
          id="temperature"
          aria-describedby="temperature-help"
          [(ngModel)]="data().initial_parameters.sagging.temperature"
        />
        <label i18n for="parameter">Parameter</label>
        <input
          styleClass="w-50"
          placeholder="Set parameter"
          pInputText
          id="parameter"
          aria-describedby="parameter-help"
          [(ngModel)]="data().initial_parameters.sagging.parameter"
        />
      </div>
    </p-card>
    <p-card
      class="col-span-1"
      [style]="{
        overflow: 'hidden',
        boxShadow:
          'rgba(0, 0, 0, 0.02) 0px 1px 3px 0px, rgba(27, 31, 35, 0.15) 0px 0px 0px 1px'
      }"
      role="region"
    >
      <ng-template #title
        ><h6 i18n [style]="{ marginBottom: '0' }">Cable</h6></ng-template
      >
      <p-divider styleClass="!my-2" />
      <div class="flex flex-col gap-2">
        <label i18n for="cable-temperature">Temperature</label>
        <input
          styleClass="w-50"
          placeholder="Set temperature"
          pInputText
          id="cable-temperature"
          aria-describedby="cable-temperature-help"
          [(ngModel)]="data().initial_parameters.cable.temperature"
        />
      </div>
    </p-card>
  </div>`
})
export class InitialParametersTabComponent {
  data = input.required<Data>();
  cableTemperature = 20;
  results = signal<{ lengths: number[]; parameters: number[] }[]>([]);
  constructor(private readonly workerService: WorkerService) {}

  readonly effect = effect(async () => {
    const result = this.workerService.result();
    if (!result?.lengths || !result?.parameters) return;
    this.results.update((prev) => [
      ...prev,
      { lengths: result.lengths, parameters: result.parameters }
    ]);
  });

  runStateChange() {
    this.workerService.runTask(Task.runStateChange, {
      cable_temperature: this.cableTemperature
    });
  }
}
