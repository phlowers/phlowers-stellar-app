import { getWorkLoadStatus, toCatalogCutStrands, toCutStrandsData } from './strand-rrts.helpers';

describe('getWorkLoadStatus', () => {
  it.each([
    [null, 'null'],
    [0, 'ok'],
    [75, 'ok'],
    [75.1, 'warning'],
    [100, 'warning'],
    [100.1, 'error'],
    [-0.1, 'error'],
    [Number.NaN, 'unknown']
  ])('rates a %s working load as %s', (workLoad, status) => {
    expect(getWorkLoadStatus(workLoad)).toBe(status);
  });
});

describe('toCatalogCutStrands', () => {
  it('spreads the cut strands of the layers with strands over every catalog layer', () => {
    expect(toCatalogCutStrands([2, 5], [1, 3])).toEqual([2, 0, 5, 0, 0, 0, 0, 0]);
  });
});

describe('toCutStrandsData', () => {
  it('saves the form value with the cut strands of every catalog layer', () => {
    const value = {
      span: { index: 2, uuid: 'span-uuid' },
      supportRef: 'LEFT' as const,
      distanceSupportRef: 3,
      cutStrands: [2, 5],
      addMarking: false
    };

    expect(toCutStrandsData(value, [1, 3])).toEqual({
      spanUuid: 'span-uuid',
      supportRef: 'LEFT',
      distanceSupportRef: 3,
      cutStrands: [2, 0, 5, 0, 0, 0, 0, 0],
      addMarking: false
    });
  });
});
