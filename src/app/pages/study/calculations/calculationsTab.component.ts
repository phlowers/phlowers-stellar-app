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

@Component({
  selector: 'app-calculations-tab',
  standalone: true,
  imports: [
    CardModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    CommonModule,
    DividerModule
  ],
  template: `<div class="flex flex-col gap-2">
    <label i18n for="cable-temperature">Cable Temperature</label>
    <input
      pInputText
      type="number"
      class="w-48"
      id="cable-temperature"
      [(ngModel)]="cableTemperature"
      placeholder="Cable Temperature"
    />
    <p-button label="Run State Change" (onClick)="runStateChange()" />
    <div *ngFor="let result of results(); let i = index">
      <p i18n>Result {{ i }}</p>
      <p i18n>Length: {{ result.lengths | json }}</p>
      <p i18n>Parameter: {{ result.parameters | json }}</p>
      <p-divider />
    </div>
  </div>`
})
export class CalculationsTabComponent {
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
