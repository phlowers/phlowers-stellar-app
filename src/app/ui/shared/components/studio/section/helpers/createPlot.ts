import Plotly, {
  Camera,
  Data,
  Layout,
  ModeBarDefaultButtons
} from 'plotly.js-dist-min';
import { Side, View } from './types';

const normalCamera = (invert: boolean) => ({
  center: {
    x: 0,
    y: 0,
    z: 0
  },
  eye: {
    x: 0.02,
    y: invert ? 2 : -2,
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

const scene = (
  isSupportZoom: boolean,
  invert: boolean,
  camera: Camera | null
) => ({
  aspectmode: 'data' as 'manual' | 'auto' | 'cube' | 'data' | undefined,
  xaxis: axis,
  yaxis: { ...axis, scaleanchor: 'x', scaleratio: 1 },
  zaxis: axis,
  camera: camera ?? {
    ...(isSupportZoom ? supportCamera : normalCamera(invert))
  }
});

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
  isSupportZoom: boolean,
  invert: boolean,
  camera: Camera | null
) => ({
  autosize: true,
  showlegend: false,
  margin: {
    l: 0,
    r: 0,
    t: 0,
    b: 0
  },
  scene: scene(isSupportZoom, invert, camera)
});

const layout2d: (
  invert: boolean,
  data: Data[],
  side: Side
) => Partial<Layout> = (invert: boolean, data: Data[], side: Side) => {
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
      autorange: side === 'face' ? false : true,
      showticklabels: true,
      showgrid: true,
      showline: true
    },
    yaxis: {
      ...axis,
      showticklabels: true,
      showgrid: true,
      showline: true,
      scaleratio: side === 'face' ? 0.2 : undefined,
      scaleanchor: side === 'face' ? 'x' : undefined
    }
  };
};

export const createPlot = (
  plotId: string,
  data: Data[],
  isSupportZoom: boolean,
  invert: boolean,
  view: View,
  camera: Camera | null,
  side: Side
) => {
  // check if div with id plotly-output exists
  if (!document.getElementById(plotId)) {
    return undefined;
  }
  const baseLayout =
    view === '3d'
      ? layout3d(isSupportZoom, invert, camera)
      : layout2d(invert, data, side);

  return Plotly.newPlot(plotId, data, baseLayout, config);
};
