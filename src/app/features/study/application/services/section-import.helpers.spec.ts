/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { extractBranchIdr } from './section-import.helpers';

describe('extractBranchIdr', () => {
  it('should return "1" for "FLAMAL73MENUE01"', () => {
    expect(extractBranchIdr('FLAMAL73MENUE01')).toBe('1');
  });

  it('should return "2" for a branch ending with "02"', () => {
    expect(extractBranchIdr('SOMELINE02')).toBe('2');
  });

  it('should strip leading zero — "08" becomes "8"', () => {
    expect(extractBranchIdr('FLAMAL73MENUE08')).toBe('8');
  });

  it('should return "10" for a two-digit branch number without leading zero', () => {
    expect(extractBranchIdr('FLAMAL73MENUE10')).toBe('10');
  });
});
