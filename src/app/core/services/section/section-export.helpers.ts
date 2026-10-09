/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Section } from '@shared/domain';
import {
  STELLAR_SECTION_EXTENSION,
  STELLAR_SECTION_FORMAT,
  STELLAR_SECTION_VERSION,
  StellarSectionEnvelope
} from '@shared/import/section-adapter/section-import-adapter';

/** Wraps a section in the versioned Stellar envelope read back by the `stellar_json` import adapter. */
export function buildSectionEnvelope(section: Section): StellarSectionEnvelope {
  return { format: STELLAR_SECTION_FORMAT, version: STELLAR_SECTION_VERSION, section };
}

/** Builds `<section name>.stsec`, replacing characters that are illegal on common filesystems. */
export function buildSectionExportFilename(sectionName: string): string {
  const safeName = sectionName.replace(/[/\\:*?"<>|]/g, '-').trim();
  return `${safeName || 'section'}${STELLAR_SECTION_EXTENSION}`;
}
