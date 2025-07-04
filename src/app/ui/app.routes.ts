/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Routes } from '@angular/router';
import { StudiesComponent } from './pages/studies/studies.component';
import { AdminComponent } from './pages/admin/admin';
import { StudyComponent } from './pages/study/study.component';
import { SectionsComponent } from './pages/sections/sections.component';
import { PlotlyPageComponent } from './pages/plotly-poc/plotly-page/plotly-page.component';
import { ThreeDPageComponent } from './pages/3d-page/3d-page.component';
import { LoggedLayoutComponent } from './shared/components/layout/logged-layout/logged-layout.component';
import { HomeComponent } from './pages/home/home.component';
import { NewsComponent } from './pages/news/news.component';

export const appRoutes: Routes = [
  {
    path: '',
    component: LoggedLayoutComponent,
    children: [
      { path: '', title: $localize`Home`, component: HomeComponent },
      {
        path: 'studies',
        title: $localize`Studies`,
        component: StudiesComponent
      },
      { path: 'admin', title: $localize`Admin`, component: AdminComponent },
      {
        path: 'study/:uuid',
        title: $localize`Study`,
        component: StudyComponent
      },
      {
        path: 'sections',
        title: $localize`Cantons`,
        component: SectionsComponent
      },
      {
        path: 'plotly',
        title: $localize`Plotly`,
        component: PlotlyPageComponent
      },
      {
        path: '3d',
        title: $localize`3d`,
        component: ThreeDPageComponent
      },
      {
        path: 'news',
        title: $localize`News`,
        component: NewsComponent
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
