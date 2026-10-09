/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { createEmptySupport } from '@shared/domain/helpers/sections.helpers';
import { buildSupportNameEntries, normalizeVoltage } from './catalog-correction.helpers';

describe('normalizeVoltage', () => {
  it('should strip whitespace and uppercase', () => {
    expect(normalizeVoltage('225 KV')).toBe('225KV');
    expect(normalizeVoltage('225kV')).toBe('225KV');
  });

  it('should return an empty string for null/undefined', () => {
    expect(normalizeVoltage(null)).toBe('');
    expect(normalizeVoltage(undefined)).toBe('');
  });
});

describe('buildSupportNameEntries', () => {
  it('should map the name and tower of each named support', () => {
    const supports = [
      { ...createEmptySupport(), name: 'FAKE-SUP-A', towerModel: 'FAKE-TOWER' },
      { ...createEmptySupport(), name: 'FAKE-SUP-B', towerModel: null }
    ];

    expect(buildSupportNameEntries(supports)).toEqual([
      { supportName: 'FAKE-SUP-A', supportTower: 'FAKE-TOWER' },
      { supportName: 'FAKE-SUP-B', supportTower: null }
    ]);
  });

  it('should skip supports without a name', () => {
    const supports = [
      { ...createEmptySupport(), name: null },
      { ...createEmptySupport(), name: '' },
      { ...createEmptySupport(), name: 'FAKE-SUP-A' }
    ];

    expect(buildSupportNameEntries(supports)).toEqual([{ supportName: 'FAKE-SUP-A', supportTower: null }]);
  });
});
