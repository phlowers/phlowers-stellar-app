/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, effect, input, signal, untracked } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { WorkerService } from '../../engine/worker/worker.service';
import { Task } from '../../engine/worker/tasks';
import Plotly, {
  Camera,
  Data,
  Datum,
  Layout,
  PlotlyHTMLElement
} from 'plotly.js-dist-min';
import { uniq } from 'lodash';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import {
  AutoCompleteCompleteEvent,
  AutoCompleteModule
} from 'primeng/autocomplete';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
@Component({
  selector: 'app-global-view',
  standalone: true,
  //   styleUrls: ['./section3d.component.scss'],
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
    <!-- <p-button label="Run Python" (onClick)="runPython()"></p-button> -->
    <!-- <p-button label="log" (onClick)="log()"></p-button> -->
    <div class="my-5">
      <div class="flex flex-row gap-2">
        <div class="flex flex-col gap-2">
          <label class="font-bold" for="selectedPhase">Selected Phase</label>
          <p-autocomplete
            [(ngModel)]="selectedPhase"
            inputId="selectedPhase"
            [dropdown]="true"
            [suggestions]="phases()"
            (completeMethod)="search($event)"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label class="font-bold" for="selectedPhase">View</label>
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
      <label for="showOtherAsDashed" class="ml-2"
        >Show other phases as dashed</label
      >
    </div>
    <div class="my-2">
      <div
        id="plotly-output"
        class="border border-gray-300 rounded-md"
        style="width: 100%; height: 500px; box-sizing: content-box;"
      ></div>
      <div class="custom-slider my-5" *ngIf="litData()">
        <ngx-slider
          [(value)]="minValue"
          [(highValue)]="maxValue"
          [options]="options()"
        ></ngx-slider>
      </div>
    </div>
  </div>`
})
export class GlobalViewComponent {
  constructor(private readonly workerService: WorkerService) {}
  litData = input<any>(null);
  minValue = signal(0);
  maxValue = signal(14);
  options = signal<Options>({});
  plot = signal<PlotlyHTMLElement | null>(null);
  phases = signal<string[]>(['all', 'phase_1', 'phase_2', 'phase_3', 'garde']);
  selectedPhase = signal<string>('all');
  showOtherAsDashed = signal(false);
  views = signal<string[]>(['3d', '2d']);
  selectedView = signal<'3d' | '2d'>('3d');

  ngOnInit() {
    this.workerService.ready$.subscribe(() => {
      this.runPython();
    });
  }

  readonly effect2 = effect(() => {
    console.log('effect2', this.selectedPhase());
    // const plot = untracked(() => this.plot());
    //@ts-ignore
    console.log('this.plot()?._fullLayout', this.plot()?._fullLayout);
    // @ts-ignore
    const currentCamera = this.plot()?._fullLayout?.scene?.camera;
    console.log('currentCamera', currentCamera);
    this.createPlot(
      untracked(() => this.minValue()),
      untracked(() => this.maxValue()),
      this.selectedPhase(),
      this.showOtherAsDashed(),
      currentCamera,
      this.selectedView()
    );
  });

  readonly effect3 = effect(() => {
    console.log('effect3');
    // const plot = untracked(() => this.plot());
    // // @ts-ignore
    // const currentCamera = plot?._fullLayout.scene.camera;
    this.createPlot(
      this.minValue(),
      this.maxValue(),
      untracked(() => this.selectedPhase()),
      untracked(() => this.showOtherAsDashed()),
      undefined,
      this.selectedView()
    );
  });

  search(event: any) {
    let _items = [...Array(10).keys()];
    const filteredPhases = this.phases().filter((phase) =>
      phase.includes(event.query)
    );
    this.phases.set(['all', 'phase_1', 'phase_2', 'phase_3', 'garde']);
  }

  getAllPhases(
    litXs: any,
    litYs: any,
    litZs: any,
    litCanton: any,
    litType: any,
    litSupports: any,
    uniqueSupports: any[],
    name: string,
    view: '3d' | '2d'
  ): Data[] {
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
    return uniqueSupports.map((support, index) => {
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
    // console.log('litData', this.litData());
    // console.log('plot', this.plot()?._fullLayout);
    var gd = document.getElementById('plotly-output');
    // @ts-ignore
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
    console.log('selectedPhase', selectedPhase);
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
    const litXs = Object.values(lit.x) as Datum[];
    const litYs = Object.values(lit.y) as Datum[];
    const litZs = Object.values(lit.z) as Datum[];
    const litTypes = Object.values(lit.type) as Datum[];
    const litCanton = Object.values(lit.canton) as Datum[];
    const litSupports = Object.values(lit.support) as Datum[];
    const phase1 =
      selectedPhase === 'all' ||
      selectedPhase === 'phase_1' ||
      showOtherAsDashed
        ? this.getAllPhases(
            litXs,
            litYs,
            litZs,
            litCanton,
            litTypes,
            litSupports,
            uniqueSupports,
            'phase_1',
            view
          )
        : [];
    const phase2 =
      selectedPhase === 'all' ||
      selectedPhase === 'phase_2' ||
      showOtherAsDashed
        ? this.getAllPhases(
            litXs,
            litYs,
            litZs,
            litCanton,
            litTypes,
            litSupports,
            uniqueSupports,
            'phase_2',
            view
          )
        : [];
    const phase3 =
      selectedPhase === 'all' ||
      selectedPhase === 'phase_3' ||
      showOtherAsDashed
        ? this.getAllPhases(
            litXs,
            litYs,
            litZs,
            litCanton,
            litTypes,
            litSupports,
            uniqueSupports,
            'phase_3',
            view
          )
        : [];
    const gard =
      selectedPhase === 'all' || selectedPhase === 'garde' || showOtherAsDashed
        ? this.getAllPhases(
            litXs,
            litYs,
            litZs,
            litCanton,
            litTypes,
            litSupports,
            uniqueSupports,
            'garde',
            view
          )
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
    const width = myElement?.clientWidth;
    const data = [
      ...phase1,
      ...phase2,
      ...phase3,
      ...gard,
      ...allSupports,
      ...allInsulators
    ];
    if (!width) return;
    const plot = await Plotly.newPlot(
      'plotly-output',
      data,
      {
        // dragmode: 'pan',
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
    // const lit = this.workerService.result()?.lit;
    // if (!lit) return;
    const lit = this.litData();
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
    // this.litData.set(lit);
    // this.createPlot(0, uniqueSupports.length, 'all', false);
  });

  runPython() {
    this.workerService.runTask(Task.runPython2, {});
  }
}
