/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Section } from '@shared/domain';
import { CableAdjustmentFormValue } from '@features/studio/cable-adjustment/domain/cable-adjustment.interfaces';
import {
  createAngleControl,
  createNumberControl,
  findCurrentSpanOption,
  getSpanLength,
  toCableAdjustmentInputs,
  toDisplayedResults,
  wrapAngle
} from '@features/studio/cable-adjustment/presentation/cable-adjustment.helpers';

const makeFormValue = (overrides: Partial<CableAdjustmentFormValue> = {}): CableAdjustmentFormValue => ({
  span: { index: 1, uuid: 'support-b' },
  leftHorizontalAngle: 0,
  rightHorizontalAngle: 100,
  leftVerticalAngle: 95,
  rightVerticalAngle: 94,
  support: 'LEFT',
  tacheometerHorizontalDistance: 95,
  adjustmentParameter: 1800,
  ...overrides
});

describe('cable-adjustment helpers', () => {
  describe('createNumberControl', () => {
    it('defaults to null', () => {
      expect(createNumberControl(0, 10, 1).value).toBeNull();
    });

    it.each([0, 10, 5.5])('accepts %s', (value) => {
      const control = createNumberControl(0, 10, 1);
      control.setValue(value);
      expect(control.valid).toBe(true);
    });

    it.each([
      [-0.1, 'min'],
      [10.1, 'max'],
      [1.23, 'maxDecimals'],
      [null, 'required']
    ])('rejects %s with a %s error', (value, errorKey) => {
      const control = createNumberControl(0, 10, 1);
      control.setValue(value);
      expect(control.hasError(errorKey)).toBe(true);
    });
  });

  describe('createAngleControl', () => {
    it('defaults to 0', () => {
      expect(createAngleControl().value).toBe(0);
    });

    it.each([-200, 200, 12.34, -0.01])('accepts %s', (value) => {
      const control = createAngleControl();
      control.setValue(value);
      expect(control.valid).toBe(true);
    });

    it.each([
      [-200.01, 'min'],
      [200.01, 'max'],
      [1.234, 'maxDecimals'],
      [null, 'required']
    ])('rejects %s with a %s error', (value, errorKey) => {
      const control = createAngleControl();
      control.setValue(value);
      expect(control.hasError(errorKey)).toBe(true);
    });
  });

  describe('getSpanLength', () => {
    const section = {
      supports: [{ spanLength: 310.5 }, { spanLength: 420 }, { spanLength: null }]
    } as unknown as Section;

    it('returns the length of the span starting at the given support', () => {
      expect(getSpanLength(section, 1)).toBe(420);
    });

    it('returns null without span, section, known support or length', () => {
      expect(getSpanLength(section, null)).toBeNull();
      expect(getSpanLength(null, 0)).toBeNull();
      expect(getSpanLength(section, 5)).toBeNull();
      expect(getSpanLength(section, 2)).toBeNull();
    });
  });

  describe('toCableAdjustmentInputs', () => {
    it('maps the form value and span length to the engine inputs', () => {
      expect(toCableAdjustmentInputs(makeFormValue(), 500)).toEqual({
        spanIndex: 1,
        spanLength: 500,
        leftHorizontalAngle: 0,
        rightHorizontalAngle: 100,
        leftVerticalAngle: 95,
        rightVerticalAngle: 94,
        support: 'LEFT',
        tacheometerHorizontalDistance: 95,
        adjustmentParameter: 1800
      });
    });

    it('returns null without span length', () => {
      expect(toCableAdjustmentInputs(makeFormValue(), null)).toBeNull();
    });

    it.each<keyof CableAdjustmentFormValue>([
      'span',
      'leftHorizontalAngle',
      'rightHorizontalAngle',
      'leftVerticalAngle',
      'rightVerticalAngle',
      'support',
      'tacheometerHorizontalDistance',
      'adjustmentParameter'
    ])('returns null when %s is missing', (key) => {
      expect(toCableAdjustmentInputs(makeFormValue({ [key]: null }), 500)).toBeNull();
    });
  });

  describe('findCurrentSpanOption', () => {
    const options = [
      { label: 'A - B', value: { index: 0, uuid: 'support-a' } },
      { label: 'B - C', value: { index: 1, uuid: 'support-b' } },
      { label: 'C - D', value: null }
    ];

    it('returns the span starting at the current support', () => {
      expect(findCurrentSpanOption(options, 1)).toEqual({ index: 1, uuid: 'support-b' });
    });

    it('returns null when no span matches or the option has no value', () => {
      expect(findCurrentSpanOption(options, 2)).toBeNull();
      expect(findCurrentSpanOption(options, 7)).toBeNull();
      expect(findCurrentSpanOption([], 0)).toBeNull();
    });
  });

  describe('wrapAngle', () => {
    it.each([
      [0, 0],
      [73.8, 73.8],
      [200, 200],
      [-200, 200],
      [-199.99, -199.99],
      [201, -199],
      [399.99, -0.01],
      [400, 0],
      [-250, 150],
      [73.802, 73.8],
      [96.918, 96.92],
      [-0.001, 0]
    ])('wraps %s to %s', (angle, expected) => {
      expect(wrapAngle(angle)).toBe(expected);
    });
  });

  describe('toDisplayedResults', () => {
    it('rounds both sighting angles to 2 decimals', () => {
      expect(toDisplayedResults({ horizontalSightAngle: 73.802, verticalSightAngle: 96.918 })).toEqual({
        horizontalSightAngle: 73.8,
        verticalSightAngle: 96.92
      });
    });

    it('keeps both sighting angles in the input limits', () => {
      expect(toDisplayedResults({ horizontalSightAngle: 250, verticalSightAngle: -210 })).toEqual({
        horizontalSightAngle: -150,
        verticalSightAngle: 190
      });
    });
  });
});
