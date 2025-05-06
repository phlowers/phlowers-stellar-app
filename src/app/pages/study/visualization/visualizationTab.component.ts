/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, Input, OnInit, OnDestroy, effect } from '@angular/core';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import Plotly from 'plotly.js-dist-min';
import { WorkerService } from '../../../core/engine/worker/worker.service';
import { Task } from '../../../core/engine/worker/tasks';

interface Support {
  name: string;
  suspension: boolean;
  conductor_attachment_altitude: number;
  crossarm_length: number;
  line_angle: number;
  insulator_length: number;
  span_length: number;
}

interface Cable {
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
}

const initialData = {
  name: ['support 1', 'support 2', 'support 3', 'support 4', 'support 5', 'support 6', 'support 7'],
  suspension: [false, true, true, false, true, true, true],
  conductor_attachment_altitude: [50.0, 40.0, 20.0, 10.0, 10.0, 10.0, 10.0],
  crossarm_length: [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
  line_angle: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  insulator_length: [0, 4, 3.2, 0, 0, 0, 0],
  span_length: [100, 200, 300, 300, 300, 300, 0]
};

const initialDataObjects: Support[] = initialData.name.map((name, index) => ({
  name,
  suspension: initialData.suspension[index],
  conductor_attachment_altitude: initialData.conductor_attachment_altitude[index],
  crossarm_length: initialData.crossarm_length[index],
  line_angle: initialData.line_angle[index],
  insulator_length: initialData.insulator_length[index],
  span_length: initialData.span_length[index]
}));

@Component({
  selector: 'app-visualization-tab',
  standalone: true,
  imports: [ButtonModule, ProgressSpinnerModule, CommonModule, CardModule, DividerModule],
  template: `<div>
    <div class="pb-5">
      <p-button [loading]="loading" i18n severity="info" (click)="runPython()">Run</p-button>
    </div>
    <div class="grid grid-cols-3 gap-5">
      <p-card class="col-span-3" [style]="{ overflow: 'hidden', boxShadow: 'rgba(0, 0, 0, 0.02) 0px 1px 3px 0px, rgba(27, 31, 35, 0.15) 0px 0px 0px 1px' }">
        <ng-template #title><h6 [style]="{ marginBottom: '0' }">Global view</h6></ng-template>
        <p-divider styleClass="!my-2" />
        <ng-template #content>
          <div style="height: 500px; width: 100%" id="plotly-output"></div>
          <div *ngIf="currentPosition">
            <div>x: {{ currentPosition.x }}, y: {{ currentPosition.y }}</div>
          </div>
          <div id="plotly-output-points">
            <div *ngFor="let point of points; let i = index">position {{ i + 1 }} x: {{ point.x }}, y: {{ point.y }}</div>
          </div>
        </ng-template>
      </p-card>
      <p-card class="col-span-2" [style]="{ overflow: 'hidden', boxShadow: 'rgba(0, 0, 0, 0.02) 0px 1px 3px 0px, rgba(27, 31, 35, 0.15) 0px 0px 0px 1px' }">
        <ng-template #title><h6 [style]="{ marginBottom: '0' }">Span view</h6></ng-template>
        <p-divider styleClass="!my-2" />
        <ng-template #content>
          <div style="min-height: 500px; width: 100%" id="plotly-output3"></div>
        </ng-template>
      </p-card>
      <p-card [style]="{ overflow: 'hidden', boxShadow: 'rgba(0, 0, 0, 0.02) 0px 1px 3px 0px, rgba(27, 31, 35, 0.15) 0px 0px 0px 1px' }">
        <ng-template #title><h6 [style]="{ marginBottom: '0' }">Support view</h6></ng-template>
        <p-divider styleClass="!my-2" />
        <ng-template #content>
          <div style="min-height: 500px; width: 100%" id="plotly-output2"></div>
        </ng-template>
      </p-card>
    </div>
  </div>`
})
export class VisualizationTabComponent implements OnInit, OnDestroy {
  @Input() supports: Support[] = initialDataObjects;
  @Input() cable: Cable = {
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
  };
  points: { x: number; y: number }[] = [];
  currentPosition: { x: number; y: number } | null = null;

  workerReady = false;
  loading = true;
  subscriptions = new Subscription();

  constructor(readonly workerService: WorkerService) {}

  ngOnInit() {
    this.loading = true;
    this.subscriptions.add(
      this.workerService.ready$.subscribe((workerReady: boolean) => {
        this.workerReady = workerReady;
        if (workerReady) {
          this.loading = false;
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  readonly effect = effect(() => {
    console.log('result in effect', this.workerService.result());
    // create plotly from json
    const result = this.workerService.result();
    if (result) {
      console.log('result', result);
      const parsed = JSON.parse(result);
      const json_2d = JSON.parse(parsed.json_2d);
      const json_support_2d = JSON.parse(parsed.json_support_2d);
      const json_section_3d = JSON.parse(parsed.json_section_3d);

      const margin = {
        l: 0,
        r: 0,
        b: 0,
        t: 0
      };

      const config = {
        displayModeBar: false
      };

      console.log('parsed', json_2d);

      const myElement = document.getElementById('plotly-output');
      const widthJson2d = myElement?.clientWidth;
      json_2d.layout.width = widthJson2d;
      json_2d.layout.showlegend = false;
      json_2d.layout.xaxis.showticklabels = false;
      json_2d.layout.xaxis.visible = false;
      json_2d.layout.yaxis.showticklabels = false;
      json_2d.layout.yaxis.visible = false;

      const myElement2 = document.getElementById('plotly-output2');
      const widthJsonSupport2d = myElement2?.clientWidth;
      json_support_2d.layout.width = widthJsonSupport2d;

      const myElement3 = document.getElementById('plotly-output3');
      const widthJsonSection3d = myElement3?.clientWidth;
      json_section_3d.layout.width = widthJsonSection3d;

      json_2d.config = config;
      json_support_2d.layout.margin = margin;
      json_support_2d.config = config;
      json_support_2d.layout.showlegend = false;
      json_section_3d.layout.margin = margin;
      json_section_3d.layout.showlegend = false;
      json_section_3d.config = config;

      var gd = document.getElementById('plotly-output');
      const this2 = this;

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
            this2.currentPosition = { x: layout.xaxis.p2c(x), y: layout.yaxis.p2c(y) };
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
          Plotly.addTraces('plotly-output', {
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
          this2.points.push({ x: layout.xaxis.p2c(x), y: layout.yaxis.p2c(y) });
        });
      }

      Plotly.newPlot('plotly-output', json_2d).then(attach);
      Plotly.newPlot('plotly-output2', json_support_2d);
      Plotly.newPlot('plotly-output3', json_section_3d);
    }
  });

  runPython() {
    if (!this.supports || this.supports.length === 0) {
      console.error('No supports data available');
      return;
    }

    const data = {
      name: this.supports.map((item) => item.name),
      suspension: this.supports.map((item) => item.suspension),
      conductor_attachment_altitude: this.supports.map((item) => item.conductor_attachment_altitude),
      crossarm_length: this.supports.map((item) => item.crossarm_length),
      line_angle: this.supports.map((item) => item.line_angle),
      insulator_length: this.supports.map((item) => item.insulator_length),
      span_length: this.supports.map((item) => item.span_length)
    };

    const inputs = {
      sections: data,
      cable: this.cable
    };

    this.loading = true;
    this.workerService.runTask(Task.runPython, inputs);
  }
}
