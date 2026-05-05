/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// Re-export all interfaces and types from the dedicated interfaces file.
export type {
  ImportPipelineStage,
  CanonicalImportErrorCode,
  AdapterImportErrorCode,
  ImportErrorCode,
  ImportError,
  ImportOutcomeStatus,
  ImportOutcome,
  UUIDCollisionResolver,
  AcceptedFileSpec,
  ImportAdapter,
  ImportContextConfig
} from './import-contracts.interfaces';

// Re-export runtime constants and helpers.
export { IMPORT_ADAPTER_TOKEN, IMPORT_ERROR_CODES, adapterErrorCode } from './import-contracts.constantes';
