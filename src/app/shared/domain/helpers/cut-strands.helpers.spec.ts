/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { RrtsCutStrandsData } from '@shared/domain/models/section.model';
import { hasCutStrand, NO_CUT_STRANDS, toEngineCutStrands } from '@shared/domain/helpers/cut-strands.helpers';

const makeEntry = (cutStrands: number[]): RrtsCutStrandsData => ({
  spanUuid: null,
  supportRef: null,
  distanceSupportRef: null,
  cutStrands,
  addMarking: false
});

describe('toEngineCutStrands', () => {
  it('gives the saved cut strands of every catalog layer', () => {
    expect(toEngineCutStrands(makeEntry([1, 3, 0, 0, 0, 0, 0, 0]))).toEqual([1, 3, 0, 0, 0, 0, 0, 0]);
  });

  it.each([null, undefined])('gives 0 on every catalog layer without saved entry: %s', (entry) => {
    expect(toEngineCutStrands(entry)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('gives 0 on every catalog layer for an entry without cut strands', () => {
    const entry = { ...makeEntry([]), cutStrands: undefined } as unknown as RrtsCutStrandsData;
    expect(toEngineCutStrands(entry)).toBe(NO_CUT_STRANDS);
  });
});

describe('hasCutStrand', () => {
  it.each([
    ['a cut strand on a layer', [0, 0, 2, 0, 0, 0, 0, 0], true],
    ['no cut strand on any layer', [0, 0, 0, 0, 0, 0, 0, 0], false],
    ['no layer', [], false]
  ])('is decided from %s', (_, cutStrands, expected) => {
    expect(hasCutStrand(cutStrands)).toBe(expected);
  });
});
