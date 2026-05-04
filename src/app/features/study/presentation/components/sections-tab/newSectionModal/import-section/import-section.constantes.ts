/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ImportContextConfig } from '@shared/import/domain/import-contracts.interfaces';

/** Accepted file specification and UI texts for section JSON imports. */
export const SECTION_IMPORT_CONFIG: ImportContextConfig = {
  acceptedFiles: {
    extensions: ['.json'],
    mimeTypes: ['application/json'],
    hint: $localize`File format: .json`
  },
  entityLabel: $localize`Section`,
  texts: {
    description: $localize`You can import a section from a JSON file. It will be added to the current study.`,
    uploadPrompt: $localize`Upload a JSON file`
  }
};
