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
import { LoggedLayoutComponent } from './shared/components/layout/logged-layout/logged-layout.component';
import { HomeComponent } from './pages/home/home.component';
import { NewsComponent } from './pages/news/news.component';
import { NotFoundComponent } from './pages/404/404.component';
import { ChangelogComponent } from './pages/changelog/changelog.component';

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
      // {
      //   path: 'study',
      //   component: NotFoundComponent
      // },
      {
        path: 'study/:uuid',
        title: $localize`Study`,
        component: StudyComponent
      },
      {
        path: 'sections',
        title: $localize`Sections`,
        component: SectionsComponent
      },
      {
        path: 'plotly',
        title: $localize`Plotly`,
        component: PlotlyPageComponent
      },
      {
        path: 'news',
        title: $localize`News`,
        component: NewsComponent
      },
      {
        path: 'changelog',
        title: $localize`Changelog`,
        component: ChangelogComponent
      }
    ]
  },
  { path: '**', component: NotFoundComponent }
];
