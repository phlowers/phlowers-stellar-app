/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { sanitizeSectionGeometry } from './section-geometry.helpers';
import { Section } from '@shared/domain';
import { Obstacle, ReferenceSupport, LateralDistanceType } from '@shared/domain/models/obstacle.model';
import { Charge, SpanLoad, LoadType, SymmetryType } from '@shared/domain/models/charge.model';
import { Floor } from '@shared/domain/models/floor.model';
import { Support } from '@shared/domain/models/support.model';

const makeSupport = (uuid: string): Support => ({ uuid }) as Support;

const makeObstacle = (overrides: Partial<Obstacle> = {}): Obstacle => ({
  uuid: 'obs-1',
  supportUuid: 'sup-1',
  supportIndex: 0,
  name: 'Obstacle 1',
  type: 'tree',
  altitudeType: 'absolute',
  referenceSupport: ReferenceSupport.LEFT,
  lateralDistanceType: LateralDistanceType.SPAN_AXIS,
  positions: [{ x: 1, y: 2, z: 3 }],
  ...overrides
});

const makeFloor = (overrides: Partial<Floor> = {}): Floor => ({
  uuid: 'floor-1',
  supportUuid: 'sup-1',
  referenceSupport: 'LEFT',
  points: [
    { distanceToRefSupport: 0, altitude: 10 },
    { distanceToRefSupport: 100, altitude: 12 }
  ],
  ...overrides
});

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
    supports: [makeSupport('sup-1'), makeSupport('sup-2'), makeSupport('sup-3')],
    obstacles: [],
    charges: [],
    ...overrides
  }) as Section;

describe('sanitizeSectionGeometry', () => {
  it('should return the section unchanged and removedGeometryBoundObjects=false when nothing needs pruning', () => {
    const section = makeSection({
      obstacles: [makeObstacle({ supportUuid: 'sup-1' })],
      charges: [makeCharge({}, [makeSpanLoad({ supportUuid: 'sup-2' })])]
    });

    const result = sanitizeSectionGeometry(section);

    expect(result.removedGeometryBoundObjects).toBe(false);
    expect(result.section).toBe(section);
  });

  it('should remove obstacles referencing a support that no longer exists', () => {
    const section = makeSection({
      obstacles: [
        makeObstacle({ uuid: 'obs-keep', supportUuid: 'sup-1' }),
        makeObstacle({ uuid: 'obs-drop', supportUuid: 'deleted-support' })
      ]
    });

    const result = sanitizeSectionGeometry(section);

    expect(result.removedGeometryBoundObjects).toBe(true);
    expect(result.section.obstacles.map((o) => o.uuid)).toEqual(['obs-keep']);
  });

  it('should treat the last support as not starting a span, dropping objects referencing it', () => {
    const section = makeSection({
      obstacles: [makeObstacle({ uuid: 'obs-on-last-support', supportUuid: 'sup-3' })],
      floors: [makeFloor({ uuid: 'floor-on-last-support', supportUuid: 'sup-3' })]
    });

    const result = sanitizeSectionGeometry(section);

    expect(result.removedGeometryBoundObjects).toBe(true);
    expect(result.section.obstacles).toEqual([]);
    expect(result.section.floors).toEqual([]);
  });

  it('should remove floors referencing a support that no longer exists', () => {
    const section = makeSection({
      floors: [
        makeFloor({ uuid: 'floor-keep', supportUuid: 'sup-1' }),
        makeFloor({ uuid: 'floor-drop', supportUuid: 'deleted-support' })
      ]
    });

    const result = sanitizeSectionGeometry(section);

    // A floor left on a deleted span is skipped by the worker: it can no longer be drawn or edited.
    expect(result.removedGeometryBoundObjects).toBe(true);
    expect(result.section.floors?.map((floor) => floor.uuid)).toEqual(['floor-keep']);
  });

  it('should keep a section that has no floors at all untouched', () => {
    const section = makeSection({ obstacles: [makeObstacle({ supportUuid: 'sup-1' })] });

    const result = sanitizeSectionGeometry(section);

    expect(result.removedGeometryBoundObjects).toBe(false);
    expect(result.section).toBe(section);
  });

  it('should remove only the span loads referencing a deleted support, keeping the charge', () => {
    const section = makeSection({
      charges: [
        makeCharge({ uuid: 'charge-1' }, [
          makeSpanLoad({ supportUuid: 'sup-1' }),
          makeSpanLoad({ supportUuid: 'deleted-support', loadWeight: 50 })
        ])
      ]
    });

    const result = sanitizeSectionGeometry(section);

    expect(result.removedGeometryBoundObjects).toBe(true);
    expect(result.section.charges).toHaveLength(1);
    expect(result.section.charges[0].data.spanLoads).toEqual([makeSpanLoad({ supportUuid: 'sup-1' })]);
  });

  it('should keep a charge with no remaining span loads', () => {
    const section = makeSection({
      charges: [makeCharge({ uuid: 'charge-1' }, [makeSpanLoad({ supportUuid: 'deleted-support', loadWeight: 50 })])]
    });

    const result = sanitizeSectionGeometry(section);

    expect(result.removedGeometryBoundObjects).toBe(true);
    expect(result.section.charges).toHaveLength(1);
    expect(result.section.charges[0].data.spanLoads).toEqual([]);
  });

  it('should silently remove a zero-value span-load placeholder for a deleted support', () => {
    const section = makeSection({
      charges: [makeCharge({ uuid: 'charge-1' }, [makeSpanLoad({ supportUuid: 'deleted-support' })])]
    });

    const result = sanitizeSectionGeometry(section);

    expect(result.section.charges[0].data.spanLoads).toEqual([]);
    expect(result.removedGeometryBoundObjects).toBe(false);
  });

  it('should not mutate a charge that has no invalid span loads', () => {
    const untouchedCharge = makeCharge({ uuid: 'charge-untouched' }, [makeSpanLoad({ supportUuid: 'sup-1' })]);
    const section = makeSection({
      charges: [
        untouchedCharge,
        makeCharge({ uuid: 'charge-changed' }, [makeSpanLoad({ supportUuid: 'deleted-support' })])
      ]
    });

    const result = sanitizeSectionGeometry(section);

    expect(result.section.charges[0]).toBe(untouchedCharge);
  });

  it('should handle a section with a single support (no spans) by dropping span-bound obstacles while keeping loads on existing supports', () => {
    const section = makeSection({
      supports: [makeSupport('sup-1')],
      obstacles: [makeObstacle({ supportUuid: 'sup-1' })],
      charges: [makeCharge({}, [makeSpanLoad({ supportUuid: 'sup-1' })])]
    });

    const result = sanitizeSectionGeometry(section);

    expect(result.removedGeometryBoundObjects).toBe(true);
    expect(result.section.obstacles).toEqual([]);
    expect(result.section.charges[0].data.spanLoads).toEqual([makeSpanLoad({ supportUuid: 'sup-1' })]);
  });

  it('should keep span loads on the last support (loads follow supports, not spans)', () => {
    const section = makeSection({
      charges: [makeCharge({ uuid: 'charge-1' }, [makeSpanLoad({ supportUuid: 'sup-3' })])]
    });

    const result = sanitizeSectionGeometry(section);

    expect(result.removedGeometryBoundObjects).toBe(false);
    expect(result.section.charges[0].data.spanLoads).toEqual([makeSpanLoad({ supportUuid: 'sup-3' })]);
  });
});
