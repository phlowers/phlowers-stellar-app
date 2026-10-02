/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { RrtsCutStrandsData } from '@shared/domain/models/section.model';

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

// Engine input without cut strand on any catalog layer
export const NO_CUT_STRANDS = STRAND_LAYER_KEYS.map(() => 0);

// The engine takes one value per catalog layer: nothing is cut without saved entry, or on an entry without values
export const toEngineCutStrands = (entry: RrtsCutStrandsData | null | undefined): number[] =>
  entry?.cutStrands ?? NO_CUT_STRANDS;

// Cut strands can be 0 on every layer: nothing is cut then
export const hasCutStrand = (cutStrands: number[]): boolean => cutStrands.some((count) => count > 0);
