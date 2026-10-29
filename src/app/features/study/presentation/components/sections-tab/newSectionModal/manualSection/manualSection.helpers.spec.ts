import { CatalogLine, Section, Support } from '@shared/domain';
import { createEmptySupport } from '@shared/domain/helpers/sections.helpers';
import { normalizeAzimuth } from '@shared/domain/helpers/geopositioning.helpers';
import {
  applyLinesCascadeFilter,
  applyLinesFallback,
  buildNextSupportStepInput,
  computeStartBeforeAnchor,
  extractStartAnchor,
  getSpanAzimuthAtSupport,
  getStartAfterFirstSupportDeletion,
  getStartFromAnchorSupport,
  keepStartAnchor,
  sortCatalogLines
} from './manualSection.helpers';
import { StartAnchor } from './manualSection.interfaces';

const makeLine = (overrides: Partial<CatalogLine> = {}): CatalogLine => ({
  uuid: 'line-uuid',
  link_idr: '',
  lit_idr: '',
  lit_adr: '',
  branch_idr: '',
  branch_id: '',
  branch_adr: '',
  voltage_idr: '',
  voltage_adr: '',
  link_adr: '',
  ...overrides
});

const makeSection = (overrides: Partial<Section> = {}): Section =>
  ({
    uuid: 'section-uuid',
    link_idr: undefined,
    link_adr: undefined,
    lit_idr: undefined,
    lit_adr: undefined,
    branch_idr: undefined,
    branch_adr: undefined,
    voltage_idr: undefined,
    ...overrides
  }) as unknown as Section;

describe('sortCatalogLines', () => {
  it('should place NO_VOLTAGE entries first', () => {
    const lines = [
      makeLine({ voltage_adr: 'Z_VOLTAGE', voltage_idr: 'z' }),
      makeLine({ voltage_adr: 'NO_VOLTAGE', voltage_idr: 'nv' }),
      makeLine({ voltage_adr: 'A_VOLTAGE', voltage_idr: 'a' })
    ];
    const result = sortCatalogLines(lines);
    expect(result[0].voltage_adr).toBe('NO_VOLTAGE');
  });

  it('should sort remaining entries alphabetically by voltage_adr', () => {
    const lines = [
      makeLine({ voltage_adr: 'ZZZ', voltage_idr: 'z' }),
      makeLine({ voltage_adr: 'AAA', voltage_idr: 'a' }),
      makeLine({ voltage_adr: 'MMM', voltage_idr: 'm' })
    ];
    const result = sortCatalogLines(lines);
    expect(result.map((l) => l.voltage_adr)).toEqual(['AAA', 'MMM', 'ZZZ']);
  });

  it('should return a single-element array unchanged', () => {
    const lines = [makeLine({ voltage_adr: 'ONLY', voltage_idr: 'x' })];
    const result = sortCatalogLines(lines);
    expect(result).toHaveLength(1);
    expect(result[0].voltage_adr).toBe('ONLY');
  });

  it('should return empty array unchanged', () => {
    expect(sortCatalogLines([])).toHaveLength(0);
  });
});

describe('applyLinesCascadeFilter', () => {
  const lines = [
    makeLine({
      voltage_idr: 'v1',
      link_idr: 'link1',
      lit_idr: 'lit1',
      lit_adr: 'litA1',
      branch_idr: 'b1',
      branch_adr: 'ba1'
    }),
    makeLine({
      voltage_idr: 'v2',
      link_idr: 'link2',
      lit_idr: 'lit2',
      lit_adr: 'litA2',
      branch_idr: 'b2',
      branch_adr: 'ba2'
    }),
    makeLine({
      voltage_idr: 'v1',
      link_idr: 'link3',
      lit_idr: 'lit3',
      lit_adr: 'litA3',
      branch_idr: 'b3',
      branch_adr: 'ba3'
    })
  ];

  it('should return all lines when section has no filter properties set', () => {
    const section = makeSection();
    const result = applyLinesCascadeFilter(lines, section);
    expect(result).toHaveLength(3);
  });

  it('should filter by voltage_idr from section', () => {
    const section = makeSection({ voltage_idr: 'v1' });
    const result = applyLinesCascadeFilter(lines, section);
    expect(result).toHaveLength(2);
    result.forEach((l) => expect(l.voltage_idr).toBe('v1'));
  });

  it('should filter by link_idr from section', () => {
    const section = makeSection({ link_idr: 'link1' });
    const result = applyLinesCascadeFilter(lines, section);
    expect(result).toHaveLength(1);
    expect(result[0].link_idr).toBe('link1');
  });

  it('should apply overrideType with overrideValue', () => {
    const section = makeSection();
    const result = applyLinesCascadeFilter(lines, section, 'link_idr', 'link2');
    expect(result).toHaveLength(1);
    expect(result[0].link_idr).toBe('link2');
  });

  it('should return all lines when overrideValue is empty string', () => {
    const section = makeSection();
    const result = applyLinesCascadeFilter(lines, section, 'link_idr', '');
    expect(result).toHaveLength(3);
  });

  it('should combine section filter with override', () => {
    const section = makeSection({ voltage_idr: 'v1' });
    const result = applyLinesCascadeFilter(lines, section, 'link_idr', 'link1');
    expect(result).toHaveLength(1);
    expect(result[0].voltage_idr).toBe('v1');
    expect(result[0].link_idr).toBe('link1');
  });
});

describe('applyLinesFallback', () => {
  const allLines = [
    makeLine({ voltage_idr: 'v1', link_idr: 'link1', lit_idr: 'lit1' }),
    makeLine({ voltage_idr: 'v2', link_idr: 'link2', lit_idr: 'lit2' })
  ];

  it('should return filteredLines unchanged when they are not empty', () => {
    const section = makeSection();
    const result = applyLinesFallback(allLines, [allLines[0]], section);
    expect(result.lines).toEqual([allLines[0]]);
    expect(result.patchedVoltage).toBeUndefined();
  });

  it('should apply fallback by link_idr when filteredLines is empty', () => {
    const section = makeSection({ link_idr: 'link1' });
    const result = applyLinesFallback(allLines, [], section);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].link_idr).toBe('link1');
    expect(result.patchedVoltage).toBe('v1');
  });

  it('should apply fallback by lit_idr when link_idr is absent', () => {
    const section = makeSection({ lit_idr: 'lit2' });
    const result = applyLinesFallback(allLines, [], section);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].lit_idr).toBe('lit2');
    expect(result.patchedVoltage).toBe('v2');
  });

  it('should prefer link_idr over lit_idr for fallback', () => {
    const section = makeSection({ link_idr: 'link1', lit_idr: 'lit2' });
    const result = applyLinesFallback(allLines, [], section);
    expect(result.lines[0].link_idr).toBe('link1');
  });

  it('should return empty lines when neither link_idr nor lit_idr match', () => {
    const section = makeSection({ link_idr: 'unknown' });
    const result = applyLinesFallback(allLines, [], section);
    expect(result.lines).toHaveLength(0);
    expect(result.patchedVoltage).toBeUndefined();
  });

  it('should return empty lines when section has no link_idr or lit_idr', () => {
    const section = makeSection();
    const result = applyLinesFallback(allLines, [], section);
    expect(result.lines).toHaveLength(0);
    expect(result.patchedVoltage).toBeUndefined();
  });
});

describe('getStartAfterFirstSupportDeletion', () => {
  const makeSupport = (overrides: Partial<Support> = {}): Support => ({
    ...createEmptySupport(),
    footLatitude: 45,
    footLongitude: 3,
    spanAzimut: 100,
    spanAngle: 0,
    spanLength: 300,
    ...overrides
  });

  it('should use the stored foot GPS of the former support 1 as new start', () => {
    const supports = [
      makeSupport({ footLatitude: 1 }),
      makeSupport({ footLatitude: 45.5, footLongitude: 3.5 }),
      makeSupport()
    ];
    const result = getStartAfterFirstSupportDeletion(supports, null);
    expect(result?.latitude).toBe(45.5);
    expect(result?.longitude).toBe(3.5);
  });

  it('should keep the first span azimuth unchanged for the new first support', () => {
    const oldSpanAzimutOfSupport1 = 137;
    const supports = [
      makeSupport(),
      makeSupport({ spanAzimut: oldSpanAzimutOfSupport1, spanAngle: 25 }),
      makeSupport({ spanAzimut: 200, spanAngle: 0 })
    ];
    const result = getStartAfterFirstSupportDeletion(supports, null);
    const newFirstSupportAngle = supports[1].spanAngle! * 0.9;
    const newSpanAzimut = normalizeAzimuth(result!.azimuth + newFirstSupportAngle);
    expect(newSpanAzimut).toBeCloseTo(normalizeAzimuth(oldSpanAzimutOfSupport1), 10);
  });

  it('should normalize the new start azimuth across ±180', () => {
    const supports = [makeSupport(), makeSupport({ spanAzimut: -170, spanAngle: 20 }), makeSupport()];
    const result = getStartAfterFirstSupportDeletion(supports, null);
    // -170 - 18 = -188 => 172
    expect(result?.azimuth).toBeCloseTo(172, 10);
  });

  it('should fall back to the localization for missing stored values', () => {
    const supports = [
      makeSupport(),
      makeSupport({ footLatitude: null, footLongitude: null, spanAzimut: null, spanAngle: 10 }),
      makeSupport()
    ];
    const localization = {
      latitude: [45, 45.2, 45.4],
      longitude: [3, 3.2, 3.4],
      azimuth: [90, 80]
    };
    const result = getStartAfterFirstSupportDeletion(supports, localization);
    expect(result?.latitude).toBe(45.2);
    expect(result?.longitude).toBe(3.2);
    expect(result?.azimuth).toBeCloseTo(80 - 9, 10);
  });

  it('should return null when the former support 1 has no GPS, stored or resolved', () => {
    const supports = [makeSupport(), makeSupport({ footLatitude: null, footLongitude: null }), makeSupport()];
    expect(getStartAfterFirstSupportDeletion(supports, null)).toBeNull();
  });

  it('should return null when the former support 1 has no azimuth, stored or resolved', () => {
    const supports = [makeSupport(), makeSupport({ spanAzimut: null }), makeSupport()];
    expect(getStartAfterFirstSupportDeletion(supports, null)).toBeNull();
  });

  it('should return null when the former support 1 has no span angle', () => {
    const supports = [makeSupport(), makeSupport({ spanAngle: null }), makeSupport()];
    expect(getStartAfterFirstSupportDeletion(supports, null)).toBeNull();
  });

  it('should return null when there is no second support', () => {
    expect(getStartAfterFirstSupportDeletion([makeSupport()], null)).toBeNull();
  });
});

describe('start anchor helpers', () => {
  const makeAnchorSupport = (overrides: Partial<Support> = {}): Support => ({
    ...createEmptySupport(),
    uuid: 'support-uuid',
    footLatitude: 45,
    footLongitude: 3,
    spanAzimut: 100,
    spanAngle: 0,
    spanLength: 300,
    ...overrides
  });

  const anchor: StartAnchor = {
    supportUuid: 'old-support-0',
    gps: { latitude: 45, longitude: 3 },
    spanAzimuth: 100
  };

  describe('extractStartAnchor', () => {
    it('should capture the uuid, GPS and span azimuth of the first support from stored values', () => {
      const supports = [makeAnchorSupport({ uuid: 'first', footLatitude: 45.5, footLongitude: 3.5, spanAzimut: 12 })];
      expect(extractStartAnchor(supports, null)).toEqual({
        supportUuid: 'first',
        gps: { latitude: 45.5, longitude: 3.5 },
        spanAzimuth: 12
      });
    });

    it('should fall back to the localization of index 0 for missing stored values', () => {
      const supports = [makeAnchorSupport({ footLatitude: null, footLongitude: null, spanAzimut: null })];
      const localization = { latitude: [44], longitude: [2], azimuth: [77] };
      expect(extractStartAnchor(supports, localization)).toEqual({
        supportUuid: 'support-uuid',
        gps: { latitude: 44, longitude: 2 },
        spanAzimuth: 77
      });
    });

    it('should return null when the GPS of the first support is unknown', () => {
      const supports = [makeAnchorSupport({ footLatitude: null, footLongitude: null })];
      expect(extractStartAnchor(supports, null)).toBeNull();
    });

    it('should return null when the span azimuth of the first support is unknown', () => {
      const supports = [makeAnchorSupport({ spanAzimut: null })];
      expect(extractStartAnchor(supports, null)).toBeNull();
    });

    it('should return null when there is no support', () => {
      expect(extractStartAnchor([], null)).toBeNull();
    });
  });

  describe('getStartFromAnchorSupport', () => {
    it('should keep the anchor GPS and the azimuth before the deflection of the anchor support', () => {
      const result = getStartFromAnchorSupport(anchor, makeAnchorSupport({ spanAngle: 10 }));
      expect(result).toEqual({ latitude: 45, longitude: 3, azimuth: 91 });
    });

    it('should normalize the start azimuth to ]-180, 180]', () => {
      const result = getStartFromAnchorSupport({ ...anchor, spanAzimuth: -175 }, makeAnchorSupport({ spanAngle: 20 }));
      expect(result.azimuth).toBeCloseTo(167, 10);
    });

    it('should treat a missing span angle as no deflection', () => {
      const result = getStartFromAnchorSupport(anchor, makeAnchorSupport({ spanAngle: null }));
      expect(result.azimuth).toBe(100);
    });
  });

  describe('buildNextSupportStepInput', () => {
    it('should build the step input from the span length of the support and both deflection angles', () => {
      const supports = [makeAnchorSupport({ spanLength: 250, spanAngle: 5 }), makeAnchorSupport({ spanAngle: 8 })];
      const next = { latitude: 45, longitude: 3 };
      expect(buildNextSupportStepInput(supports, 0, next, 100)).toEqual({
        next,
        nextSpanAzimuth: 100,
        spanLength: 250,
        lineAngle: [5, 8]
      });
    });

    it('should use 0 for missing deflection angles', () => {
      const supports = [makeAnchorSupport({ spanAngle: null }), makeAnchorSupport({ spanAngle: null })];
      expect(buildNextSupportStepInput(supports, 0, { latitude: 1, longitude: 2 }, 0)?.lineAngle).toEqual([0, 0]);
    });

    it.each([
      ['missing', null],
      ['zero', 0],
      ['negative', -10]
    ])('should return null when the span length is %s', (_label, spanLength) => {
      const supports = [makeAnchorSupport({ spanLength }), makeAnchorSupport()];
      expect(buildNextSupportStepInput(supports, 0, { latitude: 1, longitude: 2 }, 0)).toBeNull();
    });

    it('should return null when there is no next support', () => {
      expect(buildNextSupportStepInput([makeAnchorSupport()], 0, { latitude: 1, longitude: 2 }, 0)).toBeNull();
    });
  });

  describe('getSpanAzimuthAtSupport', () => {
    it('should add the deflection of the support to the arrival azimuth', () => {
      expect(getSpanAzimuthAtSupport(50, makeAnchorSupport({ spanAngle: 10 }))).toBeCloseTo(59, 10);
    });

    it('should normalize the span azimuth to ]-180, 180]', () => {
      expect(getSpanAzimuthAtSupport(179, makeAnchorSupport({ spanAngle: 20 }))).toBeCloseTo(-163, 10);
    });
  });

  describe('computeStartBeforeAnchor', () => {
    it('should return the start from the anchor without computing a step when the anchor is support 0', async () => {
      const computeStart = vi.fn();
      const supports = [makeAnchorSupport({ uuid: 'old-support-0', spanAngle: 10 })];
      const result = await computeStartBeforeAnchor(
        supports,
        { ...anchor, supportUuid: 'old-support-0' },
        computeStart
      );
      expect(result).toEqual({ latitude: 45, longitude: 3, azimuth: 91 });
      expect(computeStart).not.toHaveBeenCalled();
    });

    it('should compute one step from the anchor for one support inserted before it', async () => {
      const computeStart = vi.fn().mockResolvedValue({ point: { latitude: 44, longitude: 2 }, azimuth: 30 });
      const supports = [
        makeAnchorSupport({ uuid: 'new', spanLength: 200, spanAngle: 4 }),
        makeAnchorSupport({ uuid: 'old-support-0', spanAngle: 10 }),
        makeAnchorSupport({ uuid: 'old-support-1' })
      ];
      const result = await computeStartBeforeAnchor(
        supports,
        { ...anchor, supportUuid: 'old-support-0' },
        computeStart
      );
      expect(computeStart).toHaveBeenCalledOnce();
      expect(computeStart).toHaveBeenCalledWith({
        next: { latitude: 45, longitude: 3 },
        nextSpanAzimuth: 100,
        spanLength: 200,
        lineAngle: [4, 10]
      });
      expect(result).toEqual({ latitude: 44, longitude: 2, azimuth: 30 });
    });

    it('should chain the steps for several supports inserted before the anchor', async () => {
      const computeStart = vi
        .fn()
        .mockResolvedValueOnce({ point: { latitude: 44, longitude: 2 }, azimuth: 30 })
        .mockResolvedValueOnce({ point: { latitude: 43, longitude: 1 }, azimuth: -20 });
      const supports = [
        makeAnchorSupport({ uuid: 'new-0', spanLength: 150, spanAngle: 2 }),
        makeAnchorSupport({ uuid: 'new-1', spanLength: 180, spanAngle: 6 }),
        makeAnchorSupport({ uuid: 'old-support-0', spanAngle: 10 })
      ];
      const result = await computeStartBeforeAnchor(
        supports,
        { ...anchor, supportUuid: 'old-support-0' },
        computeStart
      );
      expect(computeStart).toHaveBeenCalledTimes(2);
      expect(computeStart).toHaveBeenNthCalledWith(1, {
        next: { latitude: 45, longitude: 3 },
        nextSpanAzimuth: 100,
        spanLength: 180,
        lineAngle: [6, 10]
      });
      // Span azimuth at new-1 = 30 + 6 * 0.9 = 35.4
      expect(computeStart).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          next: { latitude: 44, longitude: 2 },
          spanLength: 150,
          lineAngle: [2, 6]
        })
      );
      expect(computeStart.mock.calls[1][0].nextSpanAzimuth).toBeCloseTo(35.4, 10);
      expect(result?.latitude).toBe(43);
      expect(result?.longitude).toBe(1);
      expect(result?.azimuth).toBeCloseTo(-20, 10);
    });

    it('should return null when the anchor support is no longer in the supports', async () => {
      const computeStart = vi.fn();
      const supports = [makeAnchorSupport({ uuid: 'other' })];
      expect(await computeStartBeforeAnchor(supports, anchor, computeStart)).toBeNull();
      expect(computeStart).not.toHaveBeenCalled();
    });

    it('should return null without calling the service when a span length is missing', async () => {
      const computeStart = vi.fn();
      const supports = [makeAnchorSupport({ spanLength: null }), makeAnchorSupport({ uuid: 'old-support-0' })];
      expect(
        await computeStartBeforeAnchor(supports, { ...anchor, supportUuid: 'old-support-0' }, computeStart)
      ).toBeNull();
      expect(computeStart).not.toHaveBeenCalled();
    });

    it('should return null when a step fails', async () => {
      const computeStart = vi.fn().mockResolvedValue(null);
      const supports = [makeAnchorSupport({ uuid: 'new' }), makeAnchorSupport({ uuid: 'old-support-0' })];
      expect(
        await computeStartBeforeAnchor(supports, { ...anchor, supportUuid: 'old-support-0' }, computeStart)
      ).toBeNull();
    });
  });

  describe('keepStartAnchor', () => {
    const emptyLocation = { latitude: null, longitude: null, azimuth: null };

    it('should keep the anchor while the location inputs are empty', () => {
      expect(keepStartAnchor(anchor, emptyLocation)).toBe(anchor);
    });

    it('should drop the anchor when the user filled all the location inputs', () => {
      expect(keepStartAnchor(anchor, { latitude: 45, longitude: 3, azimuth: 10 })).toBeNull();
    });

    it('should drop the anchor when the location is partially filled', () => {
      expect(keepStartAnchor(anchor, { latitude: 45, longitude: null, azimuth: null })).toBeNull();
    });

    it('should return null when there is no pending anchor', () => {
      expect(keepStartAnchor(null, emptyLocation)).toBeNull();
    });
  });
});
