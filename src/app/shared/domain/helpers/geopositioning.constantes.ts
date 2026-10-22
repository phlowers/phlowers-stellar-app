/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Coordinate reference systems used by the application. WGS84 is the core pivot CRS. */
export const CRS = {
  WGS84: 'EPSG:4326',
  LAMBERT93: 'EPSG:2154'
} as const;

/** Maximum accepted gap (degrees) between a source span azimuth and the computed one before warning the user. */
export const SPAN_AZIMUTH_ERROR_THRESHOLD_DEG = 1;
