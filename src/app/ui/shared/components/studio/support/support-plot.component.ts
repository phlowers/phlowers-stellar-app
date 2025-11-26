import { Component, effect, input } from '@angular/core';
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
    l: 5,
    r: 5,
    t: 5,
    b: 5
  },
  width: 340,
  height: 330
});

const config = {
  displayModeBar: false,
  displaylogo: false
};

@Component({
  selector: 'app-support-plot',
  templateUrl: './support-plot.component.html',
  imports: [SelectModule, FormsModule, KeyFilterModule, MessageModule]
})
export class SupportPlotComponent {
  coordinates = input<(number | undefined)[][]>();
  attachmentSetNumbers = input<number[]>();
  constructor(private readonly workerPythonService: WorkerPythonService) {
    effect(() => {
      if (
        this.coordinates()?.length &&
        this.attachmentSetNumbers()?.length &&
        this.workerPythonService.ready
      ) {
        this.refreshPlot(this.coordinates()!, this.attachmentSetNumbers()!);
      } else {
        this.clearPlot();
      }
    });
  }

  clearPlot() {
    plotly.purge('plotly-output-support');
  }

  async refreshPlot(
    coordinates: (number | undefined)[][],
    attachmentSetNumbers: number[]
  ) {
    const { result } = await this.workerPythonService.runTask(
      Task.getSupportCoordinates,
      {
        coordinates: coordinates,
        attachmentSetNumbers: attachmentSetNumbers
      }
    );
    const { shape_points, text_display_points, text_to_display } = result;
    this.createPlot(shape_points, text_display_points, text_to_display);
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
    plotly.newPlot('plotly-output-support', data, layout(), config);
  }
}
