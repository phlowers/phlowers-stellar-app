/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Section, Support } from '@shared/domain';
import { createEmptySection, createEmptySupport } from '@shared/domain/helpers/sections.helpers';
import {
  applyFootCoordinates,
  areCoordinatesComplete,
  buildReprojectionAngles,
  getMissingRequiredFields
} from './section-import-pipeline.helpers';

/** Builds a minimal Support for helper tests, overriding only the fields under test. */
const buildSupport = (overrides: Partial<Support> = {}): Support => ({
  ...createEmptySupport(),
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

describe('getMissingRequiredFields', () => {
  const buildValidSection = (): Section => ({
    ...createEmptySection(),
    name: 'Valid Section',
    type: 'phase',
    cables_amount: 1,
    cable_name: 'ASTER 570',
    supports: [
      buildSupport({ number: '1', spanLength: 100, spanAngle: 0, chainLength: 5, attachmentHeight: 10 }),
      buildSupport({ number: '2', spanLength: null, spanAngle: 0, chainLength: 5, attachmentHeight: 10 })
    ]
  });

  it('should return no missing fields for a fully valid section', () => {
    expect(getMissingRequiredFields(buildValidSection())).toEqual([]);
  });

  it('should report "name" when empty or blank', () => {
    expect(getMissingRequiredFields({ ...buildValidSection(), name: '' })).toContain('name');
    expect(getMissingRequiredFields({ ...buildValidSection(), name: '   ' })).toContain('name');
  });

  it('should report "type" when falsy', () => {
    expect(getMissingRequiredFields({ ...buildValidSection(), type: '' as unknown as Section['type'] })).toContain(
      'type'
    );
  });

  it('should report "cables_amount" when 0', () => {
    expect(getMissingRequiredFields({ ...buildValidSection(), cables_amount: 0 })).toContain('cables_amount');
  });

  it('should report "cable_name" when missing and requireCableName is true (default)', () => {
    expect(getMissingRequiredFields({ ...buildValidSection(), cable_name: undefined })).toContain('cable_name');
  });

  it('should not report "cable_name" when requireCableName is false', () => {
    expect(getMissingRequiredFields({ ...buildValidSection(), cable_name: undefined }, false)).not.toContain(
      'cable_name'
    );
  });

  it('should report per-support missing number/spanAngle/chainLength/attachmentHeight', () => {
    const section = buildValidSection();
    section.supports[0].number = null;
    section.supports[0].spanAngle = null;
    section.supports[0].chainLength = null;
    section.supports[0].attachmentHeight = null;

    const missing = getMissingRequiredFields(section);
    expect(missing).toContain('supports[0].number');
    expect(missing).toContain('supports[0].spanAngle');
    expect(missing).toContain('supports[0].chainLength');
    expect(missing).toContain('supports[0].attachmentHeight');
  });

  it('should report spanLength missing on a non-last support but not on the last support', () => {
    const section = buildValidSection();
    section.supports[0].spanLength = null;
    // supports[1] (last) already has spanLength: null and must NOT be reported.

    const missing = getMissingRequiredFields(section);
    expect(missing).toContain('supports[0].spanLength');
    expect(missing).not.toContain('supports[1].spanLength');
  });
});
