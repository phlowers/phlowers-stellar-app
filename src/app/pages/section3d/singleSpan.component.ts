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
import { WorkerService } from '../../core/engine/worker/worker.service';
import { Task } from '../../core/engine/worker/tasks';
import Plotly, { Camera, Data, Datum, Layout, PlotlyHTMLElement } from 'plotly.js-dist-min';
import { uniq } from 'lodash';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { InputNumberModule } from 'primeng/inputnumber';
@Component({
  selector: 'app-single-span',
  standalone: true,
  //   styleUrls: ['./section3d.component.scss'],
  imports: [ButtonModule, InputNumberModule, ProgressSpinnerModule, CommonModule, TableModule, InputTextModule, FormsModule, CheckboxModule, NgxSliderModule, AutoCompleteModule, CheckboxModule],
  template: `<div>
    <!-- <p-button label="Run Python" (onClick)="runPython()"></p-button> -->
    <!-- <p-button label="log" (onClick)="log()"></p-button> -->
    <div class="my-5">
      <label for="vertical" class="mr-2">Span Number:</label>
      <p-inputnumber [(ngModel)]="selectedSpan" [showButtons]="true" buttonLayout="horizontal" spinnerMode="vertical" inputId="vertical" [inputStyle]="{ width: '3rem' }">
        <ng-template #incrementbuttonicon>
          <span class="pi pi-plus"></span>
        </ng-template>
        <ng-template #decrementbuttonicon>
          <span class="pi pi-minus"></span>
        </ng-template>
      </p-inputnumber>
      <div *ngIf="currentPosition">
        <div>Mouse Position:</div>
        <div>x: {{ currentPosition.x }}, z: {{ currentPosition.z }}</div>
      </div>
    </div>
    <div id="plotly-output-single-span" style="width: 100%; height: 500px;"></div>

    <div id="plotly-output-points">
      <div *ngFor="let point of points; let i = index">position {{ i + 1 }} x: {{ point.x }}, z: {{ point.z }}</div>
    </div>
    <div id="plotly-output-single-span-y" style="width: 500px; height: 500px;"></div>
  </div>`
})
export class SingleSpanComponent {
  constructor(private readonly workerService: WorkerService) {}
  litData = input<any>(null);
  options = signal<Options>({});
  plot = signal<PlotlyHTMLElement | null>(null);
  phases = signal<string[]>(['all', 'phase_1', 'phase_2', 'phase_3', 'garde']);
  selectedSpan = signal<number>(0);
  points: { x: number; z: number }[] = [];
  currentPosition: { x: number; z: number } | null = null;

  readonly effect2 = effect(() => {
    console.log('effect2', this.selectedSpan());
    this.createPlot(this.selectedSpan());
  });

  readonly effect3 = effect(() => {
    this.litData();
    console.log('effect3 in single span', this.litData());
    this.createPlot(this.selectedSpan());
    // .then((lit: any) => {
    //   console.log('effect3 in single span', lit);
    // });
    // console.log('effect3', this.plot());
  });

  search(event: any) {
    let _items = [...Array(10).keys()];
    const filteredPhases = this.phases().filter((phase) => phase.includes(event.query));
    this.phases.set(['all', 'phase_1', 'phase_2', 'phase_3', 'garde']);
  }

  getAllPhases(litXs: any, litYs: any, litZs: any, litCanton: any, litType: any, litSupports: any, uniqueSupports: any[], name: string): Data[] {
    // const selectedPhase = untracked(() => this.selectedPhase());
    // const dash = selectedPhase === 'all' || selectedPhase === name ? 'solid' : 'dash';
    return uniqueSupports.map((support) => {
      const x = litXs.filter((x: any, index: number) => litSupports[index] === support && litCanton[index] === name && litType[index] === 'span');
      const y = litYs.filter((x: any, index: number) => litSupports[index] === support && litCanton[index] === name && litType[index] === 'span');
      const z = litZs.filter((x: any, index: number) => litSupports[index] === support && litCanton[index] === name && litType[index] === 'span');
      return { x, z: y, y: z, type: 'scatter', mode: 'lines', line: { color: 'red', dash: 'solid' }, text: name };
    });
  }

  getAllSupports(litXs: any, litYs: any, litZs: any, litTypes: any, litSupports: any, uniqueSupports: any[]): Data[] {
    return uniqueSupports.map((support, index) => {
      const x = litXs.filter((x: any, index: number) => litSupports[index] === support && litTypes[index] === 'support');
      const y = litYs.filter((x: any, index: number) => litSupports[index] === support && litTypes[index] === 'support');
      const z = litZs.filter((x: any, index: number) => litSupports[index] === support && litTypes[index] === 'support');
      return { x, z: y, y: z, type: 'scatter', text: [support.replace('Section ', '')], textposition: 'inside', mode: 'text+lines', line: { color: 'blue' } };
    });
  }

  getAllInsulators(litXs: any, litYs: any, litZs: any, litTypes: any, litSupports: any, uniqueSupports: any[]): Data[] {
    return uniqueSupports.map((support) => {
      const x = litXs.filter((x: any, index: number) => litSupports[index] === support && litTypes[index] === 'insulator');
      const y = litYs.filter((x: any, index: number) => litSupports[index] === support && litTypes[index] === 'insulator');
      const z = litZs.filter((x: any, index: number) => litSupports[index] === support && litTypes[index] === 'insulator');
      return { x, z: y, y: z, type: 'scatter', mode: 'lines', line: { color: 'green' } };
    });
  }

  log() {
    // console.log('litData', this.litData());
    // console.log('plot', this.plot()?._fullLayout);
    var gd = document.getElementById('plotly-output-single-span');
    // @ts-ignore
    console.log('gd', gd?._fullLayout);
  }

  async createPlot(selectedSpan: number) {
    // console.log('selectedPhase', selectedPhase);
    const lit = untracked(() => this.litData());
    if (!lit) return;
    const uniqueSupports = uniq(Object.values(lit.support)).slice(selectedSpan, selectedSpan + 1);
    const uniqueSupportsForSupports = uniq(Object.values(lit.support)).slice(selectedSpan, selectedSpan + 2);
    const litXs = Object.values(lit.x) as Datum[];
    const litYs = Object.values(lit.y) as Datum[];
    const litZs = Object.values(lit.z) as Datum[];
    const litTypes = Object.values(lit.type) as Datum[];
    const litCanton = Object.values(lit.canton) as Datum[];
    const litSupports = Object.values(lit.support) as Datum[];
    const phase1 = this.getAllPhases(litXs, litYs, litZs, litCanton, litTypes, litSupports, uniqueSupports, 'phase_1');
    const phase2 = this.getAllPhases(litXs, litYs, litZs, litCanton, litTypes, litSupports, uniqueSupports, 'phase_2');
    const phase3 = this.getAllPhases(litXs, litYs, litZs, litCanton, litTypes, litSupports, uniqueSupports, 'phase_3');
    const gard = this.getAllPhases(litXs, litYs, litZs, litCanton, litTypes, litSupports, uniqueSupports, 'garde');
    const allSupports = this.getAllSupports(litXs, litYs, litZs, litTypes, litSupports, uniqueSupportsForSupports);
    const allInsulators = this.getAllInsulators(litXs, litYs, litZs, litTypes, litSupports, uniqueSupportsForSupports);
    const myElement = document.getElementById('plotly-output-single-span');
    const width = myElement?.clientWidth;
    const data = [...phase1, ...phase2, ...phase3, ...gard, ...allSupports, ...allInsulators];
    const this2 = this;
    var gd = document.getElementById('plotly-output-single-span');

    function attach(stuff: any) {
      console.log('stuff', stuff);
      // @ts-ignore
      var xaxis = gd?._fullLayout.xaxis;
      // @ts-ignore
      var yaxis = gd?._fullLayout.yaxis;
      // @ts-ignore
      var l = gd?._fullLayout.margin.l;
      // @ts-ignore
      var t = gd?._fullLayout.margin.t;

      gd?.addEventListener('mousemove', function (evt) {
        // console.log('gd', gd._fullLayout);
        //@ts-ignore
        if (gd && gd._fullLayout) {
          //@ts-ignore
          const layout = gd._fullLayout as any;

          // var xInDataCoord = xaxis.p2c(evt.x - l);
          // var yInDataCoord = yaxis.p2c(evt.y - t);
          const x = evt.layerX - layout.margin.l;
          const y = evt.layerY - layout.margin.t;
          console.log('mousemove', layout.xaxis.p2c(x), layout.yaxis.p2c(y));
          this2.currentPosition = { x: layout.xaxis.p2c(x), z: layout.yaxis.p2c(y) };
        }
      });

      gd?.addEventListener('click', function (evt) {
        // @ts-ignore
        var layout = gd?._fullLayout;
        var x = evt.layerX - layout.margin.l;
        var y = evt.layerY - layout.margin.t;
        // console.log('layout', layout);
        // console.log('click1', x, y);
        // console.log('click2', evt.x, evt.y);
        // console.log('click3', layout.xaxis.p2c(x), layout.yaxis.p2c(y));
        // console.log('margins', layout.margin);
        // console.log('evt', evt);

        // const newX = json_2d.data[2].x;
        // const newCustomData = json_2d.data[2].customdata;
        // newX.push(6000);
        // newCustomData.push(['Section 0']);
        Plotly.addTraces('plotly-output-single-span', {
          x: [layout.xaxis.p2c(x)],
          y: [layout.yaxis.p2c(y)],
          name: 'Lines and Text',
          text: ['X'],
          type: 'scatter',
          mode: 'text',
          marker: {
            color: 'red'
          }
        });
        this2.points.push({ x: layout.xaxis.p2c(x), z: layout.yaxis.p2c(y) });
      });
    }

    const plot = await Plotly.newPlot(
      'plotly-output-single-span',
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
            }
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
    attach(plot);

    this.plot.set(plot);
  }

  //   readonly effect = effect(async () => {
  //     console.log('effect');
  //     const lit = this.workerService.result()?.lit;
  //     if (!lit) return;
  //     const uniqueSupports = uniq(Object.values(lit.support));
  //     this.litData.set(lit);
  //   });

  runPython() {
    this.workerService.runTask(Task.runPython2, {});
  }
}
