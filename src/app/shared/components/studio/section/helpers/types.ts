/**
 * Union type representing the different plot object categories (singular and plural forms).
 * @category Studio
 */
export type PlotObjectsType = 'supports' | 'insulators' | 'spans' | 'span' | 'support' | 'insulator';

/**
 * Represents the rendering dimension of the plot.
 * @category Studio
 */
export type View = '2d' | '3d';

/**
 * Represents the viewing side of the plot.
 * @category Studio
 */
export type Side = 'profile' | 'face';

/**
 * Configuration options that control how a section plot is rendered.
 * @category Studio
 */
export interface PlotOptions {
  /** The rendering dimension of the plot. */
  view: View;
  /** The viewing side of the plot. */
  side: Side;
  /** Zero-based index of the first support to display. */
  startSupport: number;
  /** Zero-based index of the last support to display. */
  endSupport: number;
  /** Whether to invert the plot axis direction. */
  invert: boolean;
}
