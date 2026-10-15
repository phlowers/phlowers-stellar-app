/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Section, Support } from '@shared/domain';
import { createEmptySection, createEmptySupport } from './sections.helpers';
import {
  applyFootCoordinates,
  applyLocalization,
  areCoordinatesComplete,
  buildLocalizationInputs,
  buildReprojectionAngles,
  computeSpanAzimuthErrors,
  getFootGps,
  getStartGps,
  hasCompleteFootGps,
  hasGeometryChanged,
  withStartGps
} from './geopositioning.helpers';

/** Builds a minimal Support for helper tests, overriding only the fields under test. */
const buildSupport = (overrides: Partial<Support> = {}): Support => ({
  ...createEmptySupport(),
  ...overrides
});

/** Section with 3 supports, GPS on the first one only. */
const buildSection = (overrides: Partial<Section> = {}): Section => ({
  ...createEmptySection(),
  start_azimuth: 90,
  supports: [
    buildSupport({ uuid: 'a', spanLength: 100, spanAngle: 5, footLatitude: 45, footLongitude: 3 }),
    buildSupport({ uuid: 'b', spanLength: 200, spanAngle: 10 }),
    buildSupport({ uuid: 'c', spanLength: null, spanAngle: 0 })
  ],
  ...overrides
});

describe('buildReprojectionAngles', () => {
  it('should return spanLength/lineAngle arrays with NaN/0 placeholders on the last support', () => {
    const supports = [
      buildSupport({ spanLength: 100, spanAngle: 5 }),
      buildSupport({ spanLength: 200, spanAngle: 10 }),
      buildSupport({ spanLength: 300, spanAngle: 15 })
    ];
    const { spanLength, lineAngle } = buildReprojectionAngles(supports);

    expect(spanLength.slice(0, 2)).toEqual([100, 200]);
    expect(Number.isNaN(spanLength[2])).toBe(true);
    expect(lineAngle).toEqual([5, 10, 0]);
  });
});

describe('applyFootCoordinates', () => {
  it('should set footLatitude/footLongitude by index', () => {
    const supports = [buildSupport(), buildSupport()];
    const result = applyFootCoordinates(supports, [45.1, 45.2], [3.1, 3.2]);

    expect(result[0].footLatitude).toBe(45.1);
    expect(result[0].footLongitude).toBe(3.1);
    expect(result[1].footLatitude).toBe(45.2);
    expect(result[1].footLongitude).toBe(3.2);
  });

  it('should default to null when the coordinate array is shorter than the supports array', () => {
    const supports = [buildSupport(), buildSupport()];
    const result = applyFootCoordinates(supports, [45.1], [3.1]);

    expect(result[1].footLatitude).toBeNull();
    expect(result[1].footLongitude).toBeNull();
  });

  it('should not mutate the original support objects', () => {
    const supports = [buildSupport()];
    const result = applyFootCoordinates(supports, [45.1], [3.1]);

    expect(supports[0].footLatitude).toBeNull();
    expect(result[0]).not.toBe(supports[0]);
  });
});

describe('areCoordinatesComplete', () => {
  it('should be true when x and y hold one number per support', () => {
    expect(areCoordinatesComplete({ crs: 'LAMBERT93', x: [1, 2], y: [3, 4] }, 2)).toBe(true);
  });

  it('should be false when an entry is null', () => {
    expect(areCoordinatesComplete({ crs: 'LAMBERT93', x: [1, null], y: [3, 4] }, 2)).toBe(false);
  });

  it('should be false when the arrays do not match the supports count', () => {
    expect(areCoordinatesComplete({ crs: 'WGS84', x: [1], y: [3] }, 2)).toBe(false);
  });
});

describe('getFootGps / getStartGps', () => {
  it('should return null entries for supports without GPS', () => {
    expect(getFootGps(buildSection())).toEqual([{ latitude: 45, longitude: 3 }, null, null]);
  });

  it('should read the start GPS from the first support', () => {
    expect(getStartGps(buildSection())).toEqual({ latitude: 45, longitude: 3 });
  });

  it('should return null / empty without supports or GPS', () => {
    const empty = buildSection({ supports: [] });
    expect(getStartGps(empty)).toBeNull();
    expect(getFootGps(empty)).toEqual([]);
    expect(getStartGps(buildSection({ supports: [buildSupport()] }))).toBeNull();
  });
});

describe('withStartGps', () => {
  it('should set the first support foot GPS on a copy', () => {
    const section = buildSection();
    const result = withStartGps(section, { latitude: 10, longitude: 20 });

    expect(getStartGps(result)).toEqual({ latitude: 10, longitude: 20 });
    expect(getStartGps(section)).toEqual({ latitude: 45, longitude: 3 });
    expect(result.supports[1]).toBe(section.supports[1]);
  });

  it('should return the section unchanged when it has no support', () => {
    const section = buildSection({ supports: [] });
    expect(withStartGps(section, { latitude: 1, longitude: 2 })).toBe(section);
  });
});

describe('hasCompleteFootGps', () => {
  it('should be false when a support has no GPS', () => {
    expect(hasCompleteFootGps(buildSection())).toBe(false);
  });

  it('should be false without supports', () => {
    expect(hasCompleteFootGps(buildSection({ supports: [] }))).toBe(false);
  });

  it('should be true when every support has GPS', () => {
    const supports = [1, 2].map((n) => buildSupport({ footLatitude: n, footLongitude: n }));
    expect(hasCompleteFootGps(buildSection({ supports }))).toBe(true);
  });
});

describe('buildLocalizationInputs', () => {
  it('should build the task inputs with NaN/0 placeholders on the last support', () => {
    const inputs = buildLocalizationInputs(buildSection());

    expect(inputs?.startLatitude).toBe(45);
    expect(inputs?.startLongitude).toBe(3);
    expect(inputs?.startAzimuth).toBe(90);
    expect(inputs?.spanLength.slice(0, 2)).toEqual([100, 200]);
    expect(Number.isNaN(inputs?.spanLength[2])).toBe(true);
    expect(inputs?.lineAngle).toEqual([5, 10, 0]);
  });

  it('should return null when the start GPS is missing', () => {
    const section = buildSection();
    section.supports[0] = { ...section.supports[0], footLatitude: null };
    expect(buildLocalizationInputs(section)).toBeNull();
  });

  it('should return null when the start azimuth is missing', () => {
    expect(buildLocalizationInputs(buildSection({ start_azimuth: null }))).toBeNull();
  });

  it('should return null when a span geometry is incomplete', () => {
    const section = buildSection();
    section.supports[1] = { ...section.supports[1], spanLength: null };
    expect(buildLocalizationInputs(section)).toBeNull();
  });

  it('should return null without supports', () => {
    expect(buildLocalizationInputs(buildSection({ supports: [] }))).toBeNull();
  });
});

describe('applyLocalization', () => {
  it('should set foot GPS and spanAzimut, null for the last support', () => {
    const result = applyLocalization([buildSupport(), buildSupport()], {
      latitude: [1, 2],
      longitude: [3, 4],
      azimuth: [90]
    });

    expect(result.map((s) => [s.footLatitude, s.footLongitude, s.spanAzimut])).toEqual([
      [1, 3, 90],
      [2, 4, null]
    ]);
  });
});

describe('hasGeometryChanged', () => {
  it('should be true without previous version', () => {
    expect(hasGeometryChanged(undefined, buildSection())).toBe(true);
  });

  it('should be false for an identical geometry', () => {
    expect(hasGeometryChanged(buildSection(), buildSection())).toBe(false);
  });

  it('should ignore unrelated changes', () => {
    const previous = buildSection();
    expect(hasGeometryChanged(previous, { ...previous, name: 'renamed' })).toBe(false);
  });

  it('should detect a span length change', () => {
    const next = buildSection();
    next.supports[0] = { ...next.supports[0], spanLength: 101 };
    expect(hasGeometryChanged(buildSection(), next)).toBe(true);
  });

  it('should detect a span angle change', () => {
    const next = buildSection();
    next.supports[1] = { ...next.supports[1], spanAngle: 11 };
    expect(hasGeometryChanged(buildSection(), next)).toBe(true);
  });

  it('should detect support order / uuid changes', () => {
    const previous = buildSection();
    const next = { ...previous, supports: [...previous.supports].reverse() };
    expect(hasGeometryChanged(previous, next)).toBe(true);
    expect(hasGeometryChanged(previous, { ...previous, supports: previous.supports.slice(0, 2) })).toBe(true);
  });

  it('should detect start GPS and start azimuth changes', () => {
    const previous = buildSection();
    expect(hasGeometryChanged(previous, withStartGps(previous, { latitude: 46, longitude: 3 }))).toBe(true);
    expect(hasGeometryChanged(previous, { ...previous, start_azimuth: 91 })).toBe(true);
  });
});

describe('computeSpanAzimuthErrors', () => {
  it('should return the absolute gap per support, null when a value is missing', () => {
    const before = [10, 20, null].map((spanAzimut) => buildSupport({ spanAzimut }));
    const after = [10.5, null, 5].map((spanAzimut) => buildSupport({ spanAzimut }));

    expect(computeSpanAzimuthErrors(before, after)).toEqual([0.5, null, null]);
  });

  it('should wrap the gap around north', () => {
    const errors = computeSpanAzimuthErrors([buildSupport({ spanAzimut: 359 })], [buildSupport({ spanAzimut: 1 })]);
    expect(errors[0]).toBeCloseTo(2);
  });

  it('should return null when the other list is shorter', () => {
    expect(computeSpanAzimuthErrors([buildSupport({ spanAzimut: 1 })], [])).toEqual([null]);
  });
});
