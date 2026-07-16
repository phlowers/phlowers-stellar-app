/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Routes } from '@angular/router';

/** Dev-only routes, only wired in for `ng serve`/`ng build --configuration development`. */
export const devRoutes: Routes = [
  {
    path: 'primeDebug',
    title: 'PrimeNG Debug',
    loadComponent: () =>
      import('@features/prime-debug/prime-debug.component').then((m) => m.PrimeDebugComponent)
  }
];
