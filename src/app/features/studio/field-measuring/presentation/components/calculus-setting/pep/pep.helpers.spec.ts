import { describe, it, expect } from 'vitest';
import { createTestMeasureData } from '@features/studio/field-measuring/presentation/helpers';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { PepNumericField } from './pep.interfaces';
import { applyPepDefaults, getPepFieldError, isPepDataValid } from './pep.helpers';

const pepMeasure = (overrides: Partial<FieldMeasure> = {}) =>
  createTestMeasureData({ calculationMethod: 'pep', pepLeftSupport: '1', ...overrides });

describe('isPepDataValid', () => {
  it('accepts the default values with a left support (RG.PEP.*.2)', () => {
    expect(isPepDataValid(pepMeasure())).toBe(true);
  });

  it('requires a left support', () => {
    expect(isPepDataValid(pepMeasure({ pepLeftSupport: null }))).toBe(false);
  });

  it.each<[PepNumericField, number, boolean]>([
    ['lengthBetweenSightGD', 0, true],
    ['lengthBetweenSightGD', 5000, true],
    ['lengthBetweenSightGD', -0.01, false],
    ['lengthBetweenSightGD', 5000.01, false],
    ['lengthBetweenSightGD', 12.345, false],
    ['lengthBetweenSightGD', 12.34, true],
    ['elevationDifferenceBetweenSightGD', -1000, true],
    ['elevationDifferenceBetweenSightGD', 1000, true],
    ['elevationDifferenceBetweenSightGD', -1000.01, false],
    ['elevationDifferenceBetweenSightGD', 1000.01, false],
    ['xSight1', -1, false],
    ['xSight2', 5000.01, false],
    ['xSight3', 0.1, true],
    ['ySight1', -1000.01, false],
    ['ySight2', 1000, true],
    ['ySight3', 0.005, false]
  ])('%s = %s is valid: %s', (field, value, expected) => {
    expect(isPepDataValid(pepMeasure({ [field]: value }))).toBe(expected);
  });

  it('rejects an empty numeric input', () => {
    expect(isPepDataValid(pepMeasure({ xSight1: null }))).toBe(false);
  });
});

describe('getPepFieldError', () => {
  it.each<[PepNumericField, number | null, string | null, object]>([
    ['xSight1', null, 'common.required', {}],
    ['xSight1', -1, 'common.min-value-error', { min: 0 }],
    ['ySight1', 1000.01, 'common.max-value-error', { max: 1000 }],
    ['lengthBetweenSightGD', 12.345, 'common.max-decimals-error', { maxDecimals: 2 }],
    ['elevationDifferenceBetweenSightGD', -12.34, null, {}]
  ])('%s = %s gives %s', (field, value, key, params) => {
    expect(getPepFieldError(field, value)).toEqual(key ? { key, params } : null);
  });
});

describe('applyPepDefaults', () => {
  it('fills the empty inputs with the departure support and 0', () => {
    const result = applyPepDefaults(pepMeasure({ pepLeftSupport: null, xSight1: null, ySight2: null }), '4');
    expect(result.pepLeftSupport).toBe('4');
    expect(result.xSight1).toBe(0);
    expect(result.ySight2).toBe(0);
  });

  it('keeps the values already entered', () => {
    const result = applyPepDefaults(pepMeasure({ pepLeftSupport: '2', xSight1: 7 }), '4');
    expect(result.pepLeftSupport).toBe('2');
    expect(result.xSight1).toBe(7);
  });
});
