import { AfterViewInit, Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { PlotlyLine } from '../plotly.model';
import { SliderModule } from 'primeng/slider';
import { FormsModule } from '@angular/forms';

declare const Plotly: any;

@Component({
  selector: 'app-plotly-comp',
  imports: [FormsModule, SliderModule],
  templateUrl: './plotly-comp.component.html',
  styleUrl: './plotly-comp.component.scss'
})
export class PlotlyComponent implements AfterViewInit {
  // localized texts
  sliderAriaLabel = $localize`Change line height`;

  plotlyLineContainer = viewChild<ElementRef<HTMLDivElement>>('plotlyLine');

  plotElement = signal<HTMLDivElement | undefined>(undefined);

  lineTrace = input<PlotlyLine>({
    x: [],
    z: [],
    y: []
  });

  lineTraceChange = output<PlotlyLine>();

  private initialLineTrace = signal<PlotlyLine>({
    x: [],
    z: [],
    y: []
  });

  minSliderValue = signal<number>(0);
  maxSliderValue = signal<number>(0);

  // Arbitrary padding for min/max Z values
  private readonly Z_VALUEPADDING = 0;
  private readonly Z_VIEWPADDING = 20;

  // Arbitrary value for scale to transform line Y axis (written Z in plotly)
  private readonly SCALE = 2;

  // Computed signals for plot data
  trace1 = computed(() => ({
    x: this.lineTrace().x,
    z: this.lineTrace().z,
    y: this.lineTrace().y,
    line: { color: 'red', width: 3 },
    type: 'scatter3d',
    mode: 'lines'
  }));

  trace2 = computed(() => ({
    x: this.initialLineTrace().x,
    z: this.initialLineTrace().z,
    y: this.initialLineTrace().y,
    line: { color: 'green', width: 4 },
    type: 'scatter3d',
    mode: 'lines'
  }));

  data = computed(() => [this.trace1(), this.trace2()]);

  // Plotly layout
  layout = {
    showlegend: false,
    // width: 1200,
    // height: 400,
    scene: {
      aspectmode: 'manual', // if data is used here, aspect ratio will change on user modification with slider
      aspectratio: {
        x: Number as any,
        y: Number as any, // will be 0.3 or a value close to 0 (but not O !)
        z: Number as any
      },
      camera: {
        // magic numbers
        eye: {
          x: 0,
          y: -4.5, // to adapt for screen or view size
          z: 0.1
        }
      },
      xaxis: {} as any,
      yaxis: {} as any,
      zaxis: {} as any
    }
  };

  // Plotly conf
  config = {
    // displayModeBar: false
    displaylogo: false,
    responsive: true
  };

  ngAfterViewInit() {
    if (this.lineTrace()) {
      const xValues = this.lineTrace().x;
      const yValues = this.lineTrace().y;
      const zValues = this.lineTrace().z;

      if (xValues.length === 0 || yValues.length === 0 || zValues.length === 0) {
        this.minSliderValue.set(0);
        this.maxSliderValue.set(0);
        return; // exit to avoid dividing by 0
      }

      // find necessary axis sizes
      const xMin = Math.min(...xValues);
      const xMax = Math.max(...xValues);
      const yMin = Math.min(...yValues);
      const yMax = Math.max(...yValues);
      const zMin = Math.min(...zValues) - this.Z_VIEWPADDING;
      const zMax = Math.max(...zValues) + this.Z_VIEWPADDING;

      // determine scene aspect ratio
      const xRatio = xMax / 2 / 10;
      const zRatio = zMax / 2 / 10;

      // Restrain axis sizes to avoid camera "following" the changes made in range slider
      this.layout.scene = {
        ...this.layout.scene,
        aspectratio: {
          x: xRatio,
          y: 0.3, // should be close to 0 but not 0
          z: zRatio
        },
        xaxis: { range: [xMin, xMax] },
        yaxis: { range: [yMin, yMax] },
        zaxis: { range: [zMin, zMax] }
      };

      // set original line for comparison
      this.initialLineTrace.set(this.lineTrace());

      // set min max value for slider
      this.minSliderValue.set(-(zMax - zMin) / this.SCALE - this.Z_VALUEPADDING);
      this.maxSliderValue.set((zMax - zMin) / this.SCALE + this.Z_VALUEPADDING);

      this.plotElement.set(this.plotlyLineContainer()?.nativeElement);

      // Init plotly
      Plotly.newPlot(this.plotElement(), this.data(), this.layout, this.config);
    }
  }

  // Handle slider change event
  onSliderChange(userSelectedValue: number): void {
    const newZValues = this.initialLineTrace().z.map((z) => z + userSelectedValue);

    const updatedLineTrace = {
      ...this.lineTrace(),
      z: newZValues
    };

    this.lineTraceChange.emit(updatedLineTrace);

    Plotly.restyle(this.plotElement(), { z: [newZValues] }, [0]);
  }
}
