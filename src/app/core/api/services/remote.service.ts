/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

const url = 'http://localhost:8080';

@Injectable({
  providedIn: 'root'
})
export class RemoteService {
  constructor(private httpClient: HttpClient) {}

  saveStudies = (studies: any) => {
    this.httpClient.post(`${url}/studies`, studies).subscribe({
      next: (res) => {
        console.log('Studies saved', res);
      },
      error: () => {
        console.log('Error saving studies');
      }
    });
  };
}
