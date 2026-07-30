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
import { devRoutes } from '@src/app/dev-routes';

/** Application route definitions mapping URL paths to page components. */
export const appRoutes: Routes = [
  {
    path: 'login',
    title: 'routes.login',
    loadComponent: () =>
      import('@features/auth/presentation/pages/login-page/login-page.component').then((m) => m.LoginPageComponent)
  },
  ...devRoutes,
  {
    path: '',
    component: LoggedLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        title: 'routes.home',
        loadChildren: () => import('@features/home/presentation/home.routes').then((m) => m.homeRoutes)
      },
      {
        path: 'studies',
        title: 'routes.studies',
        loadChildren: () => import('@features/studies/presentation/studies.routes').then((m) => m.studiesRoutes)
      },
      {
        path: 'admin',
        title: 'routes.admin',
        loadChildren: () => import('@features/admin/presentation/admin.routes').then((m) => m.adminRoutes)
      },
      {
        path: 'study/:uuid',
        title: 'routes.study',
        loadChildren: () => import('@features/study/presentation/study.routes').then((m) => m.studyRoutes)
      },
      {
        path: 'news',
        title: 'routes.news',
        loadChildren: () => import('@features/news/presentation/news.routes').then((m) => m.newsRoutes)
      },
      {
        path: 'changelog',
        title: 'routes.changelog',
        loadChildren: () => import('@features/changelog/presentation/changelog.routes').then((m) => m.changelogRoutes)
      },
      {
        path: 'studio',
        title: 'routes.studio',
        loadComponent: () =>
          import('@features/studio/core/presentation/pages/studio-page/studio-page.component').then(
            (m) => m.StudioPageComponent
          )
      }
    ]
  },
  { path: '**', component: NotFoundComponent }
];
