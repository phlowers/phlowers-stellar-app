import Plotly, { Camera, Data, Layout, ModeBarDefaultButtons } from 'plotly.js-dist-min';
import { Side, View } from './types';
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { createLoadAnnotations } from './createLoadAnnotations';
import { SpanLoad } from '@core/domain';

export interface CreatePlotParams {
  plotId: string;
  data: Data[];
  litData: GetSectionOutput;
  isSupportZoom: boolean;
  invert: boolean;
  view: View;
  camera: Camera | null;
  side: Side;
  spanLoads: (SpanLoad | null)[];
  startSupport: number;
  endSupport: number;
  axesNorms?: { x: number; y: number; z: number; aspectMode: string };
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

const supportCamera = {
  up: { x: 0, y: 0, z: 1 },
  // TODO: replace magic numbers
  center: {
    x: -0.97,
    y: -0.73,
    z: 0.07
  },
  eye: {
    x: 0.9,
    y: 0.1,
    z: -0.1
  },
  projection: { type: 'perspective' }
};

const axis = {
  backgroundcolor: 'gainsboro',
  gridcolor: 'dimgray',
  showbackground: true
};

/**
 * Creates or updates a Plotly plot based on the provided parameters.
 * The layout is configured based on whether it's a 2D or 3D view, and the axis norms are applied if provided.
 * @param plotParams
 * @returns
 */
const createScene = (plotParams: CreatePlotParams): Partial<Layout['scene']> => {
  if (plotParams.camera) {
    const y = Math.abs(plotParams.camera.eye?.y || 0);
    plotParams.camera.eye = {
      ...plotParams.camera.eye,
      y: plotParams.invert ? y : y * -1
    };
  }
  return {
    aspectmode: (['auto', 'data', 'cube', 'manual'] as const).includes(plotParams.axesNorms?.aspectMode as any)
      ? (plotParams.axesNorms?.aspectMode as 'auto' | 'data' | 'cube' | 'manual')
      : 'data',
    xaxis: axis,
    yaxis: axis,
    zaxis: axis,
    aspectratio: {
      x: plotParams.axesNorms?.x,
      y: plotParams.axesNorms?.y,
      z: plotParams.axesNorms?.z
    },
    annotations: createLoadAnnotations(plotParams),
    camera: plotParams.camera
      ? plotParams.camera
      : {
          ...(plotParams.isSupportZoom ? supportCamera : normalCamera())
        }
  };
};

/**
 * Creates or updates a Plotly plot based on the provided parameters.
 * The layout is configured based on whether it's a 2D or 3D view, and the axis norms are applied if provided.
 * @param plotParams
 */
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

/**
 * Creates or updates a Plotly plot based on the provided parameters.
 *
 * @param plotParams
 * @returns
 */
const layout3d = (plotParams: CreatePlotParams): Partial<Layout> => ({
  autosize: true,
  showlegend: false,
  margin: {
    l: 0,
    r: 0,
    t: 0,
    b: 0
  },
  xaxis: {
    range: [-600, 200]
  },
  yaxis: {
    range: [-100, 600]
  },
  scene: createScene(plotParams)
});

/**
 * Creates or updates a 2D Plotly plot based on the provided parameters.
 * The x and y axes are configured based on the 'side' and 'invert' parameters.
 * Annotations for loads are also created using the createLoadAnnotations function.
 * @param plotParams
 * @returns
 */
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
      showline: true,
      scaleratio: plotParams.side === 'face' ? 0.2 : undefined
    },
    yaxis: {
      ...axis,
      showticklabels: true,
      showgrid: true,
      showline: true,
      scaleanchor: plotParams.side === 'face' ? 'x' : undefined
    },
    annotations: createLoadAnnotations(plotParams)
  };
};

export const createPlot = (plotParams: CreatePlotParams) => {
  // check if div with id plotly-output exists
  if (!document.getElementById(plotParams.plotId)) {
    return undefined;
  }
  const baseLayout = plotParams.view === '3d' ? layout3d(plotParams) : layout2d(plotParams);

  // Use Plotly.react to update data without resetting camera/zoom
  // It will create the plot if it doesn't exist, or update it if it does
  return Plotly.react(plotParams.plotId, plotParams.data, baseLayout, config);
};
