import * as Plotly from 'plotly.js-dist-min';
import { CreatePlotParams } from './createPlot';
import { cloneDeep } from 'lodash';
import { buildClickableIconAnnotation } from './createClickableIconAnnotation';
import { LOAD_ARROW_Y_OFFSET, LOAD_COLOR, LOAD_ICON, MARKING_ICON } from './createLoadAnnotations.constantes';

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

/**
 * Creates Plotly annotation objects representing span loads on the section plot.
 * Each annotation displays an icon (load or marking) positioned at the load coordinates.
 * @category Studio
 * @param plotParams - The plot parameters including span loads, view, side, and coordinate data.
 * @returns An array of Plotly `Annotations` for load indicators.
 */
export const createLoadAnnotations = (plotParams: CreatePlotParams): Partial<Plotly.Annotations>[] => {
  const { side, view } = plotParams;
  const annotations: Partial<Plotly.Annotations>[] = [];
  const load_coords = cloneDeep(plotParams.litData.loads_coords);
  plotParams.spanLoads.forEach((spanLoad, spanIndex) => {
    if (spanLoad && spanIndex + plotParams.startSupport in load_coords) {
      const current_load_coord = load_coords[spanIndex + plotParams.startSupport];
      annotations.push(
        buildClickableIconAnnotation({
          arrowTipX: side === 'face' && view === '2d' ? current_load_coord[1] : current_load_coord[0],
          arrowTipY: plotParams.view === '2d' ? current_load_coord[2] : current_load_coord[1],
          arrowTipZ: current_load_coord[2],
          icon: spanLoad.type === LoadType.PUNCTUAL ? LOAD_ICON : MARKING_ICON,
          color: LOAD_COLOR,
          arrowYOffset: LOAD_ARROW_Y_OFFSET,
          data: { type: 'spanLoad', supportUuid: spanLoad.supportUuid }
        })
      );
    }
  });
  return annotations;
};
