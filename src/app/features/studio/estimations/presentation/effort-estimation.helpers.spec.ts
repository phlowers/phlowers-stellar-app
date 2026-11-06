/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { EffortEstimationFormValue } from '@features/studio/estimations/domain/effort-estimation.interfaces';
import { FormControl } from '@angular/forms';
import {
  formatResultForClipboard,
  maxSpanLengthValidator,
  roundResult,
  toCableEffortInputs,
  toDisplayedResults
} from '@features/studio/estimations/presentation/effort-estimation.helpers';

const FORM_VALUE: EffortEstimationFormValue = {
  span: { index: 2, uuid: 'support-c' },
  referenceSupport: 'RIGHT',
  distanceToReferenceSupport: 120.5,
  temperature: 15,
  direction: 'DOWN',
  targetDisplacement: 3
};

describe('effort-estimation helpers', () => {
  describe('toCableEffortInputs', () => {
    it('should map the form value to the engine inputs', () => {
      expect(toCableEffortInputs(FORM_VALUE)).toEqual({
        spanIndex: 2,
        referenceSupport: 'RIGHT',
        distanceToReferenceSupport: 120.5,
        temperature: 15,
        targetDisplacement: 3,
        direction: 'DOWN'
      });
    });

    it.each([
      ['span', { span: null }],
      ['referenceSupport', { referenceSupport: null }],
      ['distanceToReferenceSupport', { distanceToReferenceSupport: null }],
      ['temperature', { temperature: null }],
      ['targetDisplacement', { targetDisplacement: null }]
    ])('should return null while %s is missing', (_name, missing) => {
      expect(toCableEffortInputs({ ...FORM_VALUE, ...missing })).toBeNull();
    });
  });

  describe('roundResult', () => {
    it('should round to 2 decimals', () => {
      expect(roundResult(12.3456)).toBe(12.35);
      expect(roundResult(-12.3456)).toBe(-12.35);
    });

    it('should turn a negative zero into zero', () => {
      expect(Object.is(roundResult(-0.001), 0)).toBe(true);
    });
  });

  describe('toDisplayedResults', () => {
    it('should round both results', () => {
      expect(toDisplayedResults({ effort: -45.678, xDisplacement: 3.2149 })).toEqual({
        effort: -45.68,
        xDisplacement: 3.21
      });
    });
  });

  describe('formatResultForClipboard', () => {
    it('should keep the 2 displayed decimals and no unit', () => {
      expect(formatResultForClipboard(12.5)).toBe('12.50');
      expect(formatResultForClipboard(-45.678)).toBe('-45.68');
    });

    it('should not copy a negative zero', () => {
      expect(formatResultForClipboard(-0.001)).toBe('0.00');
    });
  });

  describe('maxSpanLengthValidator', () => {
    const validate = (value: unknown, length: number | null) =>
      maxSpanLengthValidator(() => length)(new FormControl(value));

    it('rejects a value above the span length with the max error', () => {
      expect(validate(310.51, 310.5)).toEqual({ max: { max: 310.5, actual: 310.51 } });
    });

    it('accepts a value up to the span length', () => {
      expect(validate(310.5, 310.5)).toBeNull();
      expect(validate(0, 310.5)).toBeNull();
    });

    it('accepts any value while the span length is unknown', () => {
      expect(validate(9999, null)).toBeNull();
    });

    it.each([null, undefined, ''])('ignores the empty value %p', (value) => {
      expect(validate(value, 310.5)).toBeNull();
    });
  });
});
