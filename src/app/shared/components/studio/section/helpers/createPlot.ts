import Plotly, { Camera, Data, Layout, ModeBarDefaultButtons, ModeBarButton, Icon } from 'plotly.js-dist-min';
import { AspectRatio, ScalingFactors, Side, SelectedDisplayOptions, View } from '@shared/types/plot.types';
import { Distance, GetSectionOutput, ObstacleOutput } from '@services/worker_python/tasks/types';
import { createLoadAnnotations } from './createLoadAnnotations';
import { createCableModificationAnnotations } from './createCableModificationAnnotations';
import { CableModification, SpanLoad } from '@shared/domain';
import { Obstacle } from '@shared/domain/models/obstacle.model';
import { createDistanceVisuals } from './createDistanceTraces';
import { createDistanceMeasuringPointsTraces } from './createDistanceMeasuringPointsTraces';
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
  data: Data[];
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
  /** Computed aspect ratio from Python's getAspectRatio. Used for 3D scene aspectratio/aspectmode. */
  aspectRatio?: AspectRatio;
  /** User-controlled scaling factors. Used for 2D scaleratio computation. */
  scalingFactors?: ScalingFactors;
  /** Distance data from Python calculation for drawing distance lines. */
  distances: Distance[];
  /** Which distance type is currently selected for visualization. */
  distanceType: 'oblique' | 'vertical' | 'horizontal' | null;
  /** Registered distance/angle measurement point groups, rendered like obstacles. */
  distanceMeasuringPoints?: ObstacleOutput['obstacles'];
  /** Currently selected display overlay toggles (loads, base state, background, measure points). */
  selectedDisplayOptions?: SelectedDisplayOptions;
  /** Persisted cable length modifications to display as clickable annotations. */
  cableModifications?: readonly CableModification[];
  /** Lookup mapping a span uuid (left support uuid) to its absolute support index. */
  spanUuidToIndex?: ReadonlyMap<string, number>;
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
  // On initial render (camera === null), apply the default camera with the invert
  // flip so the scene faces the correct direction. On subsequent renders, pass the
  // live interactive camera UNMODIFIED so Plotly's stored layout camera always
  // matches the user's current view. This prevents any modebar viewport operation
  // from resetting to a stale or default camera value.
  let sceneCamera: Partial<Camera>;
  if (plotParams.camera === null) {
    const base = normalCamera();
    const y = Math.abs(base.eye?.y || 0);
    sceneCamera = {
      ...base,
      eye: {
        ...base.eye,
        y: plotParams.invert ? y : y * -1
      }
    };
  } else {
    sceneCamera = plotParams.camera;
  }

  const axisConfig = plotParams.selectedDisplayOptions?.transparentBackground
    ? { ...PLOT_AXIS_CONFIG, backgroundcolor: 'transparent', showbackground: false }
    : PLOT_AXIS_CONFIG;

  return {
    aspectmode:
      plotParams.scalingFactors?.aspectMode &&
      (['auto', 'data', 'cube', 'manual'] as const).includes(
        plotParams.scalingFactors.aspectMode as 'auto' | 'data' | 'cube' | 'manual'
      )
        ? (plotParams.scalingFactors.aspectMode as 'auto' | 'data' | 'cube' | 'manual')
        : 'manual',
    xaxis: axisConfig,
    yaxis: axisConfig,
    zaxis: axisConfig,
    aspectratio: {
      x: plotParams.aspectRatio?.x ?? 3,
      y: plotParams.aspectRatio?.y ?? 0.2,
      z: plotParams.aspectRatio?.z ?? 0.5
    },
    annotations: [
      ...createLoadAnnotations(plotParams),
      ...createCableModificationAnnotations(
        plotParams,
        plotParams.cableModifications ?? [],
        plotParams.spanUuidToIndex ?? new Map()
      ),
      ...createObstaclesAnnotations(plotParams),
      ...distanceAnnotations
    ],
    camera: sceneCamera
  };
};

/**
 * Builds the Plotly config including custom orbit/turntable/zoom/pan modebar buttons.
 * Defined as a function so that `Plotly.Icons` is accessed at call-time
 * rather than at module-evaluation time (which breaks test mocks).
 *
 * ⚠️ DO NOT restore `zoom3d`, `pan3d`, `orbitRotation` or `tableRotation` to their native
 * Plotly behaviour. The native buttons call `Plotly.relayout({"scene.dragmode": ...})`
 * which triggers `updateFx()` and resets the 3D camera (POV, angle, zoom) — bug #703.
 * The custom replacements use `setDragmodeDirect()` to bypass `relayout` and preserve
 * the camera. Tests in `createPlot.spec.ts` guard against this regression.
 */
const getConfig = () => {
  /**
   * Switches the 3D scene dragmode by directly setting the internal
   * orbit-camera-controller mode. This bypasses Plotly.relayout and its
   * updateFx() which forces camera.up = [0,0,1] on turntable switch,
   * causing an unwanted camera/zoom reset.
   * @param keyBindingMode - Controls what the primary mouse drag action does.
   *   Use 'rotate' for orbit/turntable, 'zoom' for zoom, 'pan' for pan.
   */
  const setDragmodeDirect = (gd: Plotly.PlotlyHTMLElement, mode: string, keyBindingMode = 'rotate'): void => {
    const gdInternal = gd as unknown as {
      layout?: { scene?: { dragmode?: string } };
      _fullLayout?: { scene?: { dragmode?: string; _scene?: { camera?: { mode?: string; keyBindingMode?: string } } } };
      _modeBar?: { updateActiveButton?: () => void };
    };
    const scene = gdInternal._fullLayout?.scene;
    if (scene?._scene?.camera) {
      scene._scene.camera.mode = mode;
      scene._scene.camera.keyBindingMode = keyBindingMode;
    }
    // Update layout objects so uirevision preserves the mode across Plotly.react calls
    if (scene) {
      scene.dragmode = mode;
    }
    if (gdInternal.layout?.scene) {
      gdInternal.layout.scene.dragmode = mode;
    }
    // Refresh modebar active-button highlighting without triggering a full relayout
    gdInternal._modeBar?.updateActiveButton?.();
  };

  const orbitButton: ModeBarButton = {
    name: 'customOrbitRotation',
    title: $localize`Orbital rotation`,
    icon: Plotly.Icons['3d_rotate'] as Icon,
    attr: 'scene.dragmode',
    val: 'orbit',
    click: (gd) => {
      setDragmodeDirect(gd, 'orbit');
    }
  };

  const turntableButton: ModeBarButton = {
    name: 'customTurntableRotation',
    title: $localize`Turntable rotation`,
    icon: Plotly.Icons['z-axis'] as Icon,
    attr: 'scene.dragmode',
    val: 'turntable',
    click: (gd) => {
      setDragmodeDirect(gd, 'turntable');
    }
  };

  const zoom3dButton: ModeBarButton = {
    name: 'customZoom3d',
    title: $localize`Zoom`,
    icon: Plotly.Icons['zoombox'] as Icon,
    attr: 'scene.dragmode',
    val: 'zoom',
    click: (gd) => {
      setDragmodeDirect(gd, 'zoom', 'zoom');
    }
  };

  const pan3dButton: ModeBarButton = {
    name: 'customPan3d',
    title: $localize`Pan`,
    icon: Plotly.Icons['pan'] as Icon,
    attr: 'scene.dragmode',
    val: 'pan',
    click: (gd) => {
      setDragmodeDirect(gd, 'pan', 'pan');
    }
  };

  return {
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
      'autoScale2d',
      'resetCameraDefault3d',
      'resetCameraLastSave3d',
      'resetScale2d',
      'orbitRotation',
      'tableRotation',
      'zoom3d',
      'pan3d'
    ] as ModeBarDefaultButtons[],
    modeBarButtonsToAdd: [orbitButton, turntableButton, zoom3dButton, pan3dButton]
  };
};

const layout3d = (
  plotParams: CreatePlotParams,
  distanceAnnotations: Partial<Plotly.Annotations>[]
): Partial<Layout> => ({
  autosize: true,
  showlegend: false,
  // Keep uirevision constant so Plotly never resets user-driven camera state.
  // On the very first render the plot element doesn't exist yet, so Plotly creates
  // it from scratch and applies the layout camera regardless of uirevision.
  // On subsequent Plotly.react() calls (e.g. after a slider change), the same
  // uirevision tells Plotly to preserve the interactive camera position.
  uirevision: 'stable',
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
  // Apply the user's scaling factors to constrain the Y axis relative to X.
  // Profile view (x,z plane): scaleratio = z_scale / x_scale
  // Face view (y,z plane):    scaleratio = z_scale / y_scale
  // When no scaling factors are provided, default to 1 (isometric 1:1).
  let scaleratio: number | undefined;
  if (plotParams.scalingFactors) {
    scaleratio =
      plotParams.side === 'face'
        ? plotParams.scalingFactors.z / plotParams.scalingFactors.y
        : plotParams.scalingFactors.z / plotParams.scalingFactors.x;
  } else {
    scaleratio = 1;
  }

  const xAutorange: 'reversed' | true = plotParams.side === 'face' || plotParams.invert ? 'reversed' : true;

  return {
    autosize: true,
    showlegend: false,
    plot_bgcolor: plotParams.selectedDisplayOptions?.transparentBackground ? 'transparent' : 'gainsboro',
    margin: {
      l: 50,
      r: 0,
      t: 20,
      b: 20
    },
    xaxis: {
      ...PLOT_AXIS_CONFIG,
      autorange: xAutorange,
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
      ...createCableModificationAnnotations(
        plotParams,
        plotParams.cableModifications ?? [],
        plotParams.spanUuidToIndex ?? new Map()
      ),
      ...createObstaclesAnnotations(plotParams),
      ...distanceAnnotations
    ]
  };
};

/**
 * Reads the current 3D camera directly from the Plotly DOM element's internal state.
 * This bypasses the Angular signal layer and always returns the live camera position
 * as Plotly knows it, even after the user has interacted with the plot.
 * Returns null if the element does not exist or has no camera data yet.
 */
const getLiveCamera = (documentRef: Document, plotId: string): Camera | null => {
  const el = documentRef.getElementById(plotId) as
    | (HTMLElement & {
        _fullLayout?: { scene?: { camera?: Camera } };
      })
    | null;
  return el?._fullLayout?.scene?.camera ?? null;
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
    return;
  }

  // For 3D plots, always read the live camera from the DOM before re-rendering.
  // This prevents Plotly's internal setViewport() from resetting the camera to a
  // stale value when the user interacts with the modebar (e.g. switches dragmode).
  // The DOM camera is the source of truth after the first render.
  const resolvedParams =
    plotParams.view === '3d'
      ? { ...plotParams, camera: getLiveCamera(plotParams.documentRef, plotParams.plotId) ?? plotParams.camera }
      : plotParams;
  const { traces: distanceTraces, annotations: distanceAnnotations } = createDistanceVisuals(resolvedParams);
  const distanceMeasuringPointsTraces =
    (resolvedParams.selectedDisplayOptions?.measurePoints ?? true)
      ? createDistanceMeasuringPointsTraces(
          resolvedParams.distanceMeasuringPoints,
          resolvedParams.view,
          resolvedParams.side
        )
      : [];
  const baseLayout =
    resolvedParams.view === '3d'
      ? layout3d(resolvedParams, distanceAnnotations)
      : layout2d(resolvedParams, distanceAnnotations);
  const allData = [...resolvedParams.data, ...distanceTraces, ...distanceMeasuringPointsTraces];

  // Use Plotly.react to update data without resetting camera/zoom
  // It will create the plot if it doesn't exist, or update it if it does
  return Plotly.react(plotParams.plotId, allData, baseLayout, getConfig());
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

/**
 * Applies a saved camera directly to a Plotly 3D plot via `Plotly.relayout`.
 * Called after the first render following a back-navigation to guarantee that
 * the saved camera is used regardless of any layout/uirevision timing issues.
 *
 * @param plotId - The DOM element ID of the Plotly plot container.
 * @param camera - The camera to restore.
 */
export const applyRestoreCamera = (plotId: string, camera: Camera): Promise<void> =>
  Plotly.relayout(plotId, { 'scene.camera': camera as unknown } as Record<string, unknown>) as unknown as Promise<void>;
