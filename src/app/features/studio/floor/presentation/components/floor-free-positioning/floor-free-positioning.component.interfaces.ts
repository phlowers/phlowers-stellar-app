/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

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
  };
  yaxis: {
    p2c: (value: number) => number;
  };
}

export interface PlotAnnotation {
  x: number;
  y: number;
  text: string;
  showarrow: boolean;
  font?: {
    color?: string;
    size?: number;
  };
}

export interface PlotElement extends HTMLElement {
  _fullLayout?: PlotLayout;
}
