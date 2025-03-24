import { Routes } from '@angular/router';
import { AppLayout } from './layout/component/app.layout';
import { Studies } from './pages/studies/studies.component';
import { Admin } from './pages/admin/admin';
import { Study } from './pages/study/study.component';
import { OfflineStoragePoc } from './pages/offline-storage-poc/offline-storage-poc.component';

export const appRoutes: Routes = [
  {
    path: '',
    component: AppLayout,
    children: [
      { path: '', component: Studies },
      { path: 'admin', component: Admin },
      { path: 'offline-storage-poc', component: OfflineStoragePoc },
      { path: 'study/:uuid', component: Study }
    ]
  }
  // { path: 'notfound', component: Notfound },
  // { path: '**', redirectTo: '/notfound' }
];
