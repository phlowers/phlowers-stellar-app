import Plotly, { Data } from 'plotly.js-dist-min';

const scene = {
  aspectmode: 'manual' as 'manual' | 'auto' | 'cube' | 'data' | undefined,
  aspectratio: {
    x: 3,
    y: 0.2,
    z: 0.5
  },
  camera: {
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
  }
};

const config = {
  displayModeBar: true,
  displaylogo: false,
  fillFrame: false,
  responsive: false,
  autosizable: false
};

const layout = {
  autosize: false,
  showlegend: false,
  margin: {
    l: 0,
    r: 0,
    t: 0,
    b: 0
  },
  scene
};

export const createPlot = (
  plotId: string,
  data: Data[],
  width: number,
  height: number
) => {
  return Plotly.newPlot(
    plotId,
    data,
    {
      ...layout,
      width: width,
      height: height
    },
    config
  );
};
