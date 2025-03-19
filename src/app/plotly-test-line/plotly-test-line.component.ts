import { AfterViewInit, Component, computed, ElementRef, input, signal, viewChild } from '@angular/core';
import { PlotlyLine } from './plotly-line.model';

declare const Plotly: any;

@Component({
  selector: 'app-plotly-test-line',
  imports: [],
  templateUrl: './plotly-test-line.component.html',
  styleUrl: './plotly-test-line.component.scss'
})
export class PlotlyTestLineComponent implements AfterViewInit {
  plotlyLineContainer = viewChild<ElementRef<HTMLDivElement>>('plotlyLine');

  // Have to initiate data for input since it can't be a required input for some reason
  // (this way comp' will receive data, otherwize it won't...)
  lineTrace = input<PlotlyLine>({
    x: [],
    z: [],
    y: []
  });

  trace1 = computed(() => ({
    x: this.lineTrace().x,
    z: this.lineTrace().z,
    y: this.lineTrace().y,
    'line': {'color': 'red', 'width': 3},
    type: 'scatter3d',
    mode: 'lines'
  }));

  initialLineTrace = this.lineTrace();
  trace2 = computed(() => ({
    x: this.initialLineTrace.x,
    z: this.initialLineTrace.z,
    y: this.initialLineTrace.y,
    'line': {'color': 'green', 'width': 4},
    type: 'scatter3d',
    mode: 'lines'
  }));

  data = computed(() => [this.trace1(), this.trace2()]);

  // AfterViewInit since we're listening to a DOM el in template
  ngAfterViewInit() {
    if (this.lineTrace()) {
      Plotly.newPlot(this.plotlyLineContainer()?.nativeElement, this.data(), this.layout, this.config);
    }
  }

  layout = {
    showlegend: false,
    width: 1200,
    height: 400,
    scene: {
      aspectmode: "data",
      // aspectratio: {
      //   x: 1,
      //   y: 1,
      //   z: 1
      // },
      camera: {
        eye: {
          x: 0,
          y: -5,
          z: 0
        }
      }
    }
  }

  config = {
    // displayModeBar: false
    displaylogo: false,
    responsive: true,
  }

  // Function to update y-values

  // updatePlot(addValue: any): void {
  //   var yValues = this.data[0].z.map(z => z + addValue);
  //   Plotly.restyle(this.plotlyLineContainer()?.nativeElement, 'z', [yValues]);
  // }
  // Example: Add 5 to each y-value
  // this.updateYValues(5);

  // named Z but in reality Y axis in plotly is Z axis. Go figure!
  arbitraryValueToUpdateMinMaxZ = 10;
  setMinLineRangeZ() {
    return Math.min(...this.lineTrace().z) - this.arbitraryValueToUpdateMinMaxZ
  }
  setMaxLineRangeZ() {
    return Math.max(...this.lineTrace().z) + this.arbitraryValueToUpdateMinMaxZ
  }
  getMiddleLineRangeZ() {
    return (this.setMaxLineRangeZ() + this.setMinLineRangeZ()) / 2;
  }
}
