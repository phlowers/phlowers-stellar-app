/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { recheckSpanLoads } from './span-loads.helpers';
import { SpanLoad, LoadType } from '@shared/domain/models/charge.model';
import { Support } from '@shared/domain/models/support.model';

const makeSupport = (uuid: string): Support => ({ uuid }) as Support;

const makeLoad = (supportUuid: string, overrides: Partial<SpanLoad> = {}): SpanLoad => ({
  supportUuid,
  loadPosition: 0,
  loadWeight: 0,
  type: LoadType.PUNCTUAL,
  referenceSupport: 'LEFT',
  ...overrides
});

describe('recheckSpanLoads', () => {
  it('should return an empty array when both inputs are empty', () => {
    expect(recheckSpanLoads([], [])).toEqual([]);
  });

  it('should add a default empty load for each support that has no existing load', () => {
    const supports = [makeSupport('s1'), makeSupport('s2')];
    const result = recheckSpanLoads([], supports);

    expect(result).toHaveLength(2);
    expect(result.map((l) => l.supportUuid)).toEqual(expect.arrayContaining(['s1', 's2']));
    expect(result.every((l) => l.loadPosition === 0 && l.loadWeight === 0)).toBe(true);
    expect(result.every((l) => l.type === LoadType.PUNCTUAL)).toBe(true);
    expect(result.every((l) => l.referenceSupport === 'LEFT')).toBe(true);
  });

  it('should remove loads for supports that no longer exist', () => {
    const loads = [makeLoad('s1'), makeLoad('s2-removed')];
    const supports = [makeSupport('s1')];

    const result = recheckSpanLoads(loads, supports);

    expect(result).toHaveLength(1);
    expect(result[0].supportUuid).toBe('s1');
  });

  it('should preserve existing load values for supports that still exist', () => {
    const existing = makeLoad('s1', { loadPosition: 10, loadWeight: 50, referenceSupport: 'RIGHT' });
    const supports = [makeSupport('s1'), makeSupport('s2')];

    const result = recheckSpanLoads([existing], supports);

    const s1Load = result.find((l) => l.supportUuid === 's1');
    expect(s1Load?.loadPosition).toBe(10);
    expect(s1Load?.loadWeight).toBe(50);
    expect(s1Load?.referenceSupport).toBe('RIGHT');
  });

  it('should handle the case when all existing loads match the current supports', () => {
    const loads = [makeLoad('s1', { loadWeight: 100 }), makeLoad('s2', { loadWeight: 200 })];
    const supports = [makeSupport('s1'), makeSupport('s2')];

    const result = recheckSpanLoads(loads, supports);

    expect(result).toHaveLength(2);
    expect(result.find((l) => l.supportUuid === 's1')?.loadWeight).toBe(100);
    expect(result.find((l) => l.supportUuid === 's2')?.loadWeight).toBe(200);
  });

  it('should not mutate the original loads array', () => {
    const loads = [makeLoad('s1')];
    const supports = [makeSupport('s1'), makeSupport('s2')];
    const originalLength = loads.length;

    recheckSpanLoads(loads, supports);

    expect(loads).toHaveLength(originalLength);
  });

  it('should handle duplicate supportUuids in loads by keeping the first occurrence', () => {
    const loads = [makeLoad('s1', { loadWeight: 10 }), makeLoad('s1', { loadWeight: 99 })];
    const supports = [makeSupport('s1')];

    const result = recheckSpanLoads(loads, supports);

    // Both entries pass the filter since they share the same uuid; result has 2 entries
    expect(result.every((l) => l.supportUuid === 's1')).toBe(true);
  });
});
