/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable } from '@angular/core';
import { Section } from '@shared/domain';
import { buildSectionEnvelope, buildSectionExportFilename } from './section-export.helpers';

/** Downloads a section as a Stellar section file (`.stsec`) that the default import adapter reads back. */
@Injectable({ providedIn: 'root' })
export class SectionExportService {
  /** Triggers the browser download of the section. */
  exportSection(section: Section): void {
    const content = JSON.stringify(buildSectionEnvelope(section), null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = buildSectionExportFilename(section.name);
    link.click();
    URL.revokeObjectURL(url);
  }
}
