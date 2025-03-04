import { Component, ElementRef, OnInit, viewChild } from '@angular/core';

declare const Plotly: any;

@Component({
  selector: 'app-plotly-test-line',
  imports: [],
  templateUrl: './plotly-test-line.component.html',
  styleUrl: './plotly-test-line.component.scss'
})
export class PlotlyTestLineComponent implements OnInit {
  plotlyLineContainer = viewChild<ElementRef<HTMLDivElement>>('plotlyLine');

  ngOnInit(): void {
    // Plot the initial chart
    Plotly.newPlot(this.plotlyLineContainer()?.nativeElement, this.data);

    // Plotly.newPlot(this.plotlyLineContainer()?.nativeElement, [{
    //   x: [1, 2, 3, 4, 5],
    //   y: [1, 2, 4, 8, 16]
    // }],
    //   { margin: { t: 0 } });
  }

//     { x:0,  y:16.8, z:5 },
  //   { x:50, y:3.00890769, z:5 },
  //   { x:100,y:-5.65382853, z:5 },
  //   { x:150,y:-9.27490824, z:5 },
  //   { x:200,y:-7.8905724, z:5 },
  //   { x:250,y:-1.48696614, z:5 },
  //   { x:300, y:10, z:5 },

  trace1 = {
    x: [0, 50, 100, 150, 200, 250, 300],
    z: [16.8, 3.00890769, -5.65382853, -9.27490824, -7.8905724, -1.48696614, 10],
    y: [5, 5, 5, 5, 5, 5, 5],
    type: 'scatter3d'
  };
  data = [this.trace1];

  // Function to update y-values

  // updatePlot(addValue: any): void {
  //   var yValues = this.data[0].z.map(z => z + addValue);
  //   Plotly.restyle(this.plotlyLineContainer()?.nativeElement, 'z', [yValues]);
  // }
  // Example: Add 5 to each y-value
  // this.updateYValues(5);

}
