/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { GpsPoint } from '@shared/domain/helpers/geopositioning.interfaces';

/** Raised when a Lambert93 to GPS reprojection performed by the Python worker fails. */
export class GeopositioningError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'GeopositioningError';
  }
}

/** Inputs of `GeopositioningService.computeStartFromNextSupport`. */
export interface StartFromNextSupportInput {
  /** GPS of the known support 1. */
  next: GpsPoint;
  /** Grid azimuth (deg) of span 1, from support 1 to support 2. */
  nextSpanAzimuth: number;
  /** Length (m) of the new span 0, between the new support 0 and support 1. */
  spanLength: number;
  /** Deflection angles (grad) at the new support 0 and at support 1. */
  lineAngle: [number, number];
}

/** Result of `GeopositioningService.computeStartFromNextSupport`. */
export interface StartFromNextSupportResult {
  /** GPS of the new support 0. */
  point: GpsPoint;
  /** Start azimuth (deg) of the section, so that the existing supports keep their position. */
  azimuth: number;
}
