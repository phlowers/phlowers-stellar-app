import Plotly, { Data } from 'plotly.js-dist-min';

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
    x: -0.86,
    y: -0.88,
    z: 0.06
  },
  projection: { type: 'perspective' }
};

const scene = (isSupportZoom: boolean, invert: boolean) => ({
  aspectmode: 'manual' as 'manual' | 'auto' | 'cube' | 'data' | undefined,
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
  responsive: false,
  autosizable: false
};

const layout = (isSupportZoom: boolean, invert: boolean) => ({
  autosize: false,
  showlegend: false,
  margin: {
    l: 0,
    r: 0,
    t: 0,
    b: 0
  },
  scene: scene(isSupportZoom, invert)
});

export const createPlot = (
  plotId: string,
  data: Data[],
  width: number,
  height: number,
  isSupportZoom: boolean,
  invert: boolean
) => {
  return Plotly.newPlot(
    plotId,
    data,
    {
      ...layout(isSupportZoom, invert),
      width: width,
      height: height,
      xaxis: {
        autorange: invert ? 'reversed' : true
      }
    },
    config
  );
};
