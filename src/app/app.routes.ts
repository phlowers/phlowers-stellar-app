/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Routes } from '@angular/router';
import { AppLayoutComponent } from './layout/component/app.layout';
import { StudiesComponent } from './pages/studies/studies.component';
import { AdminComponent } from './pages/admin/admin';
import { StudyComponent } from './pages/study/study.component';
import { SectionsComponent } from './pages/sections/sections.component';
import { PlotlyPageComponent } from './pages/plotly-poc/plotly-page/plotly-page.component';
import { ThreeDPageComponent } from './pages/3d-page/3d-page.component';
export const appRoutes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      { path: '', component: StudiesComponent },
      { path: 'admin', component: AdminComponent },
      // { path: 'offline-storage-poc', component: OfflineStoragePoc },
      { path: 'study/:uuid', component: StudyComponent },
      { path: 'sections', component: SectionsComponent },
      { path: 'plotly', component: PlotlyPageComponent },
      { path: '3d', component: ThreeDPageComponent }
    ]
  }
  // { path: 'notfound', component: Notfound },
  // { path: '**', redirectTo: '/notfound' }
];
