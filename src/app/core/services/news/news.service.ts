/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

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
 * Service for fetching application news and announcements.
 *
 * @remarks
 * The NewsService retrieves markdown-formatted news content from the server
 * to display announcements, updates, and important information to users.
 *
 * @example
 * ```typescript
 * this.newsService.getNews().subscribe(markdown => {
 *   this.newsContent = markdown;
 * });
 * ```
 *
 * @category Services
 */
@Injectable({
  providedIn: 'root'
})
export class NewsService {
  constructor(private readonly http: HttpClient) {}

  /**
   * Fetch news content from the server.
   *
   * @returns Observable emitting the news content as markdown string
   */
  getNews(): Observable<string> {
    return this.http.get<string>(`${window.location.origin}/data/news.md`, {
      responseType: 'text' as any
    });
  }
}
