/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Routes } from '@angular/router';
import { AppLayout } from './layout/component/app.layout';
import { Studies } from './pages/studies/studies.component';
import { Admin } from './pages/admin/admin';
import { Study } from './pages/study/study.component';
// import { OfflineStoragePoc } from './pages/offline-storage-poc/offline-storage-poc.component';
import { Sections } from './pages/sections/sections.component';

export const appRoutes: Routes = [
  {
    path: '',
    component: AppLayout,
    children: [
      { path: '', component: Studies },
      { path: 'admin', component: Admin },
      // { path: 'offline-storage-poc', component: OfflineStoragePoc },
      { path: 'study/:uuid', component: Study },
      { path: 'sections', component: Sections }
    ]
  }
  // { path: 'notfound', component: Notfound },
  // { path: '**', redirectTo: '/notfound' }
];
