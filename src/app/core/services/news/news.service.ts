/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export enum ServerStatus {
  LOADING = 'LOADING',
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE'
}
@Injectable({
  providedIn: 'root'
})
export class NewsService {
  constructor(private readonly http: HttpClient) {}

  getNews(): Observable<string> {
    return this.http.get<string>(`${window.location.origin}/data/news.md`, {
      responseType: 'text' as any
    });
  }
}
