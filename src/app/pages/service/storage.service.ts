/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppDB } from '../database/db';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private _ready = new BehaviorSubject<boolean>(false);
  public db?: AppDB;

  constructor() {}

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
