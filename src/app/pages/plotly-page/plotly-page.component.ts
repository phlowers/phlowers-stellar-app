import { Component } from '@angular/core';
import { PlotlyTestLineComponent } from "../../plotly-test-line/plotly-test-line.component";

@Component({
  selector: 'app-plotly-page',
  imports: [PlotlyTestLineComponent],
  templateUrl: './plotly-page.component.html',
  styleUrl: './plotly-page.component.scss'
})
export class PlotlyPageComponent {

}
