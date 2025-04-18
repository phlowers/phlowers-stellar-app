/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, distinctUntilChanged, fromEvent, map, merge, startWith } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export enum ServerStatus {
  LOADING = 'LOADING',
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE'
}
@Injectable({
  providedIn: 'root'
})
export class OnlineService {
  public serverOnline$ = new BehaviorSubject<ServerStatus>(ServerStatus.LOADING);

  constructor(private readonly httpClient: HttpClient) {
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

  private readonly _online = merge(fromEvent(window, 'online'), fromEvent(window, 'offline')).pipe(
    startWith(undefined),
    map(() => window.navigator.onLine)
  );

  get online$(): Observable<boolean> {
    return this._online.pipe(distinctUntilChanged());
  }
}
