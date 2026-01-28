/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppDatabase } from '@core/infrastructure/database';

/**
 * Service for managing IndexedDB storage operations.
 *
 * @remarks
 * This service handles the creation, persistence, and reset of the
 * application's IndexedDB database using Dexie.js.
 *
 * @example
 * ```typescript
 * constructor(private storageService: StorageService) {
 *   this.storageService.ready$.subscribe(ready => {
 *     if (ready) {
 *       console.log('Database is ready');
 *     }
 *   });
 * }
 * ```
 *
 * @category Services
 */
@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly _ready = new BehaviorSubject<boolean>(false);

  /** The Dexie database instance */
  public db!: AppDatabase;

  /**
   * Observable indicating whether the database is ready for use.
   * @returns An observable that emits `true` when the database is initialized
   */
  get ready$(): Observable<boolean> {
    return this._ready.asObservable();
  }

  /**
   * Activate the browser persistent storage mode.
   *
   * @remarks
   * This method requests persistent storage from the browser to prevent
   * automatic data eviction. Only available on HTTPS connections.
   *
   * @returns A promise that resolves when the operation completes
   *
   * @example
   * ```typescript
   * await storageService.setPersistentStorage();
   * ```
   */
  async setPersistentStorage(): Promise<void> {
    // Request persistent storage for site
    if (navigator?.storage?.persist) {
      let isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        isPersisted = await navigator.storage.persist();
        console.log(
          `Persisted storage granted: ${await navigator.storage.persisted()}`
        );
        console.log('estimate', await navigator.storage.estimate());
      } else {
        console.log('Persisted storage has already been granted');
      }
    }
  }

  /**
   * Create and initialize the IndexedDB database.
   *
   * @throws Error if database creation fails
   *
   * @example
   * ```typescript
   * await storageService.createDatabase();
   * ```
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
   * Reset the database by deleting and recreating it.
   *
   * @remarks
   * This will delete all data in the database. Use with caution.
   *
   * @example
   * ```typescript
   * await storageService.resetDatabase();
   * ```
   */
  async resetDatabase(): Promise<void> {
    await this.db?.delete();
    await this.createDatabase();
  }
}
