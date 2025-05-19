/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component } from '@angular/core';
import { Section3dComponent } from '../../../core/components/3d/section-3d.component';

@Component({
  selector: 'app-visualization-tab',
  standalone: true,
  imports: [Section3dComponent],
  template: `<div>
    <app-section-3d></app-section-3d>
  </div>`
})
export class VisualizationTabComponent {}
