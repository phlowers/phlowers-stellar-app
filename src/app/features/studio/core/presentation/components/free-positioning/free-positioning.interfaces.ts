/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Feature that can drive free positioning mode; only its owner may turn the mode off. */
export type FreePositioningSource = 'obstacle' | 'floor' | 'loads' | 'distance';

/** Category of object supported in unified free positioning. */
export type FreePositioningCategory = 'obstacle' | 'floor' | 'distance' | 'loads';

/** Unified free-positioning point model displayed or edited on the plot. */
export interface FreePositioningPoint {
  category: FreePositioningCategory;
  alongSpan: number; // profile-plot x
  lateral: number | null; // face-plot x (null -> not shown on face)
  altitude: number; // z
  editable: boolean;
  id: string;
  name?: string;
  /** Transloco key used to translate `name` once a TranslocoService is available (pure helpers cannot translate). */
  nameKey?: string;
  nameParams?: Record<string, string | number>;
  color?: string;
}

/** Configuration for the core free-positioning plot component. */
export interface FreePositioningConfig {
  showFace: boolean;
  editableCategory: FreePositioningCategory;
  defaultVisibleCategories?: FreePositioningCategory[];
}

/** Placement event payload emitted when clicking on the plot. */
export interface FreePositioningPlacement {
  alongSpan: number;
  lateral: number | null;
  altitude: number;
  category: FreePositioningCategory;
  side: 'profile' | 'face';
}

/** Point selection event payload emitted when clicking on or near an existing point. */
export interface FreePositioningSelection {
  point: FreePositioningPoint;
}

export interface MousePosition {
  x: string;
  z: string;
}

export interface PlotLayout {
  margin: {
    l: number;
    r: number;
    t: number;
    b: number;
  };
  xaxis: {
    p2c: (value: number) => number;
    c2p: (value: number) => number;
  };
  yaxis: {
    p2c: (value: number) => number;
    c2p: (value: number) => number;
  };
}

export interface PlotAnnotation {
  x: number;
  y: number;
  text: string;
  showarrow: boolean;
  arrowhead?: number;
  standoff?: number;
  yshift?: number;
  font?: {
    color?: string;
    size?: number;
  };
}

export interface PlotElement extends HTMLElement {
  _fullLayout?: PlotLayout;
}
