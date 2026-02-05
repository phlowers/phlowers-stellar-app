/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { CatalogMaintenance } from '@core/domain';

/**
 * Catalog maintenance entity for Dexie storage.
 *
 * @remarks
 * Uses the domain model directly as no additional persistence fields
 * are needed. Contains maintenance organization hierarchy data.
 *
 * @category Database Entities
 */
export type CatalogMaintenanceEntity = CatalogMaintenance;
