/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { describe, expect, it } from 'vitest';
import { computeNewObstaclePosition, parseObstacleFormPointIndex } from './obstacle-free-positioning.component.helpers';

describe('obstacle-free-positioning helpers', () => {
  describe('computeNewObstaclePosition', () => {
    it('should update x and z from profile placement in absolute mode', () => {
      const current = { x: 10, y: 5, z: 20 };
      const placement = { alongSpan: 50, lateral: null, altitude: 100, category: 'obstacle' as const, side: 'profile' as const };
      const result = computeNewObstaclePosition(current, placement, true, 40);

      expect(result).toEqual({ x: 50, y: 5, z: 100 });
    });

    it('should subtract reference altitude in relative mode', () => {
      const current = { x: 10, y: 5, z: 20 };
      const placement = { alongSpan: 50, lateral: null, altitude: 100, category: 'obstacle' as const, side: 'profile' as const };
      const result = computeNewObstaclePosition(current, placement, false, 40);

      expect(result).toEqual({ x: 50, y: 5, z: 60 });
    });

    it('should update y from face placement and keep x and z', () => {
      const current = { x: 50, y: 5, z: 60 };
      const placement = { alongSpan: 0, lateral: 15, altitude: 100, category: 'obstacle' as const, side: 'face' as const };
      const result = computeNewObstaclePosition(current, placement, false, 40);

      expect(result).toEqual({ x: 50, y: 15, z: 60 });
    });
  });

  describe('parseObstacleFormPointIndex', () => {
    it('should extract index from obstacle form point ID', () => {
      expect(parseObstacleFormPointIndex('obstacle-form-2')).toBe(2);
      expect(parseObstacleFormPointIndex('obstacle-form-0')).toBe(0);
    });

    it('should return null for non-form point IDs', () => {
      expect(parseObstacleFormPointIndex('obstacle-saved-1')).toBeNull();
      expect(parseObstacleFormPointIndex('floor-1')).toBeNull();
    });
  });
});
