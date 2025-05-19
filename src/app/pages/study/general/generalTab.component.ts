/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';

interface Data {
  general: {
    name: string;
    uuid: string;
    author_email: string;
    created_at_offline: string;
    updated_at_offline: string;
    saved: boolean;
    sagging: {
      temperature: number | null;
      parameter: number | null;
    };
    section: {
      uuid: string;
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
}

@Component({
  selector: 'app-general-tab',
  standalone: true,
  imports: [
    ButtonModule,
    CommonModule,
    InputTextModule,
    FormsModule,
    CardModule,
    DividerModule
  ],
  template: `
    <div class="grid grid-cols-2 gap-5">
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
          ><h6 i18n [style]="{ marginBottom: '0' }">
            Information
          </h6></ng-template
        >
        <p-divider styleClass="!my-2" />
        <div class="grid grid-cols-2 gap-5">
          <!-- <div class="flex flex-col gap-2">
            <label for="uuid">UUID</label>
            <input
              styleClass="w-50"
              disabled="true"
              pInputText
              id="uuid"
              aria-describedby="uuid-help"
              [(ngModel)]="data.general.uuid"
            />
          </div> -->
          <div class="flex flex-col gap-2">
            <label i18n for="author_email">Author email</label>
            <input
              styleClass="w-50"
              placeholder="Set parameter"
              pInputText
              disabled="true"
              id="parameter"
              aria-describedby="parameter-help"
              [(ngModel)]="data.general.author_email"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label i18n for="author_email">Name</label>
            <input
              styleClass="w-50"
              placeholder="Set parameter"
              pInputText
              disabled="true"
              id="parameter"
              aria-describedby="parameter-help"
              [(ngModel)]="data.general.name"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label i18n for="created_at_offline">Created at offline</label>
            <input
              styleClass="w-50"
              placeholder="Set created at offline"
              pInputText
              disabled="true"
              id="created_at_offline"
              aria-describedby="created_at_offline-help"
              [(ngModel)]="data.general.created_at_offline"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label i18n for="updated_at_offline">Updated at offline</label>
            <input
              styleClass="w-50"
              placeholder="Set updated at offline"
              pInputText
              disabled="true"
              id="updated_at_offline"
              aria-describedby="updated_at_offline-help"
              [(ngModel)]="data.general.updated_at_offline"
            />
          </div>
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
            [(ngModel)]="data.general.sagging.temperature"
          />
          <label i18n for="parameter">Parameter</label>
          <input
            styleClass="w-50"
            placeholder="Set parameter"
            pInputText
            id="parameter"
            aria-describedby="parameter-help"
            [(ngModel)]="data.general.sagging.parameter"
          />
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
              [(ngModel)]="data.general.cable.section"
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
              [(ngModel)]="data.general.cable.diameter"
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
              [(ngModel)]="data.general.cable.linear_weight"
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
              [(ngModel)]="data.general.cable.young_modulus"
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
              [(ngModel)]="data.general.cable.dilatation_coefficient"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label i18n for="temperature_reference"
              >Temperature reference</label
            >
            <input
              styleClass="w-50"
              placeholder="Set temperature reference"
              pInputText
              id="temperature_reference"
              aria-describedby="temperature_reference-help"
              [(ngModel)]="data.general.cable.temperature_reference"
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
              [(ngModel)]="data.general.cable.a0"
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
              [(ngModel)]="data.general.cable.a1"
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
              [(ngModel)]="data.general.cable.a2"
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
              [(ngModel)]="data.general.cable.a3"
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
              [(ngModel)]="data.general.cable.a4"
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
              [(ngModel)]="data.general.cable.b0"
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
              [(ngModel)]="data.general.cable.b1"
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
              [(ngModel)]="data.general.cable.b2"
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
              [(ngModel)]="data.general.cable.b3"
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
              [(ngModel)]="data.general.cable.b4"
            />
          </div>
        </div>
      </p-card>
      <p-card
        [style]="{
          overflow: 'hidden',
          boxShadow:
            'rgba(0, 0, 0, 0.02) 0px 1px 3px 0px, rgba(27, 31, 35, 0.15) 0px 0px 0px 1px'
        }"
        class="col-span-2"
      >
        <ng-template #title
          ><h6 i18n [style]="{ marginBottom: '0' }">Section</h6></ng-template
        >
        <p-divider styleClass="!my-2" />
        <div class="flex flex-col gap-2">
          <label i18n for="section_uuid">Section UUID</label>
          <input
            styleClass="w-50"
            placeholder="Set section UUID"
            pInputText
            id="section_uuid"
            aria-describedby="section_uuid-help"
            [(ngModel)]="data.general.section.uuid"
          />
        </div>
      </p-card>
    </div>
  `
})
export class GeneralTabComponent {
  data: Data = {
    general: {
      uuid: '17d9f185-a89d-45d3-a901-7f049a980b3c',
      name: 'test',
      author_email: 'test@test.com',
      created_at_offline: '2021-01-01',
      updated_at_offline: '2021-01-01',
      saved: false,
      sagging: {
        temperature: 15,
        parameter: 800
      },
      section: {
        uuid: '17d9f185-a89d-45d3-a901-7f049a980b3c'
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
    }
  };

  constructor() {
    //empty
  }
}
