/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { LateralDistanceType, Obstacle, ReferenceSupport } from '@shared/domain/models/obstacle.model';
import { FormControl } from '@angular/forms';
import {
  EffortEstimationFormValue,
  TemperatureEstimationFormValue,
  WindPressureEstimationFormValue
} from '@features/studio/estimations/domain/estimations.interfaces';
import {
  formatEffortForClipboard,
  getDefaultPointIndex,
  getEstimableObstacles,
  getPreselectedObstacleUuid,
  maxLengthValidator,
  roundEffortResult,
  toBoundsErrorParams,
  toEffortEstimationInputs,
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

  describe('toBoundsErrorParams', () => {
    it('formats the search bounds with their unit', () => {
      expect(toBoundsErrorParams({ bounds: [-50, 250] }, '°C', 'en')).toEqual({
        lowerBound: '-50 °C',
        upperBound: '250 °C'
      });
    });

    it('omits the unit when there is none and keeps at most 2 decimals', () => {
      expect(toBoundsErrorParams({ bounds: [0.256, 1000] }, '', 'en')).toEqual({
        lowerBound: '0.26',
        upperBound: '1,000'
      });
    });

    it.each([[undefined], [null]])('returns undefined when the bounds are %s', (bounds) => {
      expect(toBoundsErrorParams({ bounds }, '°C', 'en')).toBeUndefined();
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
        bounds: [-1000, 1000]
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

  describe('toEffortEstimationInputs', () => {
    const effortFormValue = (overrides: Partial<EffortEstimationFormValue> = {}): EffortEstimationFormValue => ({
      span: { index: 2, uuid: 'support-c' },
      referenceSupport: 'LEFT',
      distanceToReferenceSupport: 120.5,
      temperature: 15,
      direction: 'UP',
      targetDisplacement: 3,
      ...overrides
    });

    it('measures the load position from the left support and moves the cable upward with a traction (negative mass)', () => {
      expect(toEffortEstimationInputs(effortFormValue(), 400)).toEqual({
        spanIndex: 2,
        loadPositionDistance: 120.5,
        temperature: 15,
        targetDistance: 3,
        bounds: [-1000, 0]
      });
    });

    it('converts a distance from the right support', () => {
      expect(
        toEffortEstimationInputs(effortFormValue({ referenceSupport: 'RIGHT', distanceToReferenceSupport: 100 }), 400)
          ?.loadPositionDistance
      ).toBe(300);
    });

    it('moves the cable downward with a negative displacement and a weight (positive mass)', () => {
      const inputs = toEffortEstimationInputs(effortFormValue({ direction: 'DOWN' }), 400);
      expect(inputs?.targetDistance).toBe(-3);
      expect(inputs?.bounds).toEqual([0, 1000]);
    });

    it('keeps zero values', () => {
      expect(
        toEffortEstimationInputs(
          effortFormValue({ distanceToReferenceSupport: 0, temperature: 0, targetDisplacement: 0 }),
          400
        )
      ).toEqual({ spanIndex: 2, loadPositionDistance: 0, temperature: 0, targetDistance: 0, bounds: [-1000, 0] });
    });

    it.each([
      ['no span', effortFormValue({ span: null }), 400],
      ['no span length', effortFormValue(), null],
      ['no reference support', effortFormValue({ referenceSupport: null }), 400],
      ['no distance', effortFormValue({ distanceToReferenceSupport: null }), 400],
      ['no temperature', effortFormValue({ temperature: null }), 400],
      ['no target displacement', effortFormValue({ targetDisplacement: null }), 400]
    ])('returns null with %s', (_, value, spanLength) => {
      expect(toEffortEstimationInputs(value, spanLength)).toBeNull();
    });
  });

  describe('effort result formatting', () => {
    it.each([
      [-12.346, -12.35],
      [0.004, 0],
      [-0.004, 0],
      [4635.8, 4635.8]
    ])('rounds %s to %s', (value, expected) => {
      expect(Object.is(roundEffortResult(value), expected)).toBe(true);
    });

    it('copies the displayed value with the locale decimal separator, without group separator', () => {
      expect(formatEffortForClipboard(-4635.804, 'en')).toBe('-4635.80');
      expect(formatEffortForClipboard(4635.806, 'fr')).toBe('4635,81');
      expect(formatEffortForClipboard(-0.001, 'en')).toBe('0.00');
    });
  });

  describe('maxLengthValidator', () => {
    const validate = (value: number | string | null, max: number | null) =>
      maxLengthValidator(() => max)(new FormControl(value));

    it('reports the same error as Validators.max above the length', () => {
      expect(validate(400.01, 400)).toEqual({ max: { max: 400, actual: 400.01 } });
    });

    it.each([
      ['at the length', 400, 400],
      ['below the length', 0, 400],
      ['without length', 1000, null],
      ['without value', null, 400],
      ['with an empty value', '', 400]
    ])('accepts a value %s', (_, value, max) => {
      expect(validate(value, max)).toBeNull();
    });
  });
});
