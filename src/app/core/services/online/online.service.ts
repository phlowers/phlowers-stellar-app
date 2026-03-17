/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, distinctUntilChanged, fromEvent, map, merge, startWith } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { environment } from '@src/environments/environment';

/**
 * Enumeration of possible server connection states.
 *
 * @category Types
 */
export enum ServerStatus {
  /** Server status is being determined */
  LOADING = 'LOADING',
  /** Server is reachable and responding */
  ONLINE = 'ONLINE',
  /** Server is not reachable */
  OFFLINE = 'OFFLINE'
}

/**
 * Service for monitoring network connectivity and server availability.
 *
 * @remarks
 * The OnlineService tracks both browser online/offline status and server
 * reachability. It combines window online/offline events with periodic
 * server health checks to provide accurate connectivity information.
 *
 * @example
 * ```typescript
 * // Subscribe to online status
 * this.onlineService.online$.subscribe(isOnline => {
 * });
 *
 * // Subscribe to server status
 * this.onlineService.serverOnline$.subscribe(status => {
 *   if (status === ServerStatus.ONLINE) {
 *     // Enable online features
 *   }
 * });
 * ```
 *
 * @category Services
 */
@Injectable({
  providedIn: 'root'
})
export class OnlineService {
  /** BehaviorSubject tracking the server's reachability status (LOADING, ONLINE, or OFFLINE) */
  public serverOnline$ = new BehaviorSubject<ServerStatus>(ServerStatus.LOADING);

  private readonly httpClient = inject(HttpClient);

  constructor() {
    this.online$.subscribe((online) => {
      if (online) {
        this.httpClient
          .get(environment.apiUrl, { observe: 'response' })
          .pipe(timeout(2000))
          .subscribe({
            next: () => {
              this.serverOnline$.next(ServerStatus.ONLINE);
            },
            error: () => {
              this.serverOnline$.next(ServerStatus.OFFLINE);
            }
          });
      }
    });
  }

  /**
   * Internal observable that merges browser online/offline events.
   * @internal
   */
  private readonly _online = merge(fromEvent(window, 'online'), fromEvent(window, 'offline')).pipe(
    startWith(undefined),
    map(() => window.navigator.onLine)
  );

  /**
   * Observable that emits the browser's online/offline status.
   *
   * @returns Observable emitting true when online, false when offline
   */
  get online$(): Observable<boolean> {
    return this._online.pipe(distinctUntilChanged());
  }
}
