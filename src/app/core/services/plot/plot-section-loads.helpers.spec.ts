/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { alignSectionSpanLoadsToSupports } from './plot-section-loads.helpers';
import { Section } from '@shared/domain';
import { Charge, SpanLoad, LoadType, SymmetryType } from '@shared/domain/models/charge.model';
import { Support } from '@shared/domain/models/support.model';

const makeSupport = (uuid: string): Support => ({ uuid }) as Support;

const makeSpanLoad = (overrides: Partial<SpanLoad> = {}): SpanLoad => ({
  supportUuid: 'sup-1',
  loadPosition: 0,
  loadWeight: 0,
  type: LoadType.PUNCTUAL,
  referenceSupport: 'LEFT',
  ...overrides
});

const makeCharge = (overrides: Partial<Charge> = {}, spanLoads: SpanLoad[] = []): Charge => ({
  uuid: 'charge-1',
  name: 'Charge 1',
  personnelPresence: false,
  description: '',
  data: {
    climate: {
      windPressure: null,
      cableTemperature: null,
      symmetryType: SymmetryType.SYMMETRIC,
      iceThickness: null,
      frontierSupportNumber: null,
      iceThicknessBefore: null,
      iceThicknessAfter: null
    },
    spanLoads,
    cableModifParams: []
  },
  ...overrides
});

const makeSection = (overrides: Partial<Section> = {}): Section =>
  ({
    supports: [makeSupport('sup-1'), makeSupport('sup-2')],
    charges: [],
    ...overrides
  }) as Section;

describe('alignSectionSpanLoadsToSupports', () => {
  it('should pad a span load for every support missing one', () => {
    const section = makeSection({
      charges: [makeCharge({ uuid: 'charge-1' }, [makeSpanLoad({ supportUuid: 'sup-1', loadWeight: 50 })])]
    });

    const result = alignSectionSpanLoadsToSupports(section);

    const uuids = result.charges[0].data.spanLoads.map((l) => l.supportUuid);
    expect(uuids).toContain('sup-1');
    expect(uuids).toContain('sup-2');
    expect(result.charges[0].data.spanLoads).toHaveLength(2);
  });

  it('should drop span loads referencing a support that no longer exists', () => {
    const section = makeSection({
      supports: [makeSupport('sup-1')],
      charges: [
        makeCharge({ uuid: 'charge-1' }, [
          makeSpanLoad({ supportUuid: 'sup-1', loadWeight: 50 }),
          makeSpanLoad({ supportUuid: 'deleted-support' })
        ])
      ]
    });

    const result = alignSectionSpanLoadsToSupports(section);

    const uuids = result.charges[0].data.spanLoads.map((l) => l.supportUuid);
    expect(uuids).toEqual(['sup-1']);
  });

  it('should preserve the original weight of an existing span load', () => {
    const section = makeSection({
      charges: [makeCharge({ uuid: 'charge-1' }, [makeSpanLoad({ supportUuid: 'sup-1', loadWeight: 42 })])]
    });

    const result = alignSectionSpanLoadsToSupports(section);

    const kept = result.charges[0].data.spanLoads.find((l) => l.supportUuid === 'sup-1');
    expect(kept?.loadWeight).toBe(42);
  });

  it('should align every charge independently', () => {
    const section = makeSection({
      charges: [
        makeCharge({ uuid: 'charge-a' }, [makeSpanLoad({ supportUuid: 'sup-1' })]),
        makeCharge({ uuid: 'charge-b' }, [makeSpanLoad({ supportUuid: 'deleted-support' })])
      ]
    });

    const result = alignSectionSpanLoadsToSupports(section);

    expect(result.charges[0].data.spanLoads).toHaveLength(2);
    expect(result.charges[1].data.spanLoads.map((l) => l.supportUuid).sort()).toEqual(['sup-1', 'sup-2']);
  });

  it('should not mutate the original section', () => {
    const originalLoads = [makeSpanLoad({ supportUuid: 'sup-1' })];
    const section = makeSection({ charges: [makeCharge({ uuid: 'charge-1' }, originalLoads)] });

    alignSectionSpanLoadsToSupports(section);

    expect(section.charges[0].data.spanLoads).toBe(originalLoads);
    expect(section.charges[0].data.spanLoads).toHaveLength(1);
  });
});
