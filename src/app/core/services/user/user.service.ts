/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable } from '@angular/core';
import { StorageService } from '@services/storage/storage.service';
import { UserEntity } from '@core/infrastructure/database';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Validates an email address format.
 *
 * @param email - The email address to validate
 * @returns True if the email format is valid, false otherwise
 *
 * @internal
 */
const validateEmail = (email: string): boolean => {
  const emailRegex =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/; //NOSONAR

  return emailRegex.exec(String(email).toLowerCase()) !== null;
};

/**
 * Service for managing application users.
 *
 * @remarks
 * This service handles user creation and retrieval from IndexedDB.
 * The application supports a single user per browser instance.
 *
 * @example
 * ```typescript
 * constructor(private userService: UserService) {
 *   // Subscribe to user changes
 *   userService.user$.subscribe(user => {
 *     if (user) {
 *       console.log('Logged in as:', user.email);
 *     }
 *   });
 * }
 * ```
 *
 * @category Services
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly userSubject = new BehaviorSubject<UserEntity | null>(null);

  /** Observable stream of the current user */
  public user$: Observable<UserEntity | null> = this.userSubject.asObservable();

  constructor(private readonly storageService: StorageService) {
    this.storageService.ready$.subscribe((ready) => {
      if (ready) {
        this.storageService.db?.users.toArray().then((users) => {
          if (users?.length === 1) {
            this.userSubject.next(users[0]);
          }
        });
      }
    });
  }

  /**
   * Create a new user in the database.
   *
   * @param user - The user entity to create
   * @throws Error if a user already exists or email is invalid
   *
   * @example
   * ```typescript
   * await userService.createUser({ email: 'user@example.com' });
   * ```
   */
  async createUser(user: UserEntity) {
    const users = await this.storageService.db?.users.toArray();
    if (users?.length !== 0) {
      throw new Error('User already exists');
    }
    if (!validateEmail(user.email)) {
      throw new Error('Invalid email');
    }
    await this.storageService.db?.users.add({ ...user });
    this.userSubject.next(user);
  }

  /**
   * Get the current user from the database.
   *
   * @returns The user entity or null if no user exists
   *
   * @example
   * ```typescript
   * const user = await userService.getUser();
   * ```
   */
  async getUser() {
    const users = await this.storageService.db?.users.toArray();
    if (users?.length !== 1) {
      await this.storageService.db?.users.clear();
      return null;
    } else {
      return users?.[0];
    }
  }
}
