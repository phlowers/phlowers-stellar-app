/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TranslocoService } from '@jsverse/transloco';
import { uniq } from 'lodash';
import { ImportContextConfig } from '@shared/import/domain/import-contracts.interfaces';
import { SectionImportAdapter } from '@shared/import/section-adapter/section-import-adapter';

/** Accepted file specification and UI texts for section imports, derived from the enabled adapters. */
export const createSectionImportConfig = (
  transloco: TranslocoService,
  adapters: readonly SectionImportAdapter[]
): ImportContextConfig => ({
  acceptedFiles: {
    extensions: uniq(adapters.flatMap((adapter) => adapter.extensions)),
    mimeTypes: uniq(adapters.flatMap((adapter) => adapter.mimeTypes ?? [])),
    hint: transloco.translate('section-import.from-file.file-format', {
      formats: adapters.map((adapter) => adapter.formatLabel).join(', ')
    })
  },
  entityLabel: transloco.translate('importSection.entityLabel'),
  texts: {
    description: transloco.translate('section-import.from-file.description'),
    uploadPrompt: transloco.translate('section-import.from-file.upload-prompt')
  }
});
