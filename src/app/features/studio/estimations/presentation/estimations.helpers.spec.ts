/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { LateralDistanceType, Obstacle, ReferenceSupport } from '@shared/domain/models/obstacle.model';
import {
  TemperatureEstimationFormValue,
  WindPressureEstimationFormValue
} from '@features/studio/estimations/domain/estimations.interfaces';
import {
  getDefaultPointIndex,
  getEstimableObstacles,
  getPreselectedObstacleUuid,
  toObstacleOptions,
  toPointOptions,
  toTemperatureEstimationInputs,
  toWindPressureEstimationInputs
} from '@features/studio/estimations/presentation/estimations.helpers';

// Synthetic data only
const makeObstacle = (overrides: Partial<Obstacle> = {}): Obstacle => ({
  uuid: 'obstacle-a',
  supportUuid: 'support-b',
  supportIndex: 1,
  name: 'Obstacle A',
  type: 'tree',
  altitudeType: 'absolute',
  referenceSupport: ReferenceSupport.LEFT,
  lateralDistanceType: LateralDistanceType.SPAN_AXIS,
  positions: [
    { x: 10, y: 1, z: 2 },
    { x: 20, y: 3, z: 4 }
  ],
  ...overrides
});

const makeFormValue = (overrides: Partial<TemperatureEstimationFormValue> = {}): TemperatureEstimationFormValue => ({
  obstacleUuid: 'obstacle-a',
  pointIndex: 0,
  targetDistance: 12.5,
  ...overrides
});

describe('estimations helpers', () => {
  describe('getEstimableObstacles', () => {
    it('keeps the obstacles holding at least one point, in order', () => {
      const first = makeObstacle({ uuid: 'first' });
      const empty = makeObstacle({ uuid: 'empty', positions: [] });
      const last = makeObstacle({ uuid: 'last' });
      expect(getEstimableObstacles([first, empty, last])).toEqual([first, last]);
    });

    it.each([null, undefined])('returns an empty list for %s', (obstacles) => {
      expect(getEstimableObstacles(obstacles)).toEqual([]);
    });
  });

  describe('toObstacleOptions', () => {
    it('labels the options with the obstacle names, valued by their uuid', () => {
      expect(toObstacleOptions([makeObstacle(), makeObstacle({ uuid: 'obstacle-b', name: 'Obstacle B' })])).toEqual([
        { label: 'Obstacle A', value: 'obstacle-a' },
        { label: 'Obstacle B', value: 'obstacle-b' }
      ]);
    });
  });

  describe('toPointOptions', () => {
    it('lists the obstacle points valued by their index', () => {
      expect(toPointOptions(makeObstacle(), (index) => `Point ${index + 1}`)).toEqual([
        { label: 'Point 1', value: 0 },
        { label: 'Point 2', value: 1 }
      ]);
    });

    it('is empty without obstacle', () => {
      expect(toPointOptions(null, (index) => `${index}`)).toEqual([]);
    });
  });

  describe('getDefaultPointIndex', () => {
    it('selects the first point of the obstacle', () => {
      expect(getDefaultPointIndex(makeObstacle())).toBe(0);
    });

    it.each([
      ['no obstacle', null],
      ['an obstacle without point', makeObstacle({ positions: [] })]
    ])('selects nothing with %s', (_, obstacle) => {
      expect(getDefaultPointIndex(obstacle)).toBeNull();
    });
  });

  describe('getPreselectedObstacleUuid', () => {
    const obstacles = [makeObstacle(), makeObstacle({ uuid: 'obstacle-b' })];

    it('preselects the obstacle selected in the Studio', () => {
      expect(getPreselectedObstacleUuid(obstacles, 'obstacle-b')).toBe('obstacle-b');
    });

    it.each([
      ['no Studio selection', null],
      ['a floor or an obstacle without point', 'floor-uuid']
    ])('preselects nothing with %s', (_, uuid) => {
      expect(getPreselectedObstacleUuid(obstacles, uuid)).toBeNull();
    });
  });

  describe('toTemperatureEstimationInputs', () => {
    it('maps the form to the engine inputs on the obstacle span, bounded to [-50; 250] °C', () => {
      expect(toTemperatureEstimationInputs(makeFormValue(), makeObstacle())).toEqual({
        spanIndex: 1,
        obstacleUuid: 'obstacle-a',
        pointIndex: 0,
        targetDistance: 12.5,
        bounds: [-50, 250]
      });
    });

    it.each([
      ['no obstacle', makeFormValue(), null],
      ['another obstacle', makeFormValue({ obstacleUuid: 'obstacle-b' }), makeObstacle()],
      ['no point', makeFormValue({ pointIndex: null }), makeObstacle()],
      ['no target distance', makeFormValue({ targetDistance: null }), makeObstacle()]
    ])('returns null with %s', (_, value, obstacle) => {
      expect(toTemperatureEstimationInputs(value, obstacle)).toBeNull();
    });
  });

  describe('toWindPressureEstimationInputs', () => {
    const windFormValue = (
      overrides: Partial<WindPressureEstimationFormValue> = {}
    ): WindPressureEstimationFormValue => ({
      obstacleUuid: 'obstacle-a',
      pointIndex: 1,
      temperature: -12.5,
      ...overrides
    });

    it('maps the form to the engine inputs on the obstacle span, bounded to [-3000; 3000] Pa', () => {
      expect(toWindPressureEstimationInputs(windFormValue(), makeObstacle())).toEqual({
        spanIndex: 1,
        obstacleUuid: 'obstacle-a',
        pointIndex: 1,
        temperature: -12.5,
        bounds: [-3000, 3000]
      });
    });

    it('keeps a zero temperature', () => {
      expect(toWindPressureEstimationInputs(windFormValue({ temperature: 0 }), makeObstacle())?.temperature).toBe(0);
    });

    it.each([
      ['no obstacle', windFormValue(), null],
      ['another obstacle', windFormValue({ obstacleUuid: 'obstacle-b' }), makeObstacle()],
      ['no point', windFormValue({ pointIndex: null }), makeObstacle()],
      ['no temperature', windFormValue({ temperature: null }), makeObstacle()]
    ])('returns null with %s', (_, value, obstacle) => {
      expect(toWindPressureEstimationInputs(value, obstacle)).toBeNull();
    });
  });
});
