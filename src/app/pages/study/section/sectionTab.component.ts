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
  selector: 'app-section-tab',
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
      class="col-span-2"
      [style]="{
        overflow: 'hidden',
        boxShadow:
          'rgba(0, 0, 0, 0.02) 0px 1px 3px 0px, rgba(27, 31, 35, 0.15) 0px 0px 0px 1px'
      }"
      role="region"
    >
      <ng-template #title
        ><h6 i18n [style]="{ marginBottom: '0' }">Informations</h6></ng-template
      >
      <p-divider styleClass="!my-2" />
      <div class="grid grid-cols-2 gap-5">
        <div class="flex flex-col gap-2">
          <label i18n for="author_email">Name</label>
          <input
            styleClass="w-50"
            placeholder="Set parameter"
            pInputText
            disabled="true"
            id="parameter"
            aria-describedby="parameter-help"
            [(ngModel)]="data().section.name"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label i18n for="author_email">Internal ID</label>
          <input
            styleClass="w-50"
            placeholder="Set parameter"
            pInputText
            disabled="true"
            id="parameter"
            aria-describedby="parameter-help"
            [(ngModel)]="data().section.internalId"
          />
        </div>
      </div>
    </p-card>
    <p-card
      class="col-span-2"
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
      <div class="grid grid-cols-4 gap-5">
        <div class="flex flex-col gap-2">
          <label i18n for="section">Section</label>
          <input
            styleClass="w-50"
            placeholder="Set section"
            pInputText
            id="section"
            aria-describedby="section-help"
            [(ngModel)]="data().section.cable.section"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label i18n for="diameter">Diameter</label>
          <input
            styleClass="w-50"
            placeholder="Set diameter"
            pInputText
            id="diameter"
            aria-describedby="diameter-help"
            [(ngModel)]="data().section.cable.diameter"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label i18n for="linear_weight">Linear weight</label>
          <input
            styleClass="w-50"
            placeholder="Set linear weight"
            pInputText
            id="linear_weight"
            aria-describedby="linear_weight-help"
            [(ngModel)]="data().section.cable.linear_weight"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label i18n for="young_modulus">Young modulus</label>
          <input
            styleClass="w-50"
            placeholder="Set young modulus"
            pInputText
            id="young_modulus"
            aria-describedby="young_modulus-help"
            [(ngModel)]="data().section.cable.young_modulus"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label i18n for="dilatation_coefficient"
            >Dilatation coefficient</label
          >
          <input
            styleClass="w-50"
            placeholder="Set dilatation coefficient"
            pInputText
            id="dilatation_coefficient"
            aria-describedby="dilatation_coefficient-help"
            [(ngModel)]="data().section.cable.dilatation_coefficient"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label i18n for="temperature_reference">Temperature reference</label>
          <input
            styleClass="w-50"
            placeholder="Set temperature reference"
            pInputText
            id="temperature_reference"
            aria-describedby="temperature_reference-help"
            [(ngModel)]="data().section.cable.temperature_reference"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label i18n for="a0">a0</label>
          <input
            styleClass="w-50"
            placeholder="Set a0"
            pInputText
            id="a0"
            aria-describedby="a0-help"
            [(ngModel)]="data().section.cable.a0"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label i18n for="a1">a1</label>
          <input
            styleClass="w-50"
            placeholder="Set a1"
            pInputText
            id="a1"
            aria-describedby="a1-help"
            [(ngModel)]="data().section.cable.a1"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label i18n for="a2">a2</label>
          <input
            styleClass="w-50"
            placeholder="Set a2"
            pInputText
            id="a2"
            aria-describedby="a2-help"
            [(ngModel)]="data().section.cable.a2"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label i18n for="a3">a3</label>
          <input
            styleClass="w-50"
            placeholder="Set a3"
            pInputText
            id="a3"
            aria-describedby="a3-help"
            [(ngModel)]="data().section.cable.a3"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label i18n for="a4">a4</label>
          <input
            styleClass="w-50"
            placeholder="Set a4"
            pInputText
            id="a4"
            aria-describedby="a4-help"
            [(ngModel)]="data().section.cable.a4"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label i18n for="b0">b0</label>
          <input
            styleClass="w-50"
            placeholder="Set b0"
            pInputText
            id="b0"
            aria-describedby="b0-help"
            [(ngModel)]="data().section.cable.b0"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label i18n for="b1">b1</label>
          <input
            styleClass="w-50"
            placeholder="Set b1"
            pInputText
            id="b1"
            aria-describedby="b1-help"
            [(ngModel)]="data().section.cable.b1"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label i18n for="b2">b2</label>
          <input
            styleClass="w-50"
            placeholder="Set b2"
            pInputText
            id="b2"
            aria-describedby="b2-help"
            [(ngModel)]="data().section.cable.b2"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label i18n for="b3">b3</label>
          <input
            styleClass="w-50"
            placeholder="Set b3"
            pInputText
            id="b3"
            aria-describedby="b3-help"
            [(ngModel)]="data().section.cable.b3"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label i18n for="b4">b4</label>
          <input
            styleClass="w-50"
            placeholder="Set b4"
            pInputText
            id="b4"
            aria-describedby="b4-help"
            [(ngModel)]="data().section.cable.b4"
          />
        </div>
      </div>
    </p-card>
    <p-card
      class="col-span-2"
      [style]="{
        overflow: 'hidden',
        boxShadow:
          'rgba(0, 0, 0, 0.02) 0px 1px 3px 0px, rgba(27, 31, 35, 0.15) 0px 0px 0px 1px'
      }"
      role="region"
    >
      <ng-template #title
        ><h6 i18n [style]="{ marginBottom: '0' }">Supports</h6></ng-template
      >
      <p-divider styleClass="!my-2" />
      <app-supports-tab [data]="data()"></app-supports-tab>
    </p-card>
  </div>`
})
export class SectionTabComponent {
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
