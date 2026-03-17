/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { CatalogChain } from '@shared/domain';

/**
 * Catalog chain entity for Dexie storage
 * Uses the domain model directly as no additional persistence fields are needed
 */
export type CatalogChainEntity = CatalogChain;
