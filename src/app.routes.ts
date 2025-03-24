import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Dashboard } from './app/pages/dashboard/dashboard';
import { Admin } from './app/pages/admin/admin';
import { Study } from './app/pages/study/study';

export const appRoutes: Routes = [
  {
    path: '',
    component: AppLayout,
    children: [
      { path: '', component: Dashboard },
      { path: 'admin', component: Admin },
      { path: 'study/:uuid', component: Study }
    ]
  }
  // { path: 'notfound', component: Notfound },
  // { path: '**', redirectTo: '/notfound' }
];
