/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Distance } from '@services/worker_python/tasks/types';
import { firstMeasuredPoint } from '@features/studio/core/presentation/components/quick-measures/quick-measures.helpers';

const distance = (obstacleUuid: string, pointIndexes: number[]): Distance => ({
  obstacleUuid,
  points: pointIndexes.map((pointIndex) => ({ pointIndex }) as Distance['points'][number])
});

describe('firstMeasuredPoint', () => {
  it('should return the lowest measured index of the floor', () => {
    expect(firstMeasuredPoint([distance('floor-1', [2, 1, 3])], 'floor-1')).toBe(1);
  });

  it('should ignore points measured for another obstacle', () => {
    const distances = [distance('obstacle-1', [0]), distance('floor-1', [2, 3])];
    expect(firstMeasuredPoint(distances, 'floor-1')).toBe(2);
  });

  it('should fall back to the first point when the floor has no measured point', () => {
    expect(firstMeasuredPoint([distance('floor-1', [])], 'floor-1')).toBe(0);
    expect(firstMeasuredPoint([], 'floor-1')).toBe(0);
  });
});
