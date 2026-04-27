/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, inject } from '@angular/core';
import { LoggerService } from '@core/services/logger/logger.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppDatabase } from '@infrastructure/database';
import { ProtectedTablesSnapshot } from './protected-tables-snapshot.interface';

@Injectable({
  providedIn: 'root'
})
/**
 * Service that manages the IndexedDB-backed local database (`AppDatabase`).
 * Provides lifecycle methods for creating, resetting, and configuring persistent storage.
 */
export class StorageService {
  private readonly _ready = new BehaviorSubject<boolean>(false);
  /** The Dexie `AppDatabase` instance used for all local data access. */
  public db!: AppDatabase;
  private readonly logger = inject(LoggerService);

  /** Observable that emits `true` once the database is created and ready. */
  get ready$(): Observable<boolean> {
    return this._ready.asObservable();
  }

  /**
   * Activate the browser persistent storage mode.
   * Only available on an https connection
   */
  async setPersistentStorage(): Promise<void> {
    // Request persistent storage for site
    if (navigator?.storage?.persist) {
      let isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        isPersisted = await navigator.storage.persist();
      }
    }
  }

  /**
   * Creates and initialises the `AppDatabase` instance.
   * Emits `true` on the `ready$` observable upon success.
   */
  async createDatabase(): Promise<void> {
    try {
      this.db = new AppDatabase();
      this._ready.next(true);
    } catch (error) {
      this.logger.error('StorageService createDatabase - error:', error);
      throw error;
    }
  }

  /**
   * Reset the database
   */
  async resetDatabase() {
    await this.db?.delete();
    await this.createDatabase();
  }

  /**
   * Execute an operation and ensure protected tables (`users`, `studies`) remain unchanged.
   *
   * @remarks
   * This is used to guarantee catalog synchronization does not modify protected data.
   * If no database is available, the operation is still executed without integrity assertion.
   *
   * @param operation - Async operation to execute under integrity check
   */
  async assertProtectedTablesUnchanged(operation: () => Promise<void>): Promise<void> {
    const snapshot = await this.captureProtectedTablesSnapshot();
    await operation();
    await this.assertProtectedTablesSnapshot(snapshot);
  }

  private async captureProtectedTablesSnapshot(): Promise<ProtectedTablesSnapshot | null> {
    const database = this.db;
    if (!database) {
      return null;
    }

    const [userCount, studyCount] = await Promise.all([database.users.count(), database.studies.count()]);
    return { userCount, studyCount };
  }

  private async assertProtectedTablesSnapshot(snapshot: ProtectedTablesSnapshot | null): Promise<void> {
    const database = this.db;
    if (!snapshot || !database) {
      return;
    }

    const [userCount, studyCount] = await Promise.all([database.users.count(), database.studies.count()]);
    if (userCount !== snapshot.userCount || studyCount !== snapshot.studyCount) {
      throw new Error('Protected data integrity check failed after catalog synchronization');
    }
  }
}
