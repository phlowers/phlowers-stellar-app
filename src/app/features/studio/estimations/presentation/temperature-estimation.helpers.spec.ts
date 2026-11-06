/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Obstacle } from '@shared/domain/models/obstacle.model';
import { TemperatureEstimationFormValue } from '@features/studio/estimations/domain/temperature-estimation.interfaces';
import {
  toEstimateTemperatureInputs,
  toObstacleOptions,
  toPointOptions
} from '@features/studio/estimations/presentation/temperature-estimation.helpers';

// Synthetic data only
const OBSTACLES = [
  {
    uuid: 'obstacle-a',
    name: 'Obstacle A',
    supportIndex: 2,
    positions: [
      { x: 1, y: 2, z: 3 },
      { x: 4, y: 5, z: 6 }
    ]
  },
  { uuid: 'obstacle-b', name: 'Obstacle B', supportIndex: 0, positions: [{ x: 7, y: 8, z: 9 }] }
] as unknown as Obstacle[];

describe('temperature-estimation helpers', () => {
  describe('toObstacleOptions', () => {
    it('should list the obstacles by name', () => {
      expect(toObstacleOptions(OBSTACLES)).toEqual([
        { label: 'Obstacle A', value: 'obstacle-a' },
        { label: 'Obstacle B', value: 'obstacle-b' }
      ]);
    });

    it('should be empty without obstacle', () => {
      expect(toObstacleOptions([])).toEqual([]);
    });
  });

  describe('toPointOptions', () => {
    it('should list the points of the obstacle numbered from 1', () => {
      expect(toPointOptions(OBSTACLES[0], (pointNumber) => `Point ${pointNumber}`)).toEqual([
        { label: 'Point 1', value: 0 },
        { label: 'Point 2', value: 1 }
      ]);
    });

    it('should be empty without obstacle', () => {
      expect(toPointOptions(undefined, (pointNumber) => `Point ${pointNumber}`)).toEqual([]);
    });
  });

  describe('toEstimateTemperatureInputs', () => {
    const FORM_VALUE: TemperatureEstimationFormValue = {
      obstacleUuid: 'obstacle-a',
      pointIndex: 1,
      targetDistance: 12.5
    };

    it('should map the form value to the engine inputs', () => {
      expect(toEstimateTemperatureInputs(FORM_VALUE, OBSTACLES)).toEqual({
        spanIndex: 2,
        obstacleUuid: 'obstacle-a',
        pointIndex: 1,
        targetDistance: 12.5
      });
    });

    it.each([
      ['the obstacle', { obstacleUuid: null }],
      ['an unknown obstacle', { obstacleUuid: 'unknown' }],
      ['the point', { pointIndex: null }],
      ['the target distance', { targetDistance: null }]
    ])('should return null without %s', (_, override) => {
      expect(toEstimateTemperatureInputs({ ...FORM_VALUE, ...override }, OBSTACLES)).toBeNull();
    });
  });
});
