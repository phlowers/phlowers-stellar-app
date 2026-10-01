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
  getSpanLength,
  toCableAdjustmentInputs,
  toDisplayedResults
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

  describe('toDisplayedResults', () => {
    it('rounds both sighting angles to the grade', () => {
      expect(toDisplayedResults({ horizontalSightAngle: 73.802, verticalSightAngle: 96.418 })).toEqual({
        horizontalSightAngle: 74,
        verticalSightAngle: 96
      });
    });
  });
});
