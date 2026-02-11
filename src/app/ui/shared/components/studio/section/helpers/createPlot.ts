import Plotly, { Camera, Layout, ModeBarDefaultButtons } from 'plotly.js-dist-min';
import { Side, View } from './types';
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { createLoadAnnotations } from './createLoadAnnotations';
import { SpanLoad } from '@core/domain';
import { Obstacle } from '@core/domain/models/obstacle.model';
import { DataObject } from './createPlotDataObject';
import { createObstaclesAnnotations } from './obstacles';

export interface CreatePlotParams {
  plotId: string;
  data: DataObject[];
  litData: GetSectionOutput;
  invert: boolean;
  view: View;
  camera: Camera | null;
  side: Side;
  spanLoads: (SpanLoad | null)[];
  startSupport: number;
  endSupport: number;
  obstacles: Obstacle[];
  currentObstacleUuid: string | null;
  currentObstaclePointIndex: number;
}

const normalCamera = () => ({
  center: {
    x: 0,
    y: 0,
    z: 0
  },
  eye: {
    x: 0.02,
    y: -3.5,
    z: 0.2
  }
});

const axis = {
  backgroundcolor: 'gainsboro',
  gridcolor: 'dimgray',
  showbackground: true
};

const createScene = (plotParams: CreatePlotParams): Partial<Layout['scene']> => {
  if (plotParams.camera) {
    const y = Math.abs(plotParams.camera.eye?.y || 0);
    plotParams.camera.eye = {
      ...plotParams.camera.eye,
      y: plotParams.invert ? y : y * -1
    };
  }
  return {
    aspectmode: 'manual' as 'manual' | 'auto' | 'cube' | 'data' | undefined,
    xaxis: axis,
    yaxis: axis,
    zaxis: axis,
    aspectratio: {
      x: 3,
      y: 0.2,
      z: 0.5
    },
    annotations: [...createLoadAnnotations(plotParams), ...createObstaclesAnnotations(plotParams)],
    camera: plotParams.camera
      ? plotParams.camera
      : {
          ...normalCamera()
        }
  };
};

const config = {
  displayModeBar: true,
  displaylogo: false,
  fillFrame: false,
  responsive: true,
  modeBarButtonsToRemove: [
    'lasso2d',
    'select2d',
    'sendDataToCloud',
    'hoverClosestCartesian',
    'hoverCompareCartesian',
    'resetLastSave',
    'autoScale2d'
  ] as ModeBarDefaultButtons[]
};

const layout3d = (plotParams: CreatePlotParams): Partial<Layout> => ({
  autosize: true,
  showlegend: false,
  margin: {
    l: 0,
    r: 0,
    t: 0,
    b: 0
  },
  scene: createScene(plotParams)
});

const layout2d: (plotParams: CreatePlotParams) => Partial<Layout> = (plotParams) => {
  return {
    autosize: true,
    showlegend: false,
    plot_bgcolor: 'gainsboro',
    margin: {
      l: 50,
      r: 0,
      t: 20,
      b: 20
    },
    xaxis: {
      ...axis,
      autorange: plotParams.invert ? 'reversed' : true,
      showticklabels: true,
      showgrid: true,
      showline: true
    },
    yaxis: {
      ...axis,
      showticklabels: true,
      showgrid: true,
      showline: true,
      scaleratio: plotParams.side === 'face' ? 0.2 : undefined,
      scaleanchor: plotParams.side === 'face' ? 'x' : undefined
    },
    annotations: [...createLoadAnnotations(plotParams), ...createObstaclesAnnotations(plotParams)]
  };
};

export const createPlot = (plotParams: CreatePlotParams) => {
  // check if div with id plotly-output exists
  if (!document.getElementById(plotParams.plotId)) {
    console.warn(`Plot element not found: ${plotParams.plotId}`);
    return;
  }
  const baseLayout = plotParams.view === '3d' ? layout3d(plotParams) : layout2d(plotParams);

  // Use Plotly.react to update data without resetting camera/zoom
  // It will create the plot if it doesn't exist, or update it if it does
  return Plotly.react(plotParams.plotId, plotParams.data, baseLayout, config);
};
