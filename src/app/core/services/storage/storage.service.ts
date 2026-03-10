/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppDatabase } from '@core/infrastructure/database';

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
      console.error('StorageService createDatabase - error:', error);
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
}
