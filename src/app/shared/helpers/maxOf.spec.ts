import { maxOf } from './maxOf.helpers';

describe('maxOf', () => {
  it('should return the maximum value of the array', () => {
    expect(maxOf([1, 9, 3])).toBe(9);
  });

  it('should return null for an empty or missing array', () => {
    expect(maxOf([])).toBeNull();
    expect(maxOf(undefined)).toBeNull();
  });

  it('should return null when the maximum is not finite', () => {
    expect(maxOf([1, Number.NaN])).toBeNull();
  });
});
