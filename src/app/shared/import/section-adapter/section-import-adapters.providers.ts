/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Provider } from '@angular/core';
import { OPTIONAL_SECTION_IMPORT_ADAPTER_PROVIDERS } from '@adapters/section-import/section-import-adapters.config';
import { StellarJsonAdapter } from '@adapters/section-import/stellar-json/stellar-json.adapter';
import { provideSectionImportAdapter } from './section-import-adapter.helpers';

/**
 * Every section import adapter enabled in this build.
 * `stellar_json` is mandatory and always first; optional adapters come from the build config.
 */
export const SECTION_IMPORT_ADAPTER_PROVIDERS: Provider[] = [
  ...provideSectionImportAdapter(StellarJsonAdapter),
  ...OPTIONAL_SECTION_IMPORT_ADAPTER_PROVIDERS
];
