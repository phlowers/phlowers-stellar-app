/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable } from '@angular/core';
import { StorageService } from '../storage/storage.service';

@Injectable({
  providedIn: 'root'
})
export class CatalogSupportsService {
  constructor(private readonly storageService: StorageService) {}

  async getCatalogSupports() {
    return this.storageService.db?.catalogSupports?.toArray() ?? []; //NOSONAR
  }
}
