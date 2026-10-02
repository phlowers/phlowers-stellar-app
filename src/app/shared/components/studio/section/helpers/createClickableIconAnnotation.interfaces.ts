/**
 * Hover label of a clickable icon annotation, drawn over the icon's color.
 * @category Studio
 */
export interface ClickableIconHoverLabel {
  /** Text shown on hover. */
  text: string;
  /** Color of the text, over the icon's color. */
  textColor: string;
}

/**
 * Parameters shared by every clickable FontAwesome-icon annotation on a Plotly studio section plot.
 * @category Studio
 */
export interface ClickableIconAnnotationBaseParams {
  /** X coordinate on the plot axes. */
  arrowTipX: number;
  /** Y coordinate on the plot axes. */
  arrowTipY: number;
  /** Z coordinate (non-standard Plotly property used for 3D rendering). */
  arrowTipZ: number;
  /** FontAwesome glyph as an HTML entity string (e.g. `'&#xf5cd;'`). */
  icon: string;
  /** Color applied to the icon, arrow line, border and hover label. */
  color: string;
  /** Icon font size in pixels. Defaults to `8` when omitted. */
  iconSize?: number;
  /** Padding between the icon and its border in pixels. Defaults to `6` when omitted. */
  borderPad?: number;
  /** Label shown when hovering the icon. No label when omitted. */
  hover?: ClickableIconHoverLabel;
  /** Arbitrary data payload attached to the annotation for `plotly_clickannotation` event handling. */
  data: Record<string, unknown>;
}

/**
 * Icon joined to its anchor point by an arrow line (the default).
 * @category Studio
 */
export interface ClickableIconWithArrowParams extends ClickableIconAnnotationBaseParams {
  showArrow?: true;
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
}

/**
 * Icon on its own, drawn by the caller's own line to its anchor point.
 * @category Studio
 */
export interface ClickableIconWithoutArrowParams extends ClickableIconAnnotationBaseParams {
  showArrow: false;
  /** Vertical pixel shift of the icon above its anchor point. Positive values move the icon upward. */
  yShift: number;
}

/**
 * Parameters required to build a clickable FontAwesome-icon annotation on a Plotly studio section plot,
 * with or without an arrow line to its anchor point.
 * @category Studio
 */
export type ClickableIconAnnotationParams = ClickableIconWithArrowParams | ClickableIconWithoutArrowParams;
