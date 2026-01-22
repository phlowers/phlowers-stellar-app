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
  plotParams.spanLoads.forEach((spanLoad, index) => {
    if (spanLoad) {
      const span = currentSpans[index];
      const middlePoint = span[Math.round((span.length - 1) / 2)];
      annotations.push({
        ...BASE_ANNOTATION,
        x: middlePoint[0],
        y: plotParams.view === '2d' ? middlePoint[2] : middlePoint[1],
        //@ts-expect-error Plotly.js-dist-min does not support z axis
        z: middlePoint[2],
        text: spanLoad.type === LoadType.PUNCTUAL ? LOAD_ICON : MARKING_ICON
      });
    }
  });
  return annotations;
};
