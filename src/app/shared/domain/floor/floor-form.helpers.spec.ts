/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { mapFloorToObstacle } from './floor-form.helpers';
import { FLOOR_OBSTACLE_TYPE } from './floor-form.constantes';
import { LateralDistanceType } from '@shared/domain/models/obstacle.model';
import { Floor } from '@shared/domain/models/floor.model';

describe('mapFloorToObstacle', () => {
  const floor: Floor = {
    uuid: '0a1b2c3d-4e5f-6789-abcd-ef0123456789',
    supportUuid: 's0',
    referenceSupport: 'LEFT',
    points: [
      { distanceToRefSupport: 0, altitude: 10 },
      { distanceToRefSupport: 45.5, altitude: 12.25 },
      { distanceToRefSupport: 100, altitude: 11 }
    ]
  };

  it('should keep the floor uuid so the worker distances can be matched back to the floor', () => {
    expect(mapFloorToObstacle(floor, 0).uuid).toBe(floor.uuid);
  });

  it('should place each point on the span axis: x = distance to ref. support, y = 0, z = altitude', () => {
    expect(mapFloorToObstacle(floor, 0).positions).toEqual([
      { x: 0, y: 0, z: 10 },
      { x: 45.5, y: 0, z: 12.25 },
      { x: 100, y: 0, z: 11 }
    ]);
  });

  it('should register the floor as an absolute span-axis obstacle of the floor type', () => {
    const obstacle = mapFloorToObstacle(floor, 3);

    expect(obstacle.type).toBe(FLOOR_OBSTACLE_TYPE);
    expect(obstacle.altitudeType).toBe('absolute');
    expect(obstacle.lateralDistanceType).toBe(LateralDistanceType.SPAN_AXIS);
  });

  it('should carry over the span support and the given support index', () => {
    const obstacle = mapFloorToObstacle(floor, 3);

    expect(obstacle.supportUuid).toBe('s0');
    expect(obstacle.supportIndex).toBe(3);
    expect(obstacle.referenceSupport).toBe('LEFT');
  });

  it('should derive a short readable name from the floor uuid', () => {
    expect(mapFloorToObstacle(floor, 0).name).toBe('Floor 0a1b2c3d');
  });

  it('should keep null coordinates as-is for a point that is not filled in yet', () => {
    const partial: Floor = { ...floor, points: [{ distanceToRefSupport: null, altitude: null }] };

    expect(mapFloorToObstacle(partial, 0).positions).toEqual([{ x: null, y: 0, z: null }]);
  });
});
