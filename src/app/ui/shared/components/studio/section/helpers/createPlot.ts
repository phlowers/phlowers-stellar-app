import Plotly, { Camera, Layout, ModeBarDefaultButtons } from 'plotly.js-dist-min';
import { Side, View } from './types';
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { createLoadAnnotations } from './createLoadAnnotations';
import { SpanLoad } from '@core/domain';
import { Obstacle } from '@core/domain/models/obstacle.model';
import { DataObject } from './createPlotDataObject';
import { createObstaclesAnnotations } from './obstacles';

/**
 * Parameters required to create or update a Plotly section plot.
 * @category Studio
 */
export interface CreatePlotParams {
  /** The DOM element ID of the plot container. */
  plotId: string;
  /** Array of data objects to render in the plot. */
  data: DataObject[];
  /** Raw section output data from the Python computation engine. */
  litData: GetSectionOutput;
  /** Whether to invert the plot axis direction. */
  invert: boolean;
  /** The rendering dimension of the plot. */
  view: View;
  /** The current camera position, or `null` to use the default. */
  camera: Camera | null;
  /** The viewing side of the plot. */
  side: Side;
  /** Array of span loads; `null` entries indicate spans with no load. */
  spanLoads: (SpanLoad | null)[];
  /** Zero-based index of the first support to display. */
  startSupport: number;
  /** Zero-based index of the last support to display. */
  endSupport: number;
  /** List of obstacles to annotate on the plot. */
  obstacles: Obstacle[];
  /** UUID of the currently selected obstacle, or `null`. */
  currentObstacleUuid: string | null;
  /** Index of the currently selected obstacle position point. */
  currentObstaclePointIndex: number;
  /** Normalization factors for the axes and Plotly aspect mode. */
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
    aspectmode:
      plotParams.axesNorms?.aspectMode &&
      (['auto', 'data', 'cube', 'manual'] as const).includes(
        plotParams.axesNorms.aspectMode as 'auto' | 'data' | 'cube' | 'manual'
      )
        ? (plotParams.axesNorms.aspectMode as 'auto' | 'data' | 'cube' | 'manual')
        : 'manual',
    xaxis: axis,
    yaxis: axis,
    zaxis: axis,
    aspectratio: {
      x: plotParams.axesNorms?.x ?? 3,
      y: plotParams.axesNorms?.y ?? 0.2,
      z: plotParams.axesNorms?.z ?? 0.5
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
  let scaleratio: number | undefined;
  if (plotParams.axesNorms) {
    if (plotParams.side === 'face') {
      scaleratio = plotParams.axesNorms.z / plotParams.axesNorms.y;
    } else if (plotParams.side === 'profile') {
      scaleratio = plotParams.axesNorms.z / plotParams.axesNorms.x;
    }
  } else {
    scaleratio = plotParams.side === 'face' ? 0.2 : undefined;
  }

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
      scaleratio,
      scaleanchor: scaleratio !== undefined ? 'x' : undefined
    },
    annotations: [...createLoadAnnotations(plotParams), ...createObstaclesAnnotations(plotParams)]
  };
};

/**
 * Creates or updates a Plotly plot in the DOM element identified by `plotParams.plotId`.
 * Selects the appropriate 2D or 3D layout and uses `Plotly.react` for efficient updates
 * without resetting the camera or zoom.
 * @category Studio
 * @param plotParams - The full set of parameters describing the plot data, layout, and options.
 * @returns The Plotly promise returned by `Plotly.react`, or `undefined` if the target element is not found.
 */
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
