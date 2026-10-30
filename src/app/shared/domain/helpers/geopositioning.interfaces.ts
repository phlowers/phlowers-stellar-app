/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** EPSG code of a coordinate reference system, e.g. `EPSG:4326`. */
export type CrsCode = string;

/** WGS84 GPS point, in decimal degrees. */
export interface GpsPoint {
  latitude: number;
  longitude: number;
}

/** Point expressed in a projected CRS (`x` = easting/longitude, `y` = northing/latitude). */
export interface ProjectedPoint {
  x: number;
  y: number;
}

/**
 * Geopositioning of a section, one entry per support (`azimuth` has one entry per span,
 * i.e. `supports.length - 1`). GPS values are WGS84 decimal degrees.
 */
export interface FootLocalization {
  latitude: number[];
  longitude: number[];
  azimuth: number[];
}
