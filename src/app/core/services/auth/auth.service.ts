/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { computed, inject, Injectable, signal } from '@angular/core';
import { UserService } from '@services/user/user.service';
import { StorageService } from '@services/storage/storage.service';
import { User } from '@shared/domain/models/user.model';
import { AuthenticatedUser } from './auth-provider.interface';

const OIDC_EMAIL_PARAM = 'oidc_email';
const OIDC_NAME_PARAM = 'oidc_name';

/**
 * Orchestrates OIDC authentication at application startup.
 *
 * Strategy:
 * 1. Initialize database
 * 2. Check URL query params for OIDC callback identity (oidc_email, oidc_name)
 *    → if present: create/sync user in IndexedDB, clean URL
 * 3. Otherwise: check IndexedDB for existing user (returning user / offline)
 * 4. If nothing → user must log in (redirect handled by guard)
 *
 * IndexedDB is the sole persistence layer. No localStorage, no cookies.
 * The user is never disconnected to allow offline operation.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userService = inject(UserService);
  private readonly storageService = inject(StorageService);

  private readonly _currentUser = signal<User | null>(null);

  /** The currently authenticated user (null before initialization or if login required). */
  readonly currentUser = this._currentUser.asReadonly();

  /** Whether a valid user has been authenticated. */
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  /**
   * Bootstrap sequence called by `APP_INITIALIZER`.
   * Never throws — sets `isAuthenticated` to false on any failure.
   */
  async initialize(): Promise<void> {
    try {
      await this.storageService.setPersistentStorage();
      await this.storageService.createDatabase();

      // 1. Check URL params from OIDC callback redirect
      const identity = this.readOidcCallbackParams();
      if (identity) {
        this.clearOidcCallbackParams();
        await this.syncLocalUser(identity);
        return;
      }

      // 2. Fallback: returning user or offline — read from IndexedDB
      const existingUser = await this.userService.getUser();
      this._currentUser.set(existingUser);
    } catch (error) {
      console.error('[AuthService] initialize failed:', error);
      this._currentUser.set(null);
    }
  }

  /**
   * Read OIDC identity from URL query parameters.
   * After a successful OIDC login, the callback redirects to `/?oidc_email=...&oidc_name=...`.
   * Returns null if the expected params are not present.
   */
  private readOidcCallbackParams(): AuthenticatedUser | null {
    const params = new URLSearchParams(globalThis.location?.search);
    const email = params.get(OIDC_EMAIL_PARAM);
    if (!email) {
      return null;
    }
    return {
      email,
      displayName: params.get(OIDC_NAME_PARAM) ?? undefined
    };
  }

  /**
   * Remove OIDC query params from the URL without triggering a navigation.
   * Keeps the URL clean after reading the identity.
   */
  private clearOidcCallbackParams(): void {
    const url = new URL(globalThis.location.href);
    url.searchParams.delete(OIDC_EMAIL_PARAM);
    url.searchParams.delete(OIDC_NAME_PARAM);
    globalThis.history?.replaceState(null, '', url.pathname + url.search);
  }

  /**
   * Ensure the local IndexedDB user matches the OIDC identity.
   * Creates or replaces the local user as needed.
   * Tolerates concurrent access (e.g. UserService constructor subscription).
   */
  private async syncLocalUser(identity: AuthenticatedUser): Promise<void> {
    let user = await this.userService.getUser();

    if (user && user.email !== identity.email) {
      // Different OIDC user — reset local data
      await this.storageService.resetDatabase();
      user = null;
    }

    if (!user) {
      try {
        await this.userService.createUser({ email: identity.email });
      } catch {
        // User may already exist due to concurrent DB access — ignore
      }
      user = await this.userService.getUser();
    }

    this._currentUser.set(user);
  }
}
