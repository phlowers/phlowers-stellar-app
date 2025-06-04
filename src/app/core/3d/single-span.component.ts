/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {
  Component,
  effect,
  input,
  output,
  signal,
  untracked
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { WorkerService } from '@core/services/worker_python/worker_python.service';
import Plotly, { Data, PlotlyHTMLElement, Shape } from 'plotly.js-dist-min';
import { uniq } from 'lodash';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { InputNumberModule } from 'primeng/inputnumber';

interface GetAllPhasesParams {
  litXs: any;
  litYs: any;
  litZs: any;
  litCanton: any;
  litType: any;
  litSupports: any;
  uniqueSupports: any[];
  name: string;
  type: 'face' | 'profile';
}

interface CreatePhasesParams {
  litXs: any;
  litYs: any;
  litZs: any;
  litCanton: any;
  litTypes: any;
  litSupports: any;
  uniqueSupports: any[];
  uniqueSupportsForSupports: any[];
  type: 'face' | 'profile';
}

@Component({
  selector: 'app-single-span',
  standalone: true,
  imports: [
    ButtonModule,
    InputNumberModule,
    ProgressSpinnerModule,
    CommonModule,
    TableModule,
    InputTextModule,
    FormsModule,
    CheckboxModule,
    NgxSliderModule,
    AutoCompleteModule,
    CheckboxModule
  ],
  template: `<div>
    <!-- <p-button label="Run Python" (onClick)="runPython()"></p-button> -->
    <!-- <p-button label="log" (onClick)="log()"></p-button> -->
    <div class="my-5 flex flex-row gap-2 items-end">
      <div class="flex flex-col gap-2 ">
        <label i18n for="vertical" class="mr-2 font-bold">Select span:</label>
        <p-inputnumber
          [(ngModel)]="selectedSpan"
          [showButtons]="true"
          buttonLayout="horizontal"
          spinnerMode="vertical"
          inputId="vertical"
          [inputStyle]="{ maxWidth: '3rem' }"
        >
          <ng-template #incrementbuttonicon>
            <span class="pi pi-plus"></span>
          </ng-template>
          <ng-template #decrementbuttonicon>
            <span class="pi pi-minus"></span>
          </ng-template>
        </p-inputnumber>
      </div>
    </div>
    <div class="flex flex-row gap-2">
      <div style="width: 100%;">
        <div>
          <div i18n>Mouse Position:</div>
          <div i18n>
            x: {{ currentPosition?.x || 'N/A' }}, z:
            {{ currentPosition?.z || 'N/A' }}
          </div>
        </div>
        <div
          id="plotly-output-single-span"
          class="border border-gray-300 rounded-md"
          style="height: 500px; box-sizing: content-box;"
        ></div>
      </div>

      <div style="width: 300px;">
        <div>
          <div i18n>Mouse Position:</div>
          <div i18n>y: {{ currentPosition2?.x || 'N/A' }}</div>
        </div>
        <div
          id="plotly-output-single-span-y"
          class="border border-gray-300 rounded-md box-sizing"
          style="height: 500px; box-sizing: content-box;"
        ></div>
      </div>
      <!-- <div id="plotly-output-points">
        <div *ngFor="let point of points; let i = index">
          position {{ i + 1 }} x: {{ point.x }}, z: {{ point.z }}
        </div>
      </div> -->
      <!-- <div id="plotly-output-points-2">
        <div *ngFor="let point of points2; let i = index">
          position {{ i + 1 }} x: {{ point.x }}, z: {{ point.z }}
        </div>
      </div> -->
    </div>
  </div>`
})
export class SingleSpanComponent {
  constructor(private readonly workerService: WorkerService) {}
  obstacleMode = input.required<boolean>();
  obstacle = input<{
    x: number | null;
    y: number | null;
    z: number | null;
  }>({
    x: null,
    y: null,
    z: null
  });
  obstacleChange = output<{
    x: number | null;
    y: number | null;
    z: number | null;
  }>();
  litData = input<any>(null);
  options = signal<Options>({});
  plotFace = signal<PlotlyHTMLElement | null>(null);
  plotProfile = signal<PlotlyHTMLElement | null>(null);
  phases = signal<string[]>(['all', 'phase_1', 'phase_2', 'phase_3', 'garde']);
  selectedSpan = signal<number>(0);
  points: { x: number; z: number }[] = [];
  currentPosition: { x: string; z: string } | null = null;
  points2: { x: number; z: number }[] = [];
  currentPosition2: { x: string; z: string } | null = null;

  readonly effect2 = effect(() => {
    console.log('effect2 selected span', this.selectedSpan());
    this.createPlot(this.selectedSpan(), 'face');
    this.createPlot(this.selectedSpan(), 'profile');
  });

  readonly effect3 = effect(() => {
    this.litData();
    console.log('effect3 in single span', this.litData());
    this.createPlot(this.selectedSpan(), 'face');
    this.createPlot(this.selectedSpan(), 'profile');
  });

  search() {
    this.phases.set(['all', 'phase_1', 'phase_2', 'phase_3', 'garde']);
  }

  getAllPhases(params: GetAllPhasesParams): Data[] {
    const {
      litXs,
      litYs,
      litZs,
      litCanton,
      litType,
      litSupports,
      uniqueSupports,
      name,
      type
    } = params;
    return uniqueSupports.map((support) => {
      const x = litXs.filter(
        (x: any, index: number) =>
          litSupports[index] === support &&
          litCanton[index] === name &&
          litType[index] === 'span'
      );
      const y = litYs.filter(
        (x: any, index: number) =>
          litSupports[index] === support &&
          litCanton[index] === name &&
          litType[index] === 'span'
      );
      const z = litZs.filter(
        (x: any, index: number) =>
          litSupports[index] === support &&
          litCanton[index] === name &&
          litType[index] === 'span'
      );
      return {
        x: type === 'face' ? y : x,
        z: y,
        y: z,
        type: 'scatter',
        mode: 'lines',
        line: { color: 'red', dash: 'solid' },
        text: name
      };
    });
  }

  getAllSupports(
    litXs: any,
    litYs: any,
    litZs: any,
    litTypes: any,
    litSupports: any,
    uniqueSupports: any[],
    type: 'face' | 'profile'
  ): Data[] {
    return uniqueSupports.map((support) => {
      const x = litXs.filter(
        (x: any, index: number) =>
          litSupports[index] === support && litTypes[index] === 'support'
      );
      const y = litYs.filter(
        (x: any, index: number) =>
          litSupports[index] === support && litTypes[index] === 'support'
      );
      const z = litZs.filter(
        (x: any, index: number) =>
          litSupports[index] === support && litTypes[index] === 'support'
      );
      return {
        x: type === 'face' ? y : x,
        z: y,
        y: z,
        type: 'scatter',
        text: [support.replace('Section ', '')],
        textposition: 'inside',
        mode: 'text+lines',
        line: { color: 'blue' }
      };
    });
  }

  getAllInsulators(
    litXs: any,
    litYs: any,
    litZs: any,
    litTypes: any,
    litSupports: any,
    uniqueSupports: any[],
    type: 'face' | 'profile'
  ): Data[] {
    return uniqueSupports.map((support) => {
      const x = litXs.filter(
        (x: any, index: number) =>
          litSupports[index] === support && litTypes[index] === 'insulator'
      );
      const y = litYs.filter(
        (x: any, index: number) =>
          litSupports[index] === support && litTypes[index] === 'insulator'
      );
      const z = litZs.filter(
        (x: any, index: number) =>
          litSupports[index] === support && litTypes[index] === 'insulator'
      );
      return {
        x: type === 'face' ? y : x,
        z: type === 'face' ? y : x,
        y: z,
        type: 'scatter',
        mode: 'lines',
        line: { color: 'green' }
      };
    });
  }

  log() {
    const gd = document.getElementById('plotly-output-single-span');
    // @ts-expect-error gd is not defined
    console.log('gd', gd?._fullLayout);
  }

  createPhases(params: CreatePhasesParams) {
    const {
      litXs,
      litYs,
      litZs,
      litCanton,
      litTypes,
      litSupports,
      uniqueSupports,
      uniqueSupportsForSupports,
      type
    } = params;

    const phase1 = this.getAllPhases({
      litXs,
      litYs,
      litZs,
      litCanton,
      litType: litTypes,
      litSupports,
      uniqueSupports,
      name: 'phase_1',
      type
    });
    const phase2 = this.getAllPhases({
      litXs,
      litYs,
      litZs,
      litCanton,
      litType: litTypes,
      litSupports,
      uniqueSupports,
      name: 'phase_2',
      type
    });
    const phase3 = this.getAllPhases({
      litXs,
      litYs,
      litZs,
      litCanton,
      litType: litTypes,
      litSupports,
      uniqueSupports,
      name: 'phase_3',
      type
    });
    const gard = this.getAllPhases({
      litXs,
      litYs,
      litZs,
      litCanton,
      litType: litTypes,
      litSupports,
      uniqueSupports,
      name: 'garde',
      type
    });
    const allSupports = this.getAllSupports(
      litXs,
      litYs,
      litZs,
      litTypes,
      litSupports,
      uniqueSupportsForSupports,
      type
    );
    const allInsulators = this.getAllInsulators(
      litXs,
      litYs,
      litZs,
      litTypes,
      litSupports,
      uniqueSupportsForSupports,
      type
    );
    return {
      phase1,
      phase2,
      phase3,
      gard,
      allSupports,
      allInsulators
    };
  }

  async createPlot(selectedSpan: number, type: 'face' | 'profile') {
    const plotId =
      type === 'face'
        ? 'plotly-output-single-span-y'
        : 'plotly-output-single-span';
    const lit = untracked(() => this.litData());
    if (!lit) return;
    const uniqueSupports = uniq(Object.values(lit.support)).slice(
      selectedSpan,
      selectedSpan + 1
    );
    const uniqueSupportsForSupports = uniq(Object.values(lit.support)).slice(
      selectedSpan,
      selectedSpan + 2
    );
    const litXs = Object.values(lit.x);
    const litYs = Object.values(lit.y);
    const litZs = Object.values(lit.z);
    const litTypes = Object.values(lit.type);
    const litCanton = Object.values(lit.canton);
    const litSupports = Object.values(lit.support);
    const { phase1, phase2, phase3, gard, allSupports, allInsulators } =
      this.createPhases({
        litXs,
        litYs,
        litZs,
        litCanton,
        litTypes,
        litSupports,
        uniqueSupports,
        uniqueSupportsForSupports,
        type
      });
    const myElement = document.getElementById(plotId);
    const width = myElement?.clientWidth;
    const data = [
      ...phase1,
      ...phase2,
      ...phase3,
      ...gard,
      ...allSupports,
      ...allInsulators
    ];
    const this2 = this; //eslint-disable-line
    const gd = document.getElementById(plotId);

    function attach() {
      gd?.addEventListener('mousemove', async function (evt) {
        //@ts-expect-error gd is not defined
        const layout = gd?._fullLayout as any;
        if (layout) {
          const x = evt.layerX - layout.margin.l,
            y = evt.layerY - layout.margin.t;
          const line = {
            color: 'green'
          };
          if (this2.obstacleMode()) {
            const shapes: Partial<Shape>[] = [];
            shapes.push({
              name: 'line2',
              type: 'line' as const,
              x0: layout.xaxis.p2c(x),
              y0: layout.yaxis.p2c(y) - 1000,
              x1: layout.xaxis.p2c(x),
              y1: layout.yaxis.p2c(y) + 1000,
              line
            });
            if (type === 'profile') {
              shapes.push({
                name: 'line1',
                type: 'line' as const,
                x0: layout.xaxis.p2c(x) - 1000,
                y0: layout.yaxis.p2c(y),
                x1: layout.xaxis.p2c(x) + 1000,
                y1: layout.yaxis.p2c(y),
                line
              });
            }
            let condition = false;
            if (type === 'profile') {
              if (
                this2.obstacle()?.x === null &&
                this2.obstacle()?.z === null
              ) {
                condition = true;
              }
            } else if (this2.obstacle()?.y === null) {
              condition = true;
            }
            if (condition) {
              await Plotly.relayout(plotId, {
                shapes: shapes
              });
            }
          }
          if (type === 'profile') {
            this2.currentPosition = {
              x: Number(layout.xaxis.p2c(x)).toFixed(2),
              z: Number(layout.yaxis.p2c(y)).toFixed(2)
            };
          } else {
            this2.currentPosition2 = {
              x: Number(layout.xaxis.p2c(x)).toFixed(2),
              z: Number(layout.yaxis.p2c(y)).toFixed(2)
            };
          }
        }
      });

      gd?.addEventListener('click', function (evt) {
        if (!this2.obstacleMode()) return;
        // @ts-expect-error gd is not defined
        const layout = gd?._fullLayout;
        const x = evt.layerX - layout.margin.l;
        const y = evt.layerY - layout.margin.t;
        if (this2.obstacleMode()) {
          console.log('obstacle', this2.obstacle());
          if (type === 'profile') {
            this2.obstacleChange.emit({
              x: layout.xaxis.p2c(x),
              y: this2.obstacle()?.y,
              z: layout.yaxis.p2c(y)
            });
          } else {
            this2.obstacleChange.emit({
              x: this2.obstacle()?.x,
              y: layout.yaxis.p2c(y),
              z: this2.obstacle()?.z
            });
          }
        }
      });
    }

    const plot = await Plotly.newPlot(
      plotId,
      data,
      {
        width: width,
        height: 500,
        autosize: false,
        showlegend: false,
        margin: {
          l: 0,
          r: 0,
          t: 0,
          b: 0
        },
        scene: {
          aspectmode: 'manual',
          aspectratio: {
            x: 3,
            y: 0.2,
            z: 0.5
          },
          camera: {
            center: {
              x: 0,
              y: 0,
              z: 0
            },
            eye: {
              x: 0.02,
              y: -1.4,
              z: 0.2
            }
          }
        }
      },
      {
        displayModeBar: false,
        fillFrame: false,
        responsive: false,
        autosizable: false
      }
    );
    if (type === 'face') {
      attach();
      this.plotFace.set(plot);
    } else {
      attach();
      this.plotProfile.set(plot);
    }
  }
}
