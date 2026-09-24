import { RrtsCutStrandsData } from '@shared/domain/models/section.model';
import { STRAND_LAYER_KEYS } from './strand-rrts.constantes';
import { RrtsFormValue, WorkLoadStatus } from './strand-rrts.interfaces';

// Satisfactory up to 75 %, concerning up to 100 %, dangerous above 100 % or below 0 %
export const getWorkLoadStatus = (workLoad: number | null): WorkLoadStatus => {
  if (workLoad === null) return 'null';
  if (workLoad >= 0 && workLoad <= 75) return 'ok';
  if (workLoad > 75 && workLoad <= 100) return 'warning';
  if (workLoad < 0 || workLoad > 100) return 'error';
  // NaN
  return 'unknown';
};

// The form only has the layers with strands: the saved cut strands cover every catalog layer, 0 for the others
export const toCutStrandsData = (value: RrtsFormValue, layers: number[]): RrtsCutStrandsData => {
  const cutStrands = new Array<number>(STRAND_LAYER_KEYS.length).fill(0);
  layers.forEach((layer, i) => (cutStrands[layer - 1] = value.cutStrands[i]));
  return {
    spanUuid: value.span?.uuid ?? null,
    supportRef: value.supportRef,
    distanceSupportRef: value.distanceSupportRef,
    cutStrands,
    addMarking: value.addMarking
  };
};
