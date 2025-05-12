/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, effect, signal, untracked } from '@angular/core';
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
import { SingleSpanComponent } from './singleSpan.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  styleUrls: ['./section-3d.component.scss'],
  imports: [
    ButtonModule,
    SingleSpanComponent,
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
    <p-button label="Run Python" (onClick)="runPython()"></p-button>
    <!-- <p-button label="log" (onClick)="log()"></p-button> -->
    <div class="my-5">
      <p-autocomplete
        [(ngModel)]="selectedPhase"
        [dropdown]="true"
        [suggestions]="phases()"
        (completeMethod)="search($event)"
      />
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
    <div class="my-10">
      <div id="plotly-output" style="width: 100%; height: 500px;"></div>
      <div class="custom-slider my-5" *ngIf="litData()">
        <ngx-slider
          [(value)]="minValue"
          [(highValue)]="maxValue"
          [options]="options()"
        ></ngx-slider>
      </div>
    </div>
    <app-single-span [litData]="litData()"></app-single-span>
  </div>`
})
export class Section3dComponent {
  constructor(private readonly workerService: WorkerService) {}
  litData = signal<any>(null);
  minValue = signal(0);
  maxValue = signal(14);
  options = signal<Options>({});
  plot = signal<PlotlyHTMLElement | null>(null);
  phases = signal<string[]>(['all', 'phase_1', 'phase_2', 'phase_3', 'garde']);
  selectedPhase = signal<string>('all');
  showOtherAsDashed = signal(false);
  // ngOnInit() {
  //   this.workerService.getSection3d().subscribe((data) => {
  //     console.log(data);
  //   });
  // }

  // updateDash() {
  //   console.log('updateDash');
  //   this.showOtherAsDashed.set(!this.showOtherAsDashed());
  // }

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
      currentCamera
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
      undefined
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
    name: string
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
        z: y,
        y: z,
        type: 'scatter',
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
    uniqueSupports: any[]
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
    uniqueSupports: any[]
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
        z: y,
        y: z,
        type: 'scatter',
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
    currentCamera: Camera | undefined
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
            'phase_1'
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
            'phase_2'
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
            'phase_3'
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
            'garde'
          )
        : [];
    const allSupports = this.getAllSupports(
      litXs,
      litYs,
      litZs,
      litTypes,
      litSupports,
      uniqueSupportsForSupports
    );
    const allInsulators = this.getAllInsulators(
      litXs,
      litYs,
      litZs,
      litTypes,
      litSupports,
      uniqueSupportsForSupports
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
    const plot = await Plotly.newPlot(
      'plotly-output',
      data,
      {
        // dragmode: 'pan',
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
            },
            ...(currentCamera || {})
          }
        }
      },
      {
        displayModeBar: true,
        fillFrame: false,
        responsive: false,
        autosizable: false
      }
    );
    this.plot.set(plot);
  }

  readonly effect = effect(async () => {
    console.log('effect');
    const lit = this.workerService.result()?.lit;
    if (!lit) return;
    const uniqueSupports = uniq(Object.values(lit.support));
    this.options.set({
      floor: 0,
      ceil: uniqueSupports.length - 1,
      step: 1,
      showTicks: true,
      showTicksValues: true
    });
    this.maxValue.set(uniqueSupports.length);
    this.litData.set(lit);
    // this.createPlot(0, uniqueSupports.length, 'all', false);
  });

  runPython() {
    this.workerService.runTask(Task.runPython2, {});
  }
}
