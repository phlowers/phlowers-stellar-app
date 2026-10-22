/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { LoggerService } from '@core/services/logger/logger.service';
import { CATALOG_IMPORT_LOCK, CATALOG_LOCK_MANAGER, CATALOG_WORKING_SESSION_LOCK } from './catalog-update.constantes';
import { CatalogPromotion } from './catalog-update.interfaces';

/**
 * Coordinates catalog imports between the Stellar windows sharing the same IndexedDB (Web Locks API).
 *
 * @remarks
 * The live catalog tables are shared by every window and read on each call (e.g. `CablesService.getCable()`), so a
 * window replacing a catalog version would change the data of a window that is calculating or editing. Two locks:
 * - an import lock serializes imports (exclusive, waited for);
 * - a working-session lock is held in shared mode by each window for its whole lifetime once its startup update has
 *   settled. Replacing a live version needs it exclusively and is only attempted without waiting, so it succeeds
 *   when no other window works and is otherwise deferred to a later start.
 *
 * The browser releases the locks when the window closes or crashes. Without the Web Locks API there is nothing to
 * coordinate with: tasks run immediately (single-window behavior).
 *
 * @category Services
 */
@Injectable({ providedIn: 'root' })
export class CatalogLockService {
  private readonly logger = inject(LoggerService);
  private readonly lockManager = inject(CATALOG_LOCK_MANAGER);
  private workingSession: Promise<void> | null = null;
  private unsupportedLogged = false;

  /** Runs `task` once no other window is importing. */
  async runSerialized<T>(task: () => Promise<T>): Promise<T> {
    const locks = this.getLocks();
    return locks ? await locks.request(CATALOG_IMPORT_LOCK, task) : await task();
  }

  /** Runs `task` only if no other window is working with the catalogs; never waits for one to finish. */
  async runIfNoWorkingSession<T>(task: () => Promise<T>): Promise<CatalogPromotion<T>> {
    const locks = this.getLocks();
    if (!locks) {
      return { granted: true, value: await task() };
    }
    return await locks.request(
      CATALOG_WORKING_SESSION_LOCK,
      { ifAvailable: true },
      async (lock): Promise<CatalogPromotion<T>> => (lock ? { granted: true, value: await task() } : { granted: false })
    );
  }

  /**
   * Declares this window as working with the catalogs until it closes. Idempotent; resolves once the lock is held
   * (it waits for a promotion in progress in another window, so the catalogs are never read mid-replacement).
   */
  joinWorkingSession(): Promise<void> {
    const locks = this.getLocks();
    if (!locks) {
      return Promise.resolve();
    }
    this.workingSession ??= new Promise<void>((resolve) => {
      locks
        .request(CATALOG_WORKING_SESSION_LOCK, { mode: 'shared' }, () => {
          resolve();
          return new Promise<void>(() => undefined); // held until the window is closed
        })
        .catch((error: unknown) => {
          this.logger.warn('Catalog working-session lock unavailable', error);
          resolve();
        });
    });
    return this.workingSession;
  }

  private getLocks(): LockManager | undefined {
    const locks = this.lockManager;
    if (!locks && !this.unsupportedLogged) {
      this.unsupportedLogged = true;
      this.logger.warn('Web Locks API unavailable: catalog imports are not coordinated between windows');
    }
    return locks;
  }
}
