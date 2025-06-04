/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component } from '@angular/core';
import { Section3dComponent } from '@core/3d/section-3d.component';

@Component({
  standalone: true,
  // styleUrls: ['./3d-page.component.scss'],
  imports: [Section3dComponent],
  template: `<app-section-3d></app-section-3d>`
})
export class ThreeDPageComponent {}
