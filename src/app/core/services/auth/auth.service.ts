/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable, signal } from '@angular/core';
import { StorageService } from '@services/storage/storage.service';
import { User } from '@shared/domain';

/**
 * Claims returned by the OIDC `/auth/userinfo` CGI endpoint.
 * `email` is mandatory (used as IndexedDB primary key); all other fields are optional.
 */
export interface OidcClaims {
  email: string;
  sub?: string;
  given_name?: string;
  family_name?: string;
  roles?: string[];
}

/** URL of the Apache CGI endpoint that returns OIDC claims (PKCE-protected). */
const USERINFO_URL = '/auth/userinfo';

/**
 * AuthService — OIDC + PKCE authentication via Apache mod_auth_openidc.
 *
 * Authentication is handled server-side by Apache (Authorization Code + PKCE).
 * This service only reads OIDC claims from the `/auth/userinfo` CGI endpoint
 * and caches them in IndexedDB for offline access.
 *
 * Strategy: cache-first, background network refresh, never delete users.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageService = inject(StorageService);

  /** Currently authenticated user (null until resolved from cache or network). */
  readonly currentUser = signal<User | null>(null);

  /**
   * Initialise authentication.
   *
   * Reads the user from IndexedDB first (instant), then refreshes claims
   * from `/auth/userinfo` in the background. Must be called after
   * `StorageService.createDatabase()`.
   */
  async initialize(): Promise<void> {
    const cachedUser = await this.loadCachedUser();

    if (cachedUser) {
      this.currentUser.set(cachedUser);
      this.refreshFromNetwork().catch((err) => {
        console.warn('AuthService: background network refresh failed', err);
      });
      return;
    }

    // No cache: first launch — wait for network.
    await this.refreshFromNetwork();
  }

  /**
   * Fetch OIDC claims from `/auth/userinfo` and upsert the user in IndexedDB.
   *
   * @returns The upserted `User`, or `null` if the request failed.
   */
  async refreshFromNetwork(): Promise<User | null> {
    const claims = await this.fetchUserinfo();
    if (!claims) {
      return null;
    }
    const user = await this.upsertUser(claims);
    this.currentUser.set(user);
    return user;
  }

  private async fetchUserinfo(): Promise<OidcClaims | null> {
    try {
      const response = await fetch(USERINFO_URL, { cache: 'no-store' });
      if (!response.ok) {
        console.warn(`AuthService: userinfo request failed (HTTP ${response.status})`);
        return null;
      }
      const data = (await response.json()) as OidcClaims;
      if (typeof data.email !== 'string' || !data.email.trim()) {
        console.warn('AuthService: userinfo response missing a valid email');
        return null;
      }
      return data;
    } catch (err) {
      console.warn('AuthService: userinfo fetch error', err);
      return null;
    }
  }

  private async upsertUser(claims: OidcClaims): Promise<User> {
    const existing = await this.storageService.db.users.get(claims.email);
    const user: User = {
      uuid: existing?.uuid,
      email: claims.email,
      studies: existing?.studies,
      sub: claims.sub,
      given_name: claims.given_name,
      family_name: claims.family_name,
      roles: claims.roles
    };
    await this.storageService.db.users.put(user);
    return user;
  }

  /**
   * Create a local user from an email address (fallback login form).
   *
   * Used when server-side OIDC is unavailable. Stores the user in IndexedDB
   * and sets the `currentUser` signal so the app can proceed.
   */
  async loginWithEmail(email: string): Promise<User> {
    const existing = await this.storageService.db.users.get(email);
    const user: User = {
      uuid: existing?.uuid,
      email,
      studies: existing?.studies
    };
    await this.storageService.db.users.put(user);
    this.currentUser.set(user);
    return user;
  }

  /**
   * Attempt to restore the current user from the IndexedDB cache.
   *
   * Used as a safety net by the auth guard in case the APP_INITIALIZER
   * signal was not yet visible when the guard evaluated.
   *
   * @returns `true` if a cached user was found and restored.
   */
  async tryRestoreFromCache(): Promise<boolean> {
    const cachedUser = await this.loadCachedUser();
    if (cachedUser) {
      this.currentUser.set(cachedUser);
      return true;
    }
    return false;
  }

  private async loadCachedUser(): Promise<User | null> {
    const users = await this.storageService.db.users.toArray();
    return users.length > 0 ? users[0] : null;
  }
}
