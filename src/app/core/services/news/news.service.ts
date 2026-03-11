/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

/** Enum representing the status of the remote server. */
export enum ServerStatus {
  /** Server status is being determined. */
  LOADING = 'LOADING',
  /** Server is reachable. */
  ONLINE = 'ONLINE',
  /** Server is unreachable. */
  OFFLINE = 'OFFLINE'
}
@Injectable({
  providedIn: 'root'
})
/**
 * Service for fetching application news content from the server.
 */
export class NewsService {
  private readonly http = inject(HttpClient);

  /**
   * Fetches the news markdown file from the application origin.
   * @returns An observable emitting the raw markdown string.
   */
  getNews(): Observable<string> {
    return this.http.get<string>(`${window.location.origin}/data/news.md`, {
      responseType: 'text' as any
    });
  }
}
