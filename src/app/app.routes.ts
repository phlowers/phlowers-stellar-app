/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Routes } from '@angular/router';
import { LoggedLayoutComponent } from '@shared/components/layout/logged-layout/logged-layout.component';
import { NotFoundComponent } from '@shared/components/layout/not-found/not-found.component';
import { authGuard } from '@core/guards/auth.guard';

/** Application route definitions mapping URL paths to page components. */
export const appRoutes: Routes = [
  {
    path: 'login',
    title: $localize`Login`,
    loadComponent: () =>
      import('@features/auth/presentation/pages/login-page/login-page.component').then((m) => m.LoginPageComponent)
  },
  {
    path: '',
    component: LoggedLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        title: $localize`Home`,
        loadChildren: () => import('@features/home/presentation/home.routes').then((m) => m.homeRoutes)
      },
      {
        path: 'studies',
        title: $localize`Studies`,
        loadChildren: () => import('@features/studies/presentation/studies.routes').then((m) => m.studiesRoutes)
      },
      {
        path: 'admin',
        title: $localize`Admin`,
        loadChildren: () => import('@features/admin/presentation/admin.routes').then((m) => m.adminRoutes)
      },
      {
        path: 'study/:uuid',
        title: $localize`Study`,
        loadChildren: () => import('@features/study/presentation/study.routes').then((m) => m.studyRoutes)
      },
      {
        path: 'news',
        title: $localize`News`,
        loadChildren: () => import('@features/news/presentation/news.routes').then((m) => m.newsRoutes)
      },
      {
        path: 'changelog',
        title: $localize`Changelog`,
        loadChildren: () => import('@features/changelog/presentation/changelog.routes').then((m) => m.changelogRoutes)
      },
      {
        path: 'studio',
        title: $localize`Studio`,
        loadComponent: () =>
          import('@features/studio/core/presentation/pages/studio-page/studio-page.component').then(
            (m) => m.StudioPageComponent
          )
      }
    ]
  },
  { path: '**', component: NotFoundComponent }
];
