/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

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

/** DOM element ID used for the Plotly chart container. */
export const PLOT_ID = 'plotly-output';

/** Option for a span dropdown selector. */
export interface SpanOption {
  /** Display label for the span option. */
  label: string;
  /** UUID value of the span, or null if not applicable. */
  value: string | null;
}

/** Options controlling which overlays are visible on the plot. */
export interface SelectedDisplayOptions {
  /** Whether load results are displayed. */
  loads: boolean;
  /** Whether base state results are displayed. */
  baseState: boolean;
}

/** User-controlled scaling factors per axis and Plotly aspect mode. Used as input to getAspectRatio and for 2D scaleratio. */
export interface ScalingFactors {
  x: number;
  y: number;
  z: number;
  aspectMode: string;
}

/** Computed aspect ratio from Python's compute_aspect_ratio. Used for 3D Plotly aspectratio/aspectmode. */
export interface AspectRatio {
  x: number;
  y: number;
  z: number;
}

/**
 * Serialisable camera position for the studio 3D view.
 * Mirrors the structure of Plotly's Camera type but uses plain primitive types
 * to avoid introducing a Plotly dependency in the domain layer.
 */
export interface StudioViewCamera {
  eye: { x: number; y: number; z: number };
  center: { x: number; y: number; z: number };
  up: { x: number; y: number; z: number };
}

/**
 * Persisted studio view state stored per section.
 * Saved when the user leaves the studio and restored when they return.
 */
export interface StudioViewState {
  /** Last known 3D camera position. Null if the user never moved the camera. */
  camera?: StudioViewCamera | null;
  /** Axis scaling factors chosen via the Scale/View panel. */
  scalingFactors?: ScalingFactors;
  /** Plot resolution (point density) set via the Scale/View slider. */
  resolution?: number;
  /** Zero-based index of the first visible support. */
  startSupport?: number;
  /** Zero-based index of the last visible support. */
  endSupport?: number;
}
