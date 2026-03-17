import { findMiddleSpan } from './findMiddleSpan';

describe('findMiddleSpan', () => {
  it('should return the middle span for consecutive supports', () => {
    const result = findMiddleSpan(0, 1);
    expect(result).toEqual([0, 1]);
  });

  it('should return the middle span for supports with gap', () => {
    const result = findMiddleSpan(0, 5);
    expect(result).toEqual([2, 3]);
  });

  it('should return the middle span for odd sum', () => {
    const result = findMiddleSpan(1, 4);
    expect(result).toEqual([2, 3]);
  });

  it('should return the middle span for even sum', () => {
    const result = findMiddleSpan(2, 4);
    expect(result).toEqual([3, 4]);
  });

  it('should handle same start and end support', () => {
    const result = findMiddleSpan(5, 5);
    expect(result).toEqual([5, 6]);
  });

  it('should handle larger support numbers', () => {
    const result = findMiddleSpan(10, 20);
    expect(result).toEqual([15, 16]);
  });
});
