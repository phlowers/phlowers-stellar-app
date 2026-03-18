/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { StorageService } from '@services/storage/storage.service';
import { UserEntity } from '@infrastructure/database';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Validates whether the given string is a well-formed email address.
 * @param email - The string to validate.
 * @returns `true` if the string matches the email pattern.
 */
const validateEmail = (email: string): boolean => {
  const emailRegex =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/; //NOSONAR

  return emailRegex.exec(String(email).toLowerCase()) !== null;
};

@Injectable({
  providedIn: 'root'
})
/**
 * Service for managing the current application user.
 * Handles user creation, retrieval, and exposes a reactive user observable.
 */
export class UserService {
  private readonly userSubject = new BehaviorSubject<UserEntity | null>(null);
  /** Observable emitting the current `UserEntity` or `null` if no user exists. */
  public user$: Observable<UserEntity | null> = this.userSubject.asObservable();

  private readonly storageService = inject(StorageService);

  constructor() {
    this.storageService.ready$.subscribe((ready) => {
      if (ready) {
        this.storageService.db.users.toArray().then((users) => {
          if (users.length === 1) {
            this.userSubject.next(users[0]);
          }
        });
      }
    });
  }

  /**
   * Create a new user
   * @param user The user to create
   */
  async createUser(user: UserEntity) {
    const users = await this.storageService.db.users.toArray();
    if (users.length !== 0) {
      throw new Error('User already exists');
    }
    if (!validateEmail(user.email)) {
      throw new Error('Invalid email');
    }
    await this.storageService.db.users.add({ ...user });
    this.userSubject.next(user);
  }

  /**
   * Get the user from the database
   * @returns The user
   */
  async getUser() {
    const users = await this.storageService.db.users.toArray();
    if (users.length !== 1) {
      await this.storageService.db.users.clear();
      return null;
    } else {
      return users[0];
    }
  }
}
