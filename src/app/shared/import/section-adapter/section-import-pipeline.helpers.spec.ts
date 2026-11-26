/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Section, Support } from '@shared/domain';
import { createEmptySection, createEmptySupport } from '@shared/domain/helpers/sections.helpers';
import { getMissingRequiredFields } from './section-import-pipeline.helpers';

/** Builds a minimal Support for helper tests, overriding only the fields under test. */
const buildSupport = (overrides: Partial<Support> = {}): Support => ({
  ...createEmptySupport(),
  ...overrides
});

describe('getMissingRequiredFields', () => {
  const buildValidSection = (): Section => ({
    ...createEmptySection(),
    name: 'Valid Section',
    type: 'phase',
    cables_amount: 1,
    cable_name: 'ASTER600',
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

  it.each([{ name: null }, { name: undefined }, { name: 42 }, { name: false }, { name: {} }, { name: [] }])(
    'should report "name" without throwing for a non-string value: $name',
    ({ name }) => {
      const section = { ...buildValidSection(), name } as unknown as Section;

      expect(getMissingRequiredFields(section)).toEqual(['name']);
    }
  );

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

  it.each([{ supports: [] }, { supports: [buildSupport()] }])(
    'should report "supports" when fewer than two supports are present',
    ({ supports }) => {
      expect(getMissingRequiredFields({ ...buildValidSection(), supports })).toContain('supports');
    }
  );

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
