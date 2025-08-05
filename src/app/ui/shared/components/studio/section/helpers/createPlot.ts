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
      y: -1.4,
      z: 0.2
    }
  }
};

const options = {
  displayModeBar: false,
  fillFrame: false,
  responsive: false,
  autosizable: false
};

export const createPlot = (
  plotId: string,
  finalData: Data[],
  width: number,
  height: number
) => {
  return Plotly.newPlot(
    plotId,
    finalData,
    {
      width: width,
      height: height,
      autosize: false,
      showlegend: false,
      margin: {
        l: 0,
        r: 0,
        t: 0,
        b: 0
      },
      scene
    },
    options
  );
};
