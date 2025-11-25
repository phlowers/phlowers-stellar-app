import Plotly, {
  Data,
  Layout,
  ModeBarDefaultButtons,
  ScatterData
} from 'plotly.js-dist-min';
import { View } from './types';

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

const scene = (isSupportZoom: boolean, invert: boolean) => ({
  aspectmode: 'manual' as 'manual' | 'auto' | 'cube' | 'data' | undefined,
  xaxis: axis,
  yaxis: axis,
  zaxis: axis,
  aspectratio: {
    x: 3,
    y: 0.2,
    z: 0.5
  },
  camera: {
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

const layout3d = (isSupportZoom: boolean, invert: boolean) => ({
  autosize: true,
  showlegend: false,
  margin: {
    l: 0,
    r: 0,
    t: 0,
    b: 0
  },
  scene: scene(isSupportZoom, invert)
});

const layout2d: (invert: boolean, data: Data[]) => Partial<Layout> = (
  invert: boolean,
  data: Data[]
) => {
  const allXValues = data.flatMap(
    (d) => ((d as ScatterData).x as number[]) ?? []
  ) as number[];
  let xMin = Math.min(...allXValues);
  let xMax = Math.max(...allXValues);
  xMin = Math.min(-2, xMin);
  xMax = Math.max(2, xMax);
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
      autorange: false,
      showticklabels: true,
      showgrid: true,
      showline: true,
      range: [xMin, xMax]
    },
    yaxis: {
      ...axis,
      showticklabels: true,
      showgrid: true,
      showline: true
    }
  };
};

export const createPlot = (
  plotId: string,
  data: Data[],
  isSupportZoom: boolean,
  invert: boolean,
  view: View
) => {
  // check if div with id plotly-output exists
  if (!document.getElementById(plotId)) {
    return undefined;
  }
  const baseLayout =
    view === '3d' ? layout3d(isSupportZoom, invert) : layout2d(invert, data);

  return Plotly.newPlot(plotId, data, baseLayout, config);
};
