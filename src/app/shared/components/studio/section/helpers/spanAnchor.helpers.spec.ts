/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { describe, it, expect } from 'vitest';
import { findSupportTop } from './spanAnchor.helpers';

describe('findSupportTop', () => {
  it('should return null when the support is undefined', () => {
    expect(findSupportTop(undefined)).toBeNull();
  });

  it('should return null when the support has no points', () => {
    expect(findSupportTop([])).toBeNull();
  });

  it('should return the only point of a one-point support', () => {
    expect(findSupportTop([[1, 2, 3]])).toEqual([1, 2, 3]);
  });

  it('should return the point with the highest z, wherever it stands in the polyline', () => {
    const support = [
      [0, 1, 0],
      [0, 2, 20],
      [0, 3, 10]
    ];
    expect(findSupportTop(support)).toEqual([0, 2, 20]);
  });

  it('should return the first of several points sharing the highest z', () => {
    const support = [
      [0, 1, 5],
      [0, 2, 20],
      [0, 3, 20]
    ];
    expect(findSupportTop(support)).toEqual([0, 2, 20]);
  });

  it('should handle negative z values', () => {
    const support = [
      [0, 0, -30],
      [0, 0, -10],
      [0, 0, -20]
    ];
    expect(findSupportTop(support)).toEqual([0, 0, -10]);
  });
});
