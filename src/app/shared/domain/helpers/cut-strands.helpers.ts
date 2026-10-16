/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { RrtsCutStrandsData } from '@shared/domain/models/section.model';
import type { CatalogCableEntity } from '@infrastructure/database';

// Cable catalog keys holding the strand count of each layer
export const STRAND_LAYER_KEYS = [
  'nb_strand_layer_1',
  'nb_strand_layer_2',
  'nb_strand_layer_3',
  'nb_strand_layer_4',
  'nb_strand_layer_5',
  'nb_strand_layer_6',
  'nb_strand_layer_7',
  'nb_strand_layer_8'
] as const;

// Cut strands of each layer with strands until some are entered
export const DEFAULT_CUT_STRANDS = 0;

// Only the first layers are shown in the form: the others are sent to the engine at 0
export const MAX_SHOWN_LAYER = 3;

// Layers of the cable with strands, up to MAX_SHOWN_LAYER: the only ones where cut strands can be entered
export const getCableStrandLayers = (
  cable: Partial<Pick<CatalogCableEntity, (typeof STRAND_LAYER_KEYS)[number]>>
): { layer: number; strands: number }[] =>
  STRAND_LAYER_KEYS.map((key, i) => ({ layer: i + 1, strands: cable[key] ?? 0 })).filter(
    ({ layer, strands }) => layer <= MAX_SHOWN_LAYER && strands > 0
  );

// Engine input without cut strand on any catalog layer
export const NO_CUT_STRANDS = STRAND_LAYER_KEYS.map(() => 0);

// The engine takes one value per catalog layer: nothing is cut without saved entry, or on an entry without values.
// A legacy or imported entry can hold another count of layers: missing ones are not cut, extra ones are dropped
export const toEngineCutStrands = (entry: RrtsCutStrandsData | null | undefined): number[] =>
  STRAND_LAYER_KEYS.map((_, index) => entry?.cutStrands?.[index] ?? 0);

// Cut strands can be 0 on every layer: nothing is cut then
export const hasCutStrand = (cutStrands: number[]): boolean => cutStrands.some((count) => count > 0);
