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
  toDisplayedResults,
  toEffortEstimationResults,
  toEstimateEffortInputs,
  toGetLoadPointsInputs
} from '@features/studio/estimations/presentation/effort-estimation.helpers';

const FORM_VALUE: EffortEstimationFormValue = {
  span: { index: 2, uuid: 'support-c' },
  referenceSupport: 'RIGHT',
  distanceToReferenceSupport: 120.5,
  temperature: 15,
  direction: 'DOWN',
  targetDisplacement: 3
};

const SPAN_LENGTH = 400;
const EFFORT_INPUTS = { spanIndex: 2, loadPositionDistance: 279.5, temperature: 15, targetVerticalDisplacement: -3 };

describe('effort-estimation helpers', () => {
  describe('toEstimateEffortInputs', () => {
    it('should measure the load position from the left support and the displacement downward', () => {
      expect(toEstimateEffortInputs(FORM_VALUE, SPAN_LENGTH)).toEqual(EFFORT_INPUTS);
    });

    it('should keep the distance from the left support and the displacement upward', () => {
      expect(toEstimateEffortInputs({ ...FORM_VALUE, referenceSupport: 'LEFT', direction: 'UP' }, SPAN_LENGTH)).toEqual(
        { ...EFFORT_INPUTS, loadPositionDistance: 120.5, targetVerticalDisplacement: 3 }
      );
    });

    it.each([
      ['span', { span: null }],
      ['referenceSupport', { referenceSupport: null }],
      ['distanceToReferenceSupport', { distanceToReferenceSupport: null }],
      ['temperature', { temperature: null }],
      ['targetDisplacement', { targetDisplacement: null }]
    ])('should return null while %s is missing', (_name, missing) => {
      expect(toEstimateEffortInputs({ ...FORM_VALUE, ...missing }, SPAN_LENGTH)).toBeNull();
    });

    it('should return null while the span length is unknown', () => {
      expect(toEstimateEffortInputs(FORM_VALUE, null)).toBeNull();
    });
  });

  describe('toGetLoadPointsInputs', () => {
    it('should locate the application point without load and with the estimated mass', () => {
      expect(toGetLoadPointsInputs(EFFORT_INPUTS, 92.3)).toEqual({
        spanIndex: 2,
        loadPositionDistance: 279.5,
        temperature: 15,
        loadMasses: [0, 92.3]
      });
    });
  });

  describe('toEffortEstimationResults', () => {
    it('should give the mass as effort and the absolute move of the point along the span axis', () => {
      const estimation = { value: -45.678, residual: 0.001, iterations: 6, converged: true };
      const loadPoints = {
        points: [
          [103.5, 10, 50],
          [100.25, 10, 52]
        ] as [number, number, number][]
      };

      expect(toEffortEstimationResults(estimation, loadPoints)).toEqual({ effort: -45.678, xDisplacement: 3.25 });
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
