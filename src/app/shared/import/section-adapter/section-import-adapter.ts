/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// Public entry point of the section import adapter contract.
export type {
  SectionImportCrs,
  SectionImportSource,
  SectionImportCoordinates,
  SectionImportNotice,
  SectionImportPayload,
  SectionImportAdapter,
  StellarSectionEnvelope
} from './section-import-adapter.interfaces';

export {
  SECTION_IMPORT_ADAPTERS,
  STELLAR_SECTION_FORMAT,
  STELLAR_SECTION_VERSION,
  STELLAR_SECTION_EXTENSION
} from './section-import-adapter.constantes';

export {
  provideSectionImportAdapter,
  getFileExtension,
  isFileAccepted,
  selectAdapter,
  buildImportSource,
  isImportError
} from './section-import-adapter.helpers';
