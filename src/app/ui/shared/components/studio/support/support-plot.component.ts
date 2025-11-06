import { Component, OnInit } from '@angular/core';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { KeyFilterModule } from 'primeng/keyfilter';
import { MessageModule } from 'primeng/message';
import plotly from 'plotly.js-dist-min';
import { WorkerPythonService } from '@src/app/core/services/worker_python/worker-python.service';
import { Task } from '@src/app/core/services/worker_python/tasks/types';

const layout = () => ({
  autosize: true,
  showlegend: false,
  margin: {
    l: 0,
    r: 0,
    t: 0,
    b: 0
  },
  width: 300
});

@Component({
  selector: 'app-support-plot',
  templateUrl: './support-plot.component.html',
  imports: [SelectModule, FormsModule, KeyFilterModule, MessageModule]
})
export class SupportPlotComponent implements OnInit {
  constructor(private readonly workerPythonService: WorkerPythonService) {}

  ngOnInit() {
    this.workerPythonService.ready$.subscribe(async (ready) => {
      if (ready) {
        const { result } = await this.workerPythonService.runTask(
          Task.getSupportCoordinates,
          {}
        );
        const { shape_points, text_display_points, text_to_display } = result;
        console.log('shape_points', shape_points);
        console.log('text_display_points', text_display_points);
        console.log('text_to_display', text_to_display);
        this.createPlot(shape_points, text_display_points, text_to_display);
      }
    });
  }

  createPlot(
    shape_points: number[][],
    text_display_points: number[][],
    text_to_display: string[]
  ) {
    const shape_data = {
      x: shape_points.map((point) => point[0]),
      y: shape_points.map((point) => point[1]),
      z: shape_points.map((point) => point[2]),
      type: 'scatter3d' as const,
      mode: 'lines' as const,
      line: {
        color: 'blue',
        width: 2
      }
    };
    const text_data = {
      x: text_display_points.map((point) => point[0]),
      y: text_display_points.map((point) => point[1]),
      z: text_display_points.map((point) => point[2]),
      type: 'scatter3d' as const,
      mode: 'text' as const,
      text: text_to_display,
      textposition: 'inside' as const
    };
    const data = [shape_data, text_data];
    plotly.newPlot('plotly-output-support', data, layout());
  }
}
