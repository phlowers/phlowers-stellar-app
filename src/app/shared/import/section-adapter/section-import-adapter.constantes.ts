/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { InjectionToken } from '@angular/core';
import { SectionImportAdapter } from './section-import-adapter.interfaces';

/** Multi-provider token holding every enabled section import adapter, in priority order. */
export const SECTION_IMPORT_ADAPTERS = new InjectionToken<readonly SectionImportAdapter[]>('SECTION_IMPORT_ADAPTERS');

/** `format` discriminator of the default Stellar section envelope. */
export const STELLAR_SECTION_FORMAT = 'stellar-section';

/** Current version of the default Stellar section envelope. */
export const STELLAR_SECTION_VERSION = 1;

/** File extension of the default Stellar section envelope. */
export const STELLAR_SECTION_EXTENSION = '.stsec';
