/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  Observable,
  catchError,
  distinctUntilChanged,
  fromEvent,
  map,
  merge,
  of,
  shareReplay,
  startWith,
  switchMap,
  timeout,
  timer
} from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { VERSION_FILE_TIMEOUT_MS, VERSION_FILE_URL } from '@services/app-update/app-update.constantes';
import { LoggerService } from '@services/logger/logger.service';
import { CONNECTIVITY_CHECK_INTERVAL_MS } from '@services/online/online.constantes';
import { ServerStatus } from '@services/online/online.interfaces';
import { environment } from '@src/environments/environment';

export { ServerStatus } from '@services/online/online.interfaces';

/**
 * Service for monitoring network connectivity and server availability.
 *
 * @remarks
 * Browser offline events take effect immediately. While the browser reports a
 * connection, an uncached request verifies reachability at startup, on window
 * focus and every 30 seconds. API availability is tracked separately.
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
  private readonly logger = inject(LoggerService);

  constructor() {
    this.online$
      .pipe(
        switchMap((online) => {
          if (!online) {
            return of(ServerStatus.OFFLINE);
          }
          this.serverOnline$.next(ServerStatus.LOADING);
          return this.httpClient.get(environment.apiUrl, { observe: 'response' }).pipe(
            timeout(2000),
            map(() => ServerStatus.ONLINE),
            catchError(() => of(ServerStatus.OFFLINE))
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe((status) => this.serverOnline$.next(status));
  }

  /**
   * Shared connectivity checks; version.json is excluded from the service worker cache.
   * @internal
   */
  private readonly _online = merge(
    fromEvent(globalThis, 'online').pipe(map(() => true)),
    fromEvent(globalThis, 'offline').pipe(map(() => false))
  ).pipe(
    startWith(globalThis.navigator.onLine),
    distinctUntilChanged(),
    switchMap((online) =>
      online
        ? merge(timer(0, CONNECTIVITY_CHECK_INTERVAL_MS), fromEvent(globalThis, 'focus')).pipe(
            switchMap(() =>
              fromFetch(VERSION_FILE_URL, { method: 'HEAD', cache: 'no-store', redirect: 'manual' }).pipe(
                timeout(VERSION_FILE_TIMEOUT_MS),
                // Any HTTP response proves connectivity, including an expired session or a server error.
                map(() => true),
                catchError(() => {
                  this.logger.info('[Online] Network reachability check failed');
                  return of(false);
                })
              )
            )
          )
        : of(false)
    ),
    startWith(false),
    distinctUntilChanged(),
    takeUntilDestroyed(),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  /**
   * Observable that emits verified network connectivity, independently of API health.
   *
   * @returns Observable emitting true when online, false when offline
   */
  get online$(): Observable<boolean> {
    return this._online;
  }
}
