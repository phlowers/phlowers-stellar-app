/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { createEmptySection } from '@shared/domain/helpers/sections.helpers';
import { FieldMeasure } from '@shared/domain/models/field-measure.model';
import { buildSectionEnvelope, buildSectionExportFilename } from './section-export.helpers';

describe('buildSectionEnvelope', () => {
  it('should wrap the section in a version 1 Stellar envelope', () => {
    const section = { ...createEmptySection(), name: 'S1' };

    expect(buildSectionEnvelope(section)).toEqual({ format: 'stellar-section', version: 1, section });
  });

  it('should write the dates of the field measures as RFC 9557 strings', () => {
    const date = new Date('2026-07-14T08:30:00.000Z');
    const section = {
      ...createEmptySection(),
      field_measures: [{ uuid: 'm1', date, time: date } as unknown as FieldMeasure]
    };

    const exported = buildSectionEnvelope(section).section.field_measures[0] as unknown as Record<string, unknown>;

    expect(exported['date']).toBe('2026-07-14T10:30:00.000+02:00[Europe/Paris]');
    expect(exported['time']).toBe('2026-07-14T10:30:00.000+02:00[Europe/Paris]');
    expect(section.field_measures[0].date).toBe(date);
  });
});

describe('buildSectionExportFilename', () => {
  it('should append the .stsec extension', () => {
    expect(buildSectionExportFilename('My section')).toBe('My section.stsec');
  });

  it('should replace characters that are illegal in file names', () => {
    expect(buildSectionExportFilename('A/B\\C:D*E?F"G<H>I|J')).toBe('A-B-C-D-E-F-G-H-I-J.stsec');
  });

  it('should fall back to "section" for a blank name', () => {
    expect(buildSectionExportFilename('   ')).toBe('section.stsec');
  });
});
