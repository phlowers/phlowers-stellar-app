/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Distance } from '@services/worker_python/tasks/types';

/**
 * First point of a floor the engine could measure. A point sitting exactly on a support has no
 * distance — the distance plane finds no cable there, the cable hanging off the support axis — so
 * selecting one would show empty rows. Falls back to point 0 when nothing was measured.
 */
export function firstMeasuredPoint(distances: Distance[], floorUuid: string): number {
  const measured = distances
    .filter((distance) => distance.obstacleUuid === floorUuid)
    .flatMap((distance) => distance.points.map((point) => point.pointIndex));
  return measured.length ? Math.min(...measured) : 0;
}
