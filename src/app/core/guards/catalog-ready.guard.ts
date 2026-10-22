/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject } from '@angular/core';
import { CanActivateChildFn } from '@angular/router';
import { CatalogUpdateService } from '@shared/catalog/services/catalog-update.service';
import { LoggerService } from '@core/services/logger/logger.service';

/**
 * Holds navigation to the authenticated routes until the startup catalog imports have settled.
 *
 * @remarks
 * Catalogs must never change while the user works: a deep-linked study would otherwise initialize with the
 * previous catalog data and then see it replaced by a late import. Registered as `canActivateChild` so it runs
 * after the parent `authGuard` (the update is a no-op without a user). A failed update never blocks navigation
 * (the catalogs already imported keep working); background prefetch is not awaited.
 */
export const catalogReadyGuard: CanActivateChildFn = async () => {
  const catalogUpdateService = inject(CatalogUpdateService);
  const logger = inject(LoggerService);

  try {
    await catalogUpdateService.updateCatalogsIfNeeded();
  } catch (error) {
    logger.error('Catalog update failed', error);
  }
  return true;
};
