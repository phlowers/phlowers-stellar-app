/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { FreePositioningPlacement } from '@features/studio/core/presentation/components/free-positioning-plot/free-positioning-plot.interfaces';
import { Position3D } from '@shared/domain/models/obstacle.model';

/**
 * Computes updated 3D coordinates when placing a distance measuring point.
 */
export const computeNewDistancePosition = (current: Position3D, placement: FreePositioningPlacement): Position3D => {
  if (placement.side === 'profile') {
    return {
      x: placement.alongSpan,
      y: current.y ?? null,
      z: placement.altitude
    };
  }
  return {
    x: current.x ?? null,
    y: placement.lateral,
    z: current.z ?? null
  };
};

/**
 * Extracts point index from a distance form point ID ('distance-form-X'), or null.
 */
export const parseDistanceFormPointIndex = (pointId: string): number | null => {
  const match = /^distance-form-(\d+)$/.exec(pointId);
  return match ? Number(match[1]) : null;
};
