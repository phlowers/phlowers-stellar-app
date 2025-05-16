/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, effect, OnInit, signal, untracked } from '@angular/core';
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
import { SingleSpanComponent } from './single-span.component';
import { TabsModule } from 'primeng/tabs';
import { GlobalViewComponent } from './global-view.component';

@Component({
  selector: 'app-section-3d',
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
    CheckboxModule,
    TabsModule,
    GlobalViewComponent
  ],
  template: `
    <p-tabs lazy value="global">
      <p-tablist>
        <p-tab value="global">Global view</p-tab>
        <p-tab value="span">Span view</p-tab>
      </p-tablist>
      <p-tabpanels>
        <p-tabpanel value="global">
          <app-global-view [litData]="litData()"></app-global-view>
        </p-tabpanel>
        <p-tabpanel value="span">
          @defer (on viewport) {
            <app-single-span
              [obstacleMode]="false"
              [litData]="litData()"
            ></app-single-span>
          } @placeholder (minimum 500ms) {
            <div></div>
          }
        </p-tabpanel>
      </p-tabpanels>
    </p-tabs>
  `
})
export class Section3dComponent implements OnInit {
  constructor(private readonly workerService: WorkerService) {}
  litData = signal<any>(null);
  // minValue = signal(0);
  // maxValue = signal(14);
  // options = signal<Options>({});
  // plot = signal<PlotlyHTMLElement | null>(null);
  // phases = signal<string[]>(['all', 'phase_1', 'phase_2', 'phase_3', 'garde']);
  // selectedPhase = signal<string>('all');
  // showOtherAsDashed = signal(false);

  ngOnInit() {
    this.workerService.ready$.subscribe(() => {
      this.runPython();
    });
  }

  readonly effect = effect(async () => {
    console.log('effect to get lit data from worker');
    const lit = this.workerService.result()?.lit;
    if (!lit) return;
    this.litData.set(lit);
  });

  runPython() {
    this.workerService.runTask(Task.runPython2, {});
  }
}
