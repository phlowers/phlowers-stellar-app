import * as Plotly from 'plotly.js-dist-min';
import { PlotlyDrawings } from '@shared/constants/plotly-drawings.constantes';
import { ClickableIconAnnotationParams } from './createClickableIconAnnotation.interfaces';

/**
 * Builds a Plotly annotation representing a clickable FontAwesome icon, by default with an arrow line
 * connecting it to an anchor point on the plot.
 *
 * @remarks
 * Encapsulates the shared visual structure common to all clickable icon annotations on the
 * studio section plot (span loads, cable modifications). The `data` payload is attached to
 * the annotation so that the `plotly_clickannotation` event handler can identify which
 * feature was clicked via the discriminated `type` field.
 *
 * The icon can instead stand on its own above its anchor (`showArrow: false`), when the caller draws its own line,
 * and can show a hover label. Either way it captures click events explicitly.
 *
 * Pure function — no Angular DI, no side effects.
 *
 * @category Studio
 * @param params - Position, icon, color, offsets and click data for the annotation.
 * @returns A partial `Plotly.Annotations` object ready to pass to `newPlot` or `react`.
 */
export const buildClickableIconAnnotation = (params: ClickableIconAnnotationParams): Partial<Plotly.Annotations> =>
  ({
    xref: 'x' as const,
    yref: 'y' as const,
    x: params.arrowTipX, // arrow tip — data coordinates
    y: params.arrowTipY, // arrow tip — data coordinates
    z: params.arrowTipZ, // arrow tip — non-standard Plotly property for 3D rendering
    ...(params.showArrow === false
      ? {
          showarrow: false,
          yshift: params.yShift // icon position — vertical pixel shift from the anchor (positive = above)
        }
      : {
          ax: 0, // icon position — straight above the tip
          ay: params.arrowYOffset, // icon position — vertical pixel offset from tip (negative = above)
          showarrow: true,
          arrowhead: PlotlyDrawings.clickableIconAnnotation.arrowHead,
          arrowcolor: params.color,
          // Explicit: Plotly defaults it to twice the border width
          arrowwidth: params.arrowWidth
        }),
    text: params.icon,
    // Explicit: by default, Plotly only captures the events of an annotation that has a hover label
    captureevents: true,
    ...(params.hover && {
      hovertext: params.hover.text,
      hoverlabel: {
        bgcolor: params.hover.backgroundColor,
        bordercolor: params.hover.backgroundColor,
        font: { color: params.hover.textColor }
      }
    }),
    bordercolor: params.color,
    borderpad: params.borderPad,
    font: {
      family: PlotlyDrawings.clickableIconAnnotation.fontFamily,
      color: params.color,
      size: params.iconSize
    },
    data: params.data
  }) as unknown as Partial<Plotly.Annotations>;
