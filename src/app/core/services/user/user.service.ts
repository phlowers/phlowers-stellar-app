/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { StorageService } from '@services/storage/storage.service';
import { UserEntity } from '@infrastructure/database';

@Injectable({
  providedIn: 'root'
})
/**
 * Service for reading the current application user from IndexedDB.
 * User creation/upsert is handled exclusively by AuthService (OIDC claims).
 */
export class UserService {
  private readonly storageService = inject(StorageService);

  /**
   * Get the user from the database.
   * Returns the first valid user, or null if none exists.
   * Never performs automatic deletion — violating users are preserved and an error state is returned.
   */
  async getUser(): Promise<UserEntity | null> {
    const users = await this.storageService.db.users.toArray();
    if (users.length === 0) {
      return null;
    }
    return users[0];
  }
}
