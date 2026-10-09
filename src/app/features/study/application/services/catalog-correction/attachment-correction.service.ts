/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { Support } from '@shared/domain';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { AttachmentCorrectionResult } from './catalog-correction.interfaces';

/**
 * Corrects the supports of an imported section against the local attachment catalog.
 *
 * The lookup uses `support.name` and `support.attachmentSet`. A support with a complete catalog
 * entry gets the catalog `attachmentSet`, `armLength` and `heightBelowConsole`; any other support
 * keeps its imported values and is reported as missing from the catalog.
 */
@Injectable({ providedIn: 'root' })
export class AttachmentCorrectionService {
  private readonly attachmentService = inject(AttachmentService);

  async correctSupports(supports: readonly Support[]): Promise<AttachmentCorrectionResult> {
    let hasMissingCatalogEntries = false;

    const corrected = await Promise.all(
      supports.map(async (support) => {
        const entry = await this.attachmentService.resolveCatalogAttachment(support.name, null, support.attachmentSet);
        if (!entry) {
          hasMissingCatalogEntries = true;
          return support;
        }
        return {
          ...support,
          attachmentSet: entry.attachment_set ?? null,
          armLength: entry.cross_arm_length ?? null,
          heightBelowConsole: entry.attachment_altitude ?? null
        };
      })
    );

    return { supports: corrected, hasMissingCatalogEntries };
  }
}
