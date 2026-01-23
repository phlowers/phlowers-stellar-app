import * as Plotly from 'plotly.js-dist-min';
import { CreatePlotParams } from './createPlot';

const LOAD_COLOR = '#4A355A';
const LOAD_ICON = '&#xf5cd;';
const MARKING_ICON = '&#xf08d;';

export enum LoadType {
  PUNCTUAL = 'punctual',
  MARKING = 'marking'
}

const BASE_ANNOTATION: Partial<Plotly.Annotations> = {
  xref: 'x' as const,
  yref: 'y' as const,
  ax: 0,
  ay: -50,
  showarrow: true,
  arrowhead: 0,
  startarrowhead: 6,
  arrowcolor: LOAD_COLOR,
  captureevents: true,
  bordercolor: LOAD_COLOR,
  borderpad: 6,
  bgcolor: 'rgba(0,0,0,0)',
  font: {
    family: 'FontAwesome',
    color: LOAD_COLOR,
    size: 8
  },
  arrowwidth: 1
};

export const createLoadAnnotations = (
  plotParams: CreatePlotParams
): Plotly.Annotations[] => {
  const annotations: Plotly.Annotations[] = [];
  const currentSpans = plotParams.litData.spans.slice(
    plotParams.startSupport,
    plotParams.endSupport + 1
  );
  console.log('spans length is', plotParams.litData.spans.length);
  console.log(plotParams.litData.loads_coords);
  plotParams.spanLoads.forEach((spanLoad, index) => {
    const current_load_coord = plotParams.litData.loads_coords[index];
    if (spanLoad && current_load_coord) {
      console.log(current_load_coord);
      annotations.push({
        ...BASE_ANNOTATION,
        x: current_load_coord[0],
        y: plotParams.view === '2d' ? current_load_coord[2] : current_load_coord[1],
        //@ts-expect-error Plotly.js-dist-min does not support z axis
        z: current_load_coord[2],
        text: spanLoad.type === LoadType.PUNCTUAL ? LOAD_ICON : MARKING_ICON
      });
  }
  });
  return annotations;
};
