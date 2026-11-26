/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Section, Support } from '@shared/domain';
import { createEmptySection, createEmptySupport } from '@shared/domain/helpers/sections.helpers';
import {
  findMaxFiniteValue,
  getNoticeSeverity,
  getSupportLabel,
  summarizePositionError
} from './section-import.helpers';

const THRESHOLD = 1;

const buildSection = (supports: Partial<Support>[], positionErrors: (number | null)[] | null): Section => ({
  ...createEmptySection(),
  supports: supports.map((overrides) => ({ ...createEmptySupport(), ...overrides })),
  position_error_meters: positionErrors
});

describe('getNoticeSeverity', () => {
  it('should return info at or below the threshold', () => {
    expect(getNoticeSeverity(0, THRESHOLD)).toBe('info');
    expect(getNoticeSeverity(THRESHOLD, THRESHOLD)).toBe('info');
  });

  it('should return warning above the threshold', () => {
    expect(getNoticeSeverity(THRESHOLD + 0.01, THRESHOLD)).toBe('warning');
  });
});

describe('findMaxFiniteValue', () => {
  it('should return the largest finite value with its index', () => {
    expect(findMaxFiniteValue([0, 2.5, null, 1])).toEqual({ value: 2.5, index: 1 });
  });

  it('should ignore null and non-finite values', () => {
    expect(findMaxFiniteValue([null, NaN, Infinity, 0.3])).toEqual({ value: 0.3, index: 3 });
  });

  it('should return null when no value is finite', () => {
    expect(findMaxFiniteValue([null, NaN])).toBeNull();
    expect(findMaxFiniteValue([])).toBeNull();
  });
});

describe('getSupportLabel', () => {
  it('should use the support name when present', () => {
    expect(getSupportLabel({ name: 'SUP-1' }, 0)).toBe('SUP-1');
  });

  it('should fall back to the 1-based support number when the name is missing or blank', () => {
    expect(getSupportLabel({ name: null }, 2)).toBe('3');
    expect(getSupportLabel({ name: '  ' }, 0)).toBe('1');
    expect(getSupportLabel(undefined, 4)).toBe('5');
  });
});

describe('summarizePositionError', () => {
  it('should summarize the maximum error with its support and severity', () => {
    const section = buildSection([{ name: 'A' }, { name: null }, { name: 'C' }], [0, 1.5, 0.2]);

    expect(summarizePositionError(section, THRESHOLD)).toEqual({
      maxError: 1.5,
      support: '2',
      severity: 'warning'
    });
  });

  it('should return an info severity when the maximum equals the threshold', () => {
    const section = buildSection([{ name: 'A' }, { name: 'B' }], [0, THRESHOLD]);

    expect(summarizePositionError(section, THRESHOLD)?.severity).toBe('info');
  });

  it('should return null when position_error_meters is null or has no finite value', () => {
    expect(summarizePositionError(buildSection([{}], null), THRESHOLD)).toBeNull();
    expect(summarizePositionError(buildSection([{}], [null]), THRESHOLD)).toBeNull();
  });
});
