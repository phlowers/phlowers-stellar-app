import { getCableStrandLayers } from '@shared/domain/helpers/cut-strands.helpers';
import { getWorkLoadStatus, toCatalogCutStrands, toCutStrandsData } from './strand-rrts.helpers';

describe('getCableStrandLayers', () => {
  it('keeps the layers with strands, with their strand count', () => {
    const cable = { nb_strand_layer_1: 6, nb_strand_layer_2: 0, nb_strand_layer_3: 12 };
    expect(getCableStrandLayers(cable)).toEqual([
      { layer: 1, strands: 6 },
      { layer: 3, strands: 12 }
    ]);
  });

  it('ignores the layers after the third one', () => {
    const cable = { nb_strand_layer_1: 1, nb_strand_layer_2: 2, nb_strand_layer_3: 3, nb_strand_layer_4: 4 };
    expect(getCableStrandLayers(cable).map(({ layer }) => layer)).toEqual([1, 2, 3]);
  });

  it('gives no layer for a cable without strands', () => {
    expect(getCableStrandLayers({})).toEqual([]);
  });
});

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

    expect(toCutStrandsData(value, [1, 3], 'ASTER600')).toEqual({
      cableName: 'ASTER600',
      spanUuid: 'span-uuid',
      supportRef: 'LEFT',
      distanceSupportRef: 3,
      cutStrands: [2, 0, 5, 0, 0, 0, 0, 0],
      addMarking: false
    });
  });
});
