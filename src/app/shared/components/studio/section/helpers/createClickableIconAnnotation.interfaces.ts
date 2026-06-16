/**
 * Parameters required to build a clickable FontAwesome-icon annotation with an arrow line
 * on a Plotly studio section plot.
 * @category Studio
 */
export interface ClickableIconAnnotationParams {
  /** X coordinate on the plot axes. */
  arrowTipX: number;
  /** Y coordinate on the plot axes. */
  arrowTipY: number;
  /** Z coordinate (non-standard Plotly property used for 3D rendering). */
  arrowTipZ: number;
  /** FontAwesome glyph as an HTML entity string (e.g. `'&#xf5cd;'`). */
  icon: string;
  /** Color applied to the icon, arrow line, and border. */
  color: string;
  /**
   * Vertical pixel offset of the annotation icon above its anchor point.
   * Negative values move the icon upward (e.g. `-50` for load icons, `-90` for cable-mod icons).
   */
  arrowYOffset: number;
  /**
   * Horizontal pixel offset of the annotation icon from its anchor point.
   * Defaults to `0` when omitted.
   */
  arrowXOffset?: number;
  /** Arbitrary data payload attached to the annotation for `plotly_clickannotation` event handling. */
  data: Record<string, unknown>;
}
