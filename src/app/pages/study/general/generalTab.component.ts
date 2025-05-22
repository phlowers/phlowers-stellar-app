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
import { Data } from '../types';

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
    </div>
  `
})
export class GeneralTabComponent {
  data: Data = {
    initial_parameters: {
      sagging: {
        temperature: 15,
        parameter: 800
      },
      cable: {
        temperature: 15
      }
    },
    section: {
      uuid: '17d9f185-a89d-45d3-a901-7f049a980b3c',
      name: 'Section 1',
      internalId: '1',

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
      }
    },
    obstacles: [],
    supports: [],
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
