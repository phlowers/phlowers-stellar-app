/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppDB } from './db';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private _ready = new BehaviorSubject<boolean>(false);
  public db?: AppDB;

  get ready$(): Observable<boolean> {
    return this._ready.asObservable();
  }

  /**
   * Activate the browser persistent storage mode.
   * Only available on an https connection
   */
  async setPersistentStorage(): Promise<void> {
    // Request persistent storage for site
    if (navigator.storage && navigator.storage.persist) {
      let isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        isPersisted = await navigator.storage.persist();
        console.log(`Persisted storage granted: ${isPersisted}`);
      } else {
        console.log('Persisted storage has already been granted');
      }
    }
  }

  async createDatabase(): Promise<void> {
    this.db = new AppDB();
    this._ready.next(true);
  }
}
