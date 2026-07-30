/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Routes } from '@angular/router';
import { StudyComponent } from './pages/study/study.component';

/** Child routes for the study/:uuid context. */
export const studyRoutes: Routes = [
  { path: '', pathMatch: 'full', component: StudyComponent },
  {
    path: 'studio',
    title: 'routes.studio',
    loadComponent: () =>
      import('@features/studio/core/presentation/pages/studio-page/studio-page.component').then(
        (m) => m.StudioPageComponent
      )
  }
];
