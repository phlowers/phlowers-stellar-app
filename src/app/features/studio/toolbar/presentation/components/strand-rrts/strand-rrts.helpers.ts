import { RrtsCutStrandsData } from '@shared/domain/models/section.model';
import { STRAND_LAYER_KEYS } from '@shared/domain/helpers/cut-strands.helpers';
import type { CatalogCableEntity } from '@infrastructure/database';
import { MAX_SHOWN_LAYER } from './strand-rrts.constantes';
import { RrtsFormValue, WorkLoadStatus } from './strand-rrts.interfaces';

// Layers of the cable with strands, up to MAX_SHOWN_LAYER: the only ones where cut strands can be entered
export const getCableStrandLayers = (
  cable: Partial<Pick<CatalogCableEntity, (typeof STRAND_LAYER_KEYS)[number]>>
): { layer: number; strands: number }[] =>
  STRAND_LAYER_KEYS.map((key, i) => ({ layer: i + 1, strands: cable[key] ?? 0 })).filter(
    ({ layer, strands }) => layer <= MAX_SHOWN_LAYER && strands > 0
  );

// Satisfactory up to 75 %, concerning up to 100 %, dangerous above 100 % or below 0 %
export const getWorkLoadStatus = (workLoad: number | null): WorkLoadStatus => {
  if (workLoad === null) return 'null';
  if (workLoad >= 0 && workLoad <= 75) return 'ok';
  if (workLoad > 75 && workLoad <= 100) return 'warning';
  if (workLoad < 0 || workLoad > 100) return 'error';
  // NaN
  return 'unknown';
};

// The form only has the layers with strands: the engine and the saved entry take every catalog layer, 0 for the others
export const toCatalogCutStrands = (cutStrands: number[], layers: number[]): number[] => {
  const catalogCutStrands = new Array<number>(STRAND_LAYER_KEYS.length).fill(0);
  layers.forEach((layer, i) => (catalogCutStrands[layer - 1] = cutStrands[i]));
  return catalogCutStrands;
};

export const toCutStrandsData = (
  value: RrtsFormValue,
  layers: number[],
  cableName: string | undefined
): RrtsCutStrandsData => ({
  cableName,
  spanUuid: value.span?.uuid ?? null,
  supportRef: value.supportRef,
  distanceSupportRef: value.distanceSupportRef,
  cutStrands: toCatalogCutStrands(value.cutStrands, layers),
  addMarking: value.addMarking
});
