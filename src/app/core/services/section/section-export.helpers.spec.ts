/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { createEmptySection } from '@shared/domain/helpers/sections.helpers';
import { buildSectionEnvelope, buildSectionExportFilename } from './section-export.helpers';

describe('buildSectionEnvelope', () => {
  it('should wrap the section in a version 1 Stellar envelope', () => {
    const section = { ...createEmptySection(), name: 'S1' };

    expect(buildSectionEnvelope(section)).toEqual({ format: 'stellar-section', version: 1, section });
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
