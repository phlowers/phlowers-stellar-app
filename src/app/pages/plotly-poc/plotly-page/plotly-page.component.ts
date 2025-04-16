import { Component, signal } from '@angular/core';
import { PlotlyComponent } from '../plotly-comp/plotly-comp.component';
import { PlotlyLine } from '../plotly.model';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-plotly-page',
  imports: [PlotlyComponent, CardModule],
  templateUrl: './plotly-page.component.html',
  styleUrl: './plotly-page.component.scss'
})
export class PlotlyPageComponent {
  lineTest = signal<PlotlyLine>({
    x: [0, 50, 100, 150, 200, 250, 300],
    z: [16.8, 3.00890769, -5.65382853, -9.27490824, -7.8905724, -1.48696614, 10],
    y: [5, 5, 5, 5, 5, 5, 5]
  });

  updateLineTest(newLine: PlotlyLine): void {
    this.lineTest.set(newLine);
  }
}
