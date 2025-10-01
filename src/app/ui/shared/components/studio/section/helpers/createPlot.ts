import Plotly, { Data } from 'plotly.js-dist-min';

const normalCamera = {
  center: {
    x: 0,
    y: 0,
    z: 0
  },
  eye: {
    x: 0.02,
    y: -2,
    z: 0.2
  }
};

const supportCamera = {
  up: { x: 0, y: 0, z: 1 },
  center: {
    x: -0.9720976714845194,
    y: -0.7363790475194332,
    z: 0.05874381600979379
  },
  eye: {
    x: -0.8630687128715443,
    y: -0.8798429988477345,
    z: 0.06458185961746794
  },
  projection: { type: 'perspective' }
};

const scene = (isSupportZoom: boolean) => ({
  aspectmode: 'manual' as 'manual' | 'auto' | 'cube' | 'data' | undefined,
  aspectratio: {
    x: 3,
    y: 0.2,
    z: 0.5
  },
  camera: {
    ...(isSupportZoom ? supportCamera : normalCamera)
  }
});

const config = {
  displayModeBar: true,
  displaylogo: false,
  fillFrame: false,
  responsive: false,
  autosizable: false
};

const layout = (isSupportZoom: boolean) => ({
  autosize: false,
  showlegend: false,
  margin: {
    l: 0,
    r: 0,
    t: 0,
    b: 0
  },
  scene: scene(isSupportZoom)
});

export const createPlot = (
  plotId: string,
  data: Data[],
  width: number,
  height: number,
  isSupportZoom: boolean
) => {
  return Plotly.newPlot(
    plotId,
    data,
    {
      ...layout(isSupportZoom),
      width: width,
      height: height
    },
    config
  );
};
