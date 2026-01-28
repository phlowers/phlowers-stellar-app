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
 * Service for fetching application changelog and version history.
 *
 * @remarks
 * The ChangelogService retrieves version history and release notes
 * from the configured changelog URL. This allows users to see what
 * has changed between application versions.
 *
 * @example
 * ```typescript
 * this.changelogService.getChangelogs().subscribe(items => {
 *   this.versions = items;
 * });
 * ```
 *
 * @category Services
 */
@Injectable({
  providedIn: 'root'
})
export class ChangelogService {
  constructor(private readonly http: HttpClient) {}

  /**
   * Fetch the application changelog from the server.
   *
   * @returns Observable emitting an array of changelog items
   */
  getChangelogs(): Observable<ChangelogItem[]> {
    return this.http.get<ChangelogItem[]>(`${environment.changelogUrl}`);
  }
}
