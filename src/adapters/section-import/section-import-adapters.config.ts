/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Provider } from '@angular/core';
import { provideSectionImportAdapter } from '@shared/import/section-adapter/section-import-adapter';
import { RteCustomAdapter } from './rte-custom/rte-custom.adapter';

/**
 * Optional section import adapters bundled in this build, in priority order (first match wins).
 *
 * The default `stellar_json` adapter is always registered by the core and must not be listed here.
 *
 * To add an adapter: create a folder in `src/adapters/section-import/<name>/` and append
 * `...provideSectionImportAdapter(MyAdapter)` below.
 * To drop one from a build: remove its line and its import; an adapter that is not imported here is not bundled.
 */
export const OPTIONAL_SECTION_IMPORT_ADAPTER_PROVIDERS: Provider[] = [...provideSectionImportAdapter(RteCustomAdapter)];
