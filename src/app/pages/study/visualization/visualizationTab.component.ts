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
import { Section3dComponent } from '../../../core/components/3d/section-3d.component';

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
  name: [
    'support 1',
    'support 2',
    'support 3',
    'support 4',
    'support 5',
    'support 6',
    'support 7'
  ],
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
  conductor_attachment_altitude:
    initialData.conductor_attachment_altitude[index],
  crossarm_length: initialData.crossarm_length[index],
  line_angle: initialData.line_angle[index],
  insulator_length: initialData.insulator_length[index],
  span_length: initialData.span_length[index]
}));

@Component({
  selector: 'app-visualization-tab',
  standalone: true,
  imports: [Section3dComponent],
  template: `<div>
    <app-section-3d></app-section-3d>
  </div>`
})
export class VisualizationTabComponent {}
