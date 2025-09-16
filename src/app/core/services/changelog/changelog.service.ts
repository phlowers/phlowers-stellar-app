/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@src/environments/environment';
import { ChangelogItem } from './types';

export enum ServerStatus {
  LOADING = 'LOADING',
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE'
}
@Injectable({
  providedIn: 'root'
})
export class ChangelogService {
  constructor(private readonly http: HttpClient) {}

  getChangelogs(): Observable<ChangelogItem[]> {
    return this.http.get<ChangelogItem[]>(`${environment.changelogUrl}`);
  }
}
