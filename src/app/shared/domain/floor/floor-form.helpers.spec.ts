/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { computeFloorClearance, mapFloorToObstacle, projectOnSpanAxis } from './floor-form.helpers';
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

describe('projectOnSpanAxis', () => {
  // Second span of a section, as the engine frames it in 3D: absolute coordinates, 500 m in.
  const spanFrom500 = [
    [
      [500, 0, 40],
      [700, 0, 20],
      [900, 0, 40]
    ]
  ];

  it('should express the points as distances to the reference support', () => {
    expect(projectOnSpanAxis(spanFrom500, [500, 0, 0], [900, 0, 0])).toEqual([
      [
        [0, 0, 40],
        [200, 0, 20],
        [400, 0, 40]
      ]
    ]);
  });

  it('should reverse the axis when the reference support is the right one', () => {
    expect(projectOnSpanAxis(spanFrom500, [900, 0, 0], [500, 0, 0])).toEqual([
      [
        [400, 0, 40],
        [200, 0, 20],
        [0, 0, 40]
      ]
    ]);
  });

  it('should measure along the span axis on a section that changes direction', () => {
    // Same span rotated 90°: the distances to the reference support are unchanged.
    const rotated = [
      [
        [100, 500, 40],
        [100, 700, 20],
        [100, 900, 40]
      ]
    ];

    expect(projectOnSpanAxis(rotated, [100, 500, 0], [100, 900, 0])).toEqual([
      [
        [0, 0, 40],
        [200, 0, 20],
        [400, 0, 40]
      ]
    ]);
  });

  it('should leave the points untouched when both supports sit on the same axis', () => {
    expect(projectOnSpanAxis(spanFrom500, [500, 0, 0], [500, 0, 0])).toBe(spanFrom500);
  });
});

describe('computeFloorClearance', () => {
  // Cable sagging from 20 m at both supports down to 5 m at mid-span.
  const saggingCable = [
    [0, 0, 20],
    [50, 0, 5],
    [100, 0, 20]
  ];

  it('should find the sag between two floor points, not just the clearance at them', () => {
    const flatFloor = [
      [0, 0, 0],
      [100, 0, 0]
    ];

    // At both floor points the cable is 20 m up; the real minimum sits mid-span, between them.
    expect(computeFloorClearance(flatFloor, saggingCable)).toEqual({
      minVerticalDistance: 5,
      floorAltitude: 0,
      cableAltitude: 5,
      minVerticalPosition: 50
    });
  });

  it('should interpolate the floor altitude under the narrowest cable point', () => {
    const slopedFloor = [
      [0, 0, 0],
      [100, 0, 10]
    ];

    // Mid-span the floor has climbed to 5 m, where the cable also sits: no clearance left.
    expect(computeFloorClearance(slopedFloor, saggingCable)).toEqual({
      minVerticalDistance: 0,
      floorAltitude: 5,
      cableAltitude: 5,
      minVerticalPosition: 50
    });
  });

  it('should interpolate the cable altitude above the highest floor point', () => {
    const moundFloor = [
      [0, 0, 0],
      [25, 0, 14],
      [100, 0, 0]
    ];
    const gentleCable = [
      [0, 0, 20],
      [50, 0, 15],
      [100, 0, 20]
    ];

    // The mound at 25 m is the worst point: the cable is only at 17.5 m there.
    expect(computeFloorClearance(moundFloor, gentleCable)).toEqual({
      minVerticalDistance: 3.5,
      floorAltitude: 14,
      cableAltitude: 17.5,
      minVerticalPosition: 25
    });
  });

  it('should measure a vertical wall at its top, not at the point it shares its abscissa with', () => {
    // The form clamps free points inclusively, so two points can share an abscissa: reading the
    // first one only would ignore the wall and report the clearance to the ground beside it.
    const walledFloor = [
      [0, 0, 0],
      [0, 0, 16],
      [10, 0, 0],
      [100, 0, 0]
    ];

    // The wall top is 4 m under the cable, closer than the 5 m left over the sag at mid-span.
    expect(computeFloorClearance(walledFloor, saggingCable)).toEqual({
      minVerticalDistance: 4,
      floorAltitude: 16,
      cableAltitude: 20,
      minVerticalPosition: 0
    });
  });

  it('should report a negative clearance where the cable dips below the floor', () => {
    const flatFloor = [
      [0, 0, 8],
      [100, 0, 8]
    ];

    expect(computeFloorClearance(flatFloor, saggingCable)?.minVerticalDistance).toBe(-3);
  });

  it('should read a span running along y, or backwards, the same way', () => {
    const floorAlongY = [
      [0, 100, 0],
      [0, 0, 0]
    ];
    const cableAlongY = [
      [0, 0, 20],
      [0, 50, 5],
      [0, 100, 20]
    ];

    expect(computeFloorClearance(floorAlongY, cableAlongY)?.minVerticalDistance).toBe(5);
  });

  it('should return no clearance without two points on each curve or with a zero-length floor', () => {
    expect(computeFloorClearance([[0, 0, 0]], saggingCable)).toBeNull();
    expect(
      computeFloorClearance(
        [
          [0, 0, 0],
          [100, 0, 0]
        ],
        [[0, 0, 20]]
      )
    ).toBeNull();
    expect(
      computeFloorClearance(
        [
          [10, 0, 0],
          [10, 0, 5]
        ],
        saggingCable
      )
    ).toBeNull();
  });
});
