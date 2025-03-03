import { Routes } from '@angular/router';
import { ThreePageComponent } from './pages/three-page/three-page.component';
import { PlotlyPageComponent } from './pages/plotly-page/plotly-page.component';

export const routes: Routes = [
  { path: 'threejs-test', component: ThreePageComponent },
  { path: 'plotly-test', component: PlotlyPageComponent }
];
