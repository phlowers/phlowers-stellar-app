/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { InjectionToken } from '@angular/core';
import { ImportAdapter } from './import-contracts.interfaces';

/**
 * DI token used to provide a context-specific `ImportAdapter` to the generic
 * import engine and UI component.
 *
 * @example
 * ```typescript
 * // In a feature module or component providers array:
 * { provide: IMPORT_ADAPTER_TOKEN, useClass: StudyImportAdapter }
 * ```
 */
export const IMPORT_ADAPTER_TOKEN = new InjectionToken<ImportAdapter>('IMPORT_ADAPTER_TOKEN');
