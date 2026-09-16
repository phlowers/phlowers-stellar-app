/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { FreePositioningPlacement } from '@features/studio/core/presentation/components/free-positioning-plot/free-positioning-plot.interfaces';
import { Position3D } from '@shared/domain/models/obstacle.model';

/**
 * Computes updated 3D coordinates when placing an obstacle point from free positioning.
 */
export const computeNewObstaclePosition = (
  currentPosition: Position3D,
  placement: FreePositioningPlacement,
  isAbsolute: boolean,
  refAltitude: number
): Position3D => {
  if (placement.side === 'profile') {
    return {
      x: placement.alongSpan,
      y: currentPosition.y ?? null,
      z: isAbsolute ? placement.altitude : Number.parseFloat((placement.altitude - refAltitude).toFixed(2))
    };
  }
  return {
    x: currentPosition.x ?? null,
    y: placement.lateral,
    z: currentPosition.z ?? null
  };
};

/**
 * Extracts point index from an obstacle form point ID ('obstacle-form-X'), or null.
 */
export const parseObstacleFormPointIndex = (pointId: string): number | null => {
  const match = /^obstacle-form-(\d+)$/.exec(pointId);
  return match ? Number(match[1]) : null;
};
