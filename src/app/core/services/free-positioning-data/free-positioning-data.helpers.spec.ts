/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { describe, expect, it } from 'vitest';
import {
  aggregateFreePositioningPoints,
  buildDistancePoints,
  buildFloorPoints,
  buildLoadPoints,
  buildObstaclePoints
} from './free-positioning-data.helpers';
import { AggregatePointsParams } from './free-positioning-data.interfaces';
import { LOAD_ICON, MARKING_ICON } from './free-positioning-data.constantes';
import { Section, Support } from '@shared/domain';
import { GetSectionOutput } from '@core/services/worker_python/tasks/types';

describe('free-positioning-data.helpers', () => {
  const mockSupports: Support[] = [
    { uuid: 'sup-0', number: '1' } as Support,
    { uuid: 'sup-1', number: '2' } as Support,
    { uuid: 'sup-2', number: '3' } as Support
  ];

  const baseParams: AggregatePointsParams = {
    frozenSpan: 0,
    editableCategory: 'obstacle',
    section: null,
    litData: null,
    supports: mockSupports
  };

  describe('buildObstaclePoints', () => {
    it('should build points from active obstacle form when editableCategory is obstacle', () => {
      const params: AggregatePointsParams = {
        ...baseParams,
        editableCategory: 'obstacle',
        activeObstaclePositions: [
          { x: 10, y: 5, z: 20 },
          { x: 30, y: null, z: 25 }
        ],
        activeObstacleIndex: 1,
        activeObstacleSupportUuid: 'sup-0',
        referenceSupportAltitudeNgf: 100,
        isAbsoluteAltitude: false
      };

      const points = buildObstaclePoints(params);
      expect(points).toHaveLength(2);
      expect(points[0]).toEqual({
        id: 'obstacle-form-0',
        category: 'obstacle',
        alongSpan: 10,
        lateral: 5,
        altitude: 120, // 20 + 100
        editable: false,
        name: '#1'
      });
      expect(points[1]).toEqual({
        id: 'obstacle-form-1',
        category: 'obstacle',
        alongSpan: 30,
        lateral: null,
        altitude: 125, // 25 + 100
        editable: true,
        name: '#2'
      });
    });

    it('should use absolute altitude directly when isAbsoluteAltitude is true', () => {
      const params: AggregatePointsParams = {
        ...baseParams,
        editableCategory: 'obstacle',
        activeObstaclePositions: [{ x: 10, y: 5, z: 200 }],
        activeObstacleIndex: 0,
        isAbsoluteAltitude: true
      };

      const points = buildObstaclePoints(params);
      expect(points[0].altitude).toBe(200);
    });

    it('should build points from litData for matching span when not actively editing that obstacle', () => {
      const params: AggregatePointsParams = {
        ...baseParams,
        editableCategory: 'floor', // editing floor, not obstacle
        section: {
          obstacles: [
            { uuid: 'obs-span0', supportUuid: 'sup-0', name: 'Tree' }
          ]
        } as unknown as Section,
        litData: {
          obstacles: [
            { uuid: 'obs-span0', points: [[45, 12, 130]] },
            { uuid: 'obs-span1', points: [[150, 0, 140]] }
          ]
        } as unknown as GetSectionOutput
      };

      const points = buildObstaclePoints(params);
      expect(points).toHaveLength(1);
      expect(points[0]).toEqual({
        id: 'obstacle-obs-span0-0',
        category: 'obstacle',
        alongSpan: 45,
        lateral: 12,
        altitude: 130,
        editable: false,
        name: 'Tree'
      });
    });

    it('should show existing obstacles on the span while editing a new obstacle on the same span', () => {
      const params: AggregatePointsParams = {
        ...baseParams,
        editableCategory: 'obstacle',
        activeObstacleSupportUuid: 'sup-0',
        activeObstacleUuid: 'obs-new',
        activeObstaclePositions: [{ x: 80, y: 3, z: 210 }],
        activeObstacleIndex: 0,
        isAbsoluteAltitude: true,
        section: {
          obstacles: [{ uuid: 'obs-existing', supportUuid: 'sup-0', name: 'Tree' }]
        } as unknown as Section,
        litData: {
          obstacles: [{ uuid: 'obs-existing', points: [[45, 12, 130]] }]
        } as unknown as GetSectionOutput
      };

      const points = buildObstaclePoints(params);

      // Both the form obstacle being edited and the existing obstacle must be shown.
      expect(points).toHaveLength(2);
      expect(points).toContainEqual({
        id: 'obstacle-form-0',
        category: 'obstacle',
        alongSpan: 80,
        lateral: 3,
        altitude: 210,
        editable: true,
        name: '#1'
      });
      expect(points).toContainEqual({
        id: 'obstacle-obs-existing-0',
        category: 'obstacle',
        alongSpan: 45,
        lateral: 12,
        altitude: 130,
        editable: false,
        name: 'Tree'
      });
    });

    it('should not duplicate the obstacle currently being edited when it already exists in litData', () => {
      const params: AggregatePointsParams = {
        ...baseParams,
        editableCategory: 'obstacle',
        activeObstacleSupportUuid: 'sup-0',
        activeObstacleUuid: 'obs-edited',
        activeObstaclePositions: [{ x: 50, y: 1, z: 200 }],
        activeObstacleIndex: 0,
        isAbsoluteAltitude: true,
        section: {
          obstacles: [{ uuid: 'obs-edited', supportUuid: 'sup-0', name: 'Tree' }]
        } as unknown as Section,
        litData: {
          obstacles: [{ uuid: 'obs-edited', points: [[45, 12, 130]] }]
        } as unknown as GetSectionOutput
      };

      const points = buildObstaclePoints(params);

      // Only the live form points, not a duplicate rendered from litData.
      expect(points).toHaveLength(1);
      expect(points[0].id).toBe('obstacle-form-0');
    });
  });

  describe('buildFloorPoints', () => {
    it('should build points from active floor points when editableCategory is floor', () => {
      const params: AggregatePointsParams = {
        ...baseParams,
        editableCategory: 'floor',
        activeFloorPoints: [
          { distanceToRefSupport: 0, altitude: 50, removable: false },
          { distanceToRefSupport: 100, altitude: 45, removable: true }
        ],
        activeFloorIndex: 1
      };

      const points = buildFloorPoints(params);
      expect(points).toHaveLength(2);
      expect(points[0].editable).toBe(false); // not removable
      expect(points[1].editable).toBe(true);
      expect(points[1].alongSpan).toBe(100);
      expect(points[1].altitude).toBe(45);
      expect(points[1].lateral).toBeNull();
    });

    it('should read from section.floors for frozen span when not editing floor', () => {
      const params: AggregatePointsParams = {
        ...baseParams,
        editableCategory: 'obstacle',
        section: {
          floors: [
            {
              uuid: 'floor-0',
              supportUuid: 'sup-0',
              points: [{ distanceToRefSupport: 50, altitude: 40 }]
            }
          ]
        } as unknown as Section
      };

      const points = buildFloorPoints(params);
      expect(points).toHaveLength(1);
      expect(points[0].alongSpan).toBe(50);
      expect(points[0].altitude).toBe(40);
      expect(points[0].editable).toBe(false);
    });
  });

  describe('buildDistancePoints', () => {
    it('should build distance points when matching span', () => {
      const params: AggregatePointsParams = {
        ...baseParams,
        editableCategory: 'distance',
        distanceSupportUuid: 'sup-0',
        distancePositions: [
          { x: 15, y: 3, z: 80 },
          { x: 25, y: 4, z: 85 }
        ],
        distanceActiveIndex: 0
      };

      const points = buildDistancePoints(params);
      expect(points).toHaveLength(2);
      expect(points[0].editable).toBe(true);
      expect(points[1].editable).toBe(false);
      expect(points[0].alongSpan).toBe(15);
      expect(points[0].lateral).toBe(3);
      expect(points[0].altitude).toBe(80);
    });
  });

  describe('buildLoadPoints', () => {
    it('should build load points from litData output_parameters loads_coords', () => {
      const params: AggregatePointsParams = {
        ...baseParams,
        editableCategory: 'loads',
        litData: {
          output_parameters: {
            loads_coords: {
              0: [120, 0, 75]
            }
          }
        } as unknown as GetSectionOutput,
        loadType: 'punctual'
      };

      const points = buildLoadPoints(params);
      expect(points).toHaveLength(1);
      expect(points[0].alongSpan).toBe(120);
      expect(points[0].altitude).toBe(75);
      expect(points[0].editable).toBe(true);
      expect(points[0].icon).toBe(LOAD_ICON);
    });

    it('should use marking icon when loadType is marking', () => {
      const params: AggregatePointsParams = {
        ...baseParams,
        editableCategory: 'loads',
        litData: {
          output_parameters: {
            loads_coords: {
              0: [80, 0, 70]
            }
          }
        } as unknown as GetSectionOutput,
        loadType: 'marking'
      };

      const points = buildLoadPoints(params);
      expect(points[0].icon).toBe(MARKING_ICON);
    });
  });

  describe('aggregateFreePositioningPoints', () => {
    it('should aggregate points across all categories for the frozen span', () => {
      const params: AggregatePointsParams = {
        ...baseParams,
        editableCategory: 'obstacle',
        activeObstaclePositions: [{ x: 10, y: 0, z: 50 }],
        activeObstacleIndex: 0,
        section: {
          floors: [
            {
              uuid: 'floor-0',
              supportUuid: 'sup-0',
              points: [{ distanceToRefSupport: 20, altitude: 45 }]
            }
          ]
        } as unknown as Section
      };

      const points = aggregateFreePositioningPoints(params);
      expect(points.some((p) => p.category === 'obstacle')).toBe(true);
      expect(points.some((p) => p.category === 'floor')).toBe(true);
    });
  });
});
