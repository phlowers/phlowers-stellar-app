import * as Plotly from 'plotly.js-dist-min';
import { CreatePlotParams } from './createPlot';
import { cloneDeep } from 'lodash';

const LOAD_COLOR = '#4A355A';
const LOAD_ICON = '&#xf5cd;';
const MARKING_ICON = '&#xf08d;';

/**
 * Data payload attached to a Plotly span load annotation for click event handling.
 * @category Studio
 */
export interface SpanLoadAnnotationData {
  /** Discriminator indicating this annotation represents a span load. */
  type: 'spanLoad';
  /** UUID of the support associated with this span load. */
  supportUuid: string;
}

/**
 * Enumeration of load types used in plot annotations.
 * @category Studio
 */
export enum LoadType {
  /** A punctual (point) load applied at a specific location. */
  PUNCTUAL = 'punctual',
  /** A marking load used for reference positioning. */
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

/**
 * Creates Plotly annotation objects representing span loads on the section plot.
 * Each annotation displays an icon (load or marking) positioned at the load coordinates.
 * @category Studio
 * @param plotParams - The plot parameters including span loads, view, side, and coordinate data.
 * @returns An array of Plotly `Annotations` for load indicators.
 */
export const createLoadAnnotations = (plotParams: CreatePlotParams): Plotly.Annotations[] => {
  const { side, view } = plotParams;
  const annotations: Plotly.Annotations[] = [];
  const load_coords = cloneDeep(plotParams.litData.loads_coords);
  plotParams.spanLoads.forEach((spanLoad, spanIndex) => {
    if (spanLoad && spanIndex + plotParams.startSupport in load_coords) {
      const current_load_coord = load_coords[spanIndex + plotParams.startSupport];
      annotations.push({
        ...BASE_ANNOTATION,
        x: side === 'face' && view === '2d' ? current_load_coord[1] : current_load_coord[0],
        y: plotParams.view === '2d' ? current_load_coord[2] : current_load_coord[1],
        //@ts-expect-error Plotly.js-dist-min does not support z axis
        z: current_load_coord[2],
        text: spanLoad.type === LoadType.PUNCTUAL ? LOAD_ICON : MARKING_ICON,
        data: { type: 'spanLoad', supportUuid: spanLoad.supportUuid } as SpanLoadAnnotationData
      });
    }
  });
  return annotations;
};
