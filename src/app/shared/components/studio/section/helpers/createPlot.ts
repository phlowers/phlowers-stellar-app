import Plotly, { Camera, Layout, ModeBarDefaultButtons } from 'plotly.js-dist-min';
import { AxesNorms, Side, View } from '@shared/types/plot.types';
import { Distance, GetSectionOutput } from '@services/worker_python/tasks/types';
import { createLoadAnnotations } from './createLoadAnnotations';
import { SpanLoad } from '@shared/domain';
import { Obstacle } from '@shared/domain/models/obstacle.model';
import { DataObject } from './createPlotDataObject';
import { createDistanceVisuals } from './createDistanceTraces';
import { createObstaclesAnnotations } from './obstacles';
import { Support } from '@shared/domain/models/support.model';
import { PLOT_AXIS_CONFIG } from './plot.constants';

/**
 * Parameters required to create or update a Plotly section plot.
 * @category Studio
 */
export interface CreatePlotParams {
  /** Document reference injected by Angular for SSR-safe DOM access. */
  documentRef: Document;
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
  /** Domain support models for altitude lookups. */
  supports?: Support[];
  /** Normalization factors for the axes and Plotly aspect mode. */
  axesNorms?: AxesNorms;
  /** Distance data from Python calculation for drawing distance lines. */
  distances: Distance[];
  /** Which distance type is currently selected for visualization. */
  distanceType: 'oblique' | 'vertical' | 'horizontal' | null;
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
  },
  up: {
    x: 0,
    y: 0,
    z: 1
  }
});

const createScene = (
  plotParams: CreatePlotParams,
  distanceAnnotations: Partial<Plotly.Annotations>[]
): Partial<Layout['scene']> => {
  const baseCamera = plotParams.camera ?? normalCamera();
  const y = Math.abs(baseCamera.eye?.y || 0);
  const camera: Partial<Camera> = {
    ...baseCamera,
    eye: {
      ...baseCamera.eye,
      y: plotParams.invert ? y : y * -1
    }
  };
  return {
    aspectmode:
      plotParams.axesNorms?.aspectMode &&
      (['auto', 'data', 'cube', 'manual'] as const).includes(
        plotParams.axesNorms.aspectMode as 'auto' | 'data' | 'cube' | 'manual'
      )
        ? (plotParams.axesNorms.aspectMode as 'auto' | 'data' | 'cube' | 'manual')
        : 'manual',
    xaxis: PLOT_AXIS_CONFIG,
    yaxis: PLOT_AXIS_CONFIG,
    zaxis: PLOT_AXIS_CONFIG,
    aspectratio: {
      x: plotParams.axesNorms?.x ?? 3,
      y: plotParams.axesNorms?.y ?? 0.2,
      z: plotParams.axesNorms?.z ?? 0.5
    },
    annotations: [
      ...createLoadAnnotations(plotParams),
      ...createObstaclesAnnotations(plotParams),
      ...distanceAnnotations
    ],
    camera
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

const layout3d = (
  plotParams: CreatePlotParams,
  distanceAnnotations: Partial<Plotly.Annotations>[]
): Partial<Layout> => ({
  autosize: true,
  showlegend: false,
  margin: {
    l: 0,
    r: 0,
    t: 0,
    b: 0
  },
  scene: createScene(plotParams, distanceAnnotations)
});

const layout2d = (
  plotParams: CreatePlotParams,
  distanceAnnotations: Partial<Plotly.Annotations>[]
): Partial<Layout> => {
  // For the profile view, do not constrain the Y axis — let Plotly autorange both axes
  // independently so the actual cable altitude is displayed at a realistic scale.
  // The axesNorms from compute_aspect_ratio are calibrated for 3D rendering and would
  // exaggerate the vertical axis (e.g. ±10k) in 2D profile.
  let scaleratio: number | undefined;
  if (plotParams.side === 'face') {
    scaleratio = plotParams.axesNorms ? plotParams.axesNorms.z / plotParams.axesNorms.y : 0.2;
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
      ...PLOT_AXIS_CONFIG,
      autorange: plotParams.invert ? 'reversed' : true,
      showticklabels: true,
      showgrid: true,
      showline: true
    },
    yaxis: {
      ...PLOT_AXIS_CONFIG,
      showticklabels: true,
      showgrid: true,
      showline: true,
      scaleratio,
      scaleanchor: scaleratio === undefined ? undefined : 'x'
    },
    annotations: [
      ...createLoadAnnotations(plotParams),
      ...createObstaclesAnnotations(plotParams),
      ...distanceAnnotations
    ]
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
  if (!plotParams.documentRef.getElementById(plotParams.plotId)) {
    console.warn(`Plot element not found: ${plotParams.plotId}`);
    return;
  }
  const { traces: distanceTraces, annotations: distanceAnnotations } = createDistanceVisuals(plotParams);
  const baseLayout =
    plotParams.view === '3d' ? layout3d(plotParams, distanceAnnotations) : layout2d(plotParams, distanceAnnotations);
  const allData = [...plotParams.data, ...distanceTraces];

  // Use Plotly.react to update data without resetting camera/zoom
  // It will create the plot if it doesn't exist, or update it if it does
  return Plotly.react(plotParams.plotId, allData, baseLayout, config);
};

/**
 * Purges a Plotly plot if the target element exists.
 * Safe to call multiple times.
 */
export const purgePlot = (documentRef: Document, plotId: string): void => {
  const plotElement = documentRef.getElementById(plotId);
  if (!plotElement) {
    return;
  }

  Plotly.purge(plotElement);
};
