/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TranslocoService } from '@jsverse/transloco';
import { ImportContextConfig } from '@shared/import/domain/import-contracts.interfaces';

/** Accepted file specification and UI texts for section JSON imports. */
export const createSectionImportConfig = (transloco: TranslocoService): ImportContextConfig => ({
  acceptedFiles: {
    extensions: ['.json'],
    mimeTypes: ['application/json'],
    hint: transloco.translate('section-import.from-file.file-format')
  },
  entityLabel: transloco.translate('importSection.entityLabel'),
  texts: {
    description: transloco.translate('section-import.from-file.description'),
    uploadPrompt: transloco.translate('section-import.from-file.upload-prompt')
  }
});
