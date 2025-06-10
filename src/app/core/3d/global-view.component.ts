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
  signal,
  untracked,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { WorkerService } from '@core/services/worker_python/worker_python.service';
import { Task } from '@core/services/worker_python/tasks';
import Plotly, { Camera, Data, PlotlyHTMLElement } from 'plotly.js-dist-min';
import { uniq } from 'lodash';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';

interface PhasesParams {
  litXs: any[];
  litYs: any[];
  litZs: any[];
  litCanton: any[];
  litType: any[];
  litSupports: any[];
  uniqueSupports: any[];
  name: string;
  view: '3d' | '2d';
}
@Component({
  selector: 'app-global-view',
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
    CheckboxModule,
    SelectModule
  ],
  template: `<div>
    <div class="my-5">
      <div class="flex flex-row gap-2">
        <div class="flex flex-col gap-2">
          <label i18n class="font-bold" for="selectedPhase"
            >Selected Phase</label
          >
          <p-autocomplete
            [(ngModel)]="selectedPhase"
            inputId="selectedPhase"
            [dropdown]="true"
            [suggestions]="phases()"
            (completeMethod)="search()"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label i18n class="font-bold" for="selectedPhase">View</label>
          <p-select
            [(ngModel)]="selectedView"
            inputId="selectedView"
            [options]="views()"
          />
        </div>
      </div>
    </div>
    <div class="flex items-center my-5">
      <p-checkbox
        inputId="showOtherAsDashed"
        [binary]="true"
        [(ngModel)]="showOtherAsDashed"
      ></p-checkbox>
      <label i18n for="showOtherAsDashed" class="ml-2"
        >Show other phases as dashed</label
      >
    </div>
    <div class="my-2">
      <div
        id="plotly-output"
        class="border border-gray-300 rounded-md"
        style="width: 100%; height: 500px; box-sizing: content-box;"
      ></div>
      <div class="custom-slider my-5 w-full" *ngIf="maxValue() && litData()">
        @defer (on viewport) {
          <ngx-slider
            [(value)]="minValue"
            [(highValue)]="maxValue"
            [options]="options()"
            class="w-full"
          ></ngx-slider>
        } @placeholder (minimum 500ms) {
          <div></div>
        }
      </div>
    </div>
  </div>`
})
export class GlobalViewComponent implements AfterViewInit, OnDestroy {
  constructor(private readonly workerService: WorkerService) {}
  litData = input<any>(null);
  minValue = signal(0);
  maxValue = signal(0);
  options = signal<Options>({});
  plot = signal<PlotlyHTMLElement | null>(null);
  phases = signal<string[]>(['all', 'phase_1', 'phase_2', 'phase_3', 'garde']);
  selectedPhase = signal<string>('all');
  showOtherAsDashed = signal(false);
  views = signal<string[]>(['3d', '2d']);
  selectedView = signal<'3d' | '2d'>('3d');

  ngAfterViewInit() {
    console.log('ngAfterViewInit');
  }

  ngOnDestroy() {
    console.log('ngOnDestroy');
  }

  readonly effect2 = effect(() => {
    console.log('effect2 global view, will create plot');
    this.createPlot(
      untracked(() => this.minValue()),
      untracked(() => this.maxValue()),
      this.selectedPhase(),
      this.showOtherAsDashed(),
      // @ts-expect-error camera is not defined
      this.plot()?._fullLayout?.scene?.camera,
      this.selectedView()
    );
  });

  readonly effect3 = effect(() => {
    console.log('effect3 global view, will create plot');
    this.createPlot(
      this.minValue(),
      this.maxValue(),
      untracked(() => this.selectedPhase()),
      untracked(() => this.showOtherAsDashed()),
      undefined,
      this.selectedView()
    );
  });

  search() {
    this.phases.set(['all', 'phase_1', 'phase_2', 'phase_3', 'garde']);
  }

  getAllPhases(params: PhasesParams): Data[] {
    const {
      litXs,
      litYs,
      litZs,
      litCanton,
      litType,
      litSupports,
      uniqueSupports,
      name,
      view
    } = params;
    const selectedPhase = untracked(() => this.selectedPhase());
    const dash =
      selectedPhase === 'all' || selectedPhase === name ? 'solid' : 'dash';
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
        x,
        z: view === '3d' ? z : y,
        y: view === '3d' ? y : z,
        type: view === '3d' ? 'scatter3d' : 'scatter',
        mode: 'lines',
        line: { color: 'red', dash },
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
    view: '3d' | '2d' = '3d'
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
        x,
        z: view === '3d' ? z : y,
        y: view === '3d' ? y : z,
        type: view === '3d' ? 'scatter3d' : 'scatter',
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
    view: '3d' | '2d' = '3d'
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
        x,
        z: view === '3d' ? z : y,
        y: view === '3d' ? y : z,
        type: view === '3d' ? 'scatter3d' : 'scatter',
        mode: 'lines',
        line: { color: 'green' }
      };
    });
  }

  log() {
    const gd = document.getElementById('plotly-output');
    // @ts-expect-error gd is not defined
    console.log('gd', gd?._fullLayout);
  }

  async createPlot(
    minValue: number,
    maxValue: number,
    selectedPhase: string,
    showOtherAsDashed: boolean,
    currentCamera: Camera | undefined,
    view: '3d' | '2d'
  ) {
    console.log('creating plot');
    const lit = untracked(() => this.litData());
    if (!lit) return;
    const uniqueSupports = uniq(Object.values(lit.support)).slice(
      minValue,
      maxValue
    );
    const uniqueSupportsForSupports = uniq(Object.values(lit.support)).slice(
      minValue,
      maxValue + 1
    );
    const litXs = Object.values(lit.x);
    const litYs = Object.values(lit.y);
    const litZs = Object.values(lit.z);
    const litTypes = Object.values(lit.type);
    const litCanton = Object.values(lit.canton);
    const litSupports = Object.values(lit.support);
    const phase1 =
      selectedPhase === 'all' ||
      selectedPhase === 'phase_1' ||
      showOtherAsDashed
        ? this.getAllPhases({
            litXs,
            litYs,
            litZs,
            litCanton,
            litType: litTypes,
            litSupports,
            uniqueSupports,
            name: 'phase_1',
            view
          })
        : [];
    const phase2 =
      selectedPhase === 'all' ||
      selectedPhase === 'phase_2' ||
      showOtherAsDashed
        ? this.getAllPhases({
            litXs,
            litYs,
            litZs,
            litCanton,
            litType: litTypes,
            litSupports,
            uniqueSupports,
            name: 'phase_2',
            view
          })
        : [];
    const phase3 =
      selectedPhase === 'all' ||
      selectedPhase === 'phase_3' ||
      showOtherAsDashed
        ? this.getAllPhases({
            litXs,
            litYs,
            litZs,
            litCanton,
            litType: litTypes,
            litSupports,
            uniqueSupports,
            name: 'phase_3',
            view
          })
        : [];
    const gard =
      selectedPhase === 'all' || selectedPhase === 'garde' || showOtherAsDashed
        ? this.getAllPhases({
            litXs,
            litYs,
            litZs,
            litCanton,
            litType: litTypes,
            litSupports,
            uniqueSupports,
            name: 'garde',
            view
          })
        : [];
    const allSupports = this.getAllSupports(
      litXs,
      litYs,
      litZs,
      litTypes,
      litSupports,
      uniqueSupportsForSupports,
      view
    );
    const allInsulators = this.getAllInsulators(
      litXs,
      litYs,
      litZs,
      litTypes,
      litSupports,
      uniqueSupportsForSupports,
      view
    );
    const myElement = document.getElementById('plotly-output');
    const width = myElement?.clientWidth ?? 0;
    const data = [
      ...phase1,
      ...phase2,
      ...phase3,
      ...gard,
      ...allSupports,
      ...allInsulators
    ];
    const plot = await Plotly.newPlot(
      'plotly-output',
      data,
      {
        width: width - 2,
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
            },
            ...(currentCamera || {})
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
    this.plot.set(plot);
  }

  readonly effect = effect(async () => {
    console.log('effect');
    const lit = this.litData();
    if (!lit) return;
    const uniqueSupports = uniq(Object.values(lit.support));
    this.options.set({
      floor: 0,
      ceil: uniqueSupports.length - 1,
      step: 1,
      showTicks: true,
      showTicksValues: true,
      animate: false,
      animateOnMove: false
    });
    this.maxValue.set(uniqueSupports.length);
  });

  runPython() {
    this.workerService.runTask(Task.runPython2, {});
  }
}
