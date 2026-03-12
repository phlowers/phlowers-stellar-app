/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Routes } from '@angular/router';
import { LoggedLayoutComponent } from './shared/components/layout/logged-layout/logged-layout.component';
import { NotFoundComponent } from './pages/404/404.component';

/** Application route definitions mapping URL paths to page components. */
export const appRoutes: Routes = [
  {
    path: '',
    component: LoggedLayoutComponent,
    children: [
      {
        path: '',
        title: $localize`Home`,
        loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent)
      },
      {
        path: 'studies',
        title: $localize`Studies`,
        loadComponent: () => import('./pages/studies/studies.component').then((m) => m.StudiesComponent)
      },
      {
        path: 'admin',
        title: $localize`Admin`,
        loadComponent: () => import('./pages/admin/admin').then((m) => m.AdminComponent)
      },
      {
        path: 'study/:uuid',
        title: $localize`Study`,
        loadChildren: () => import('./pages/study/study.routes').then((m) => m.studyRoutes)
      },
      {
        path: 'news',
        title: $localize`News`,
        loadComponent: () => import('./pages/news/news.component').then((m) => m.NewsComponent)
      },
      {
        path: 'changelog',
        title: $localize`Changelog`,
        loadComponent: () => import('./pages/changelog/changelog.component').then((m) => m.ChangelogComponent)
      },
      {
        path: 'studio',
        title: $localize`Studio`,
        loadComponent: () => import('./pages/studio/studio-page.component').then((m) => m.StudioPageComponent)
      }
    ]
  },
  { path: '**', component: NotFoundComponent }
];
