/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { computed, inject, Injectable, signal } from '@angular/core';
import { LoggerService } from '@services/logger/logger.service';
import { NotificationService } from '@services/notification/notification.service';
import { StorageService } from '@services/storage/storage.service';
import { User } from '@shared/domain';
import { OidcClaims } from '@services/auth/oidc-claims.interface';
import { USERINFO_URL } from '@services/auth/auth.constants';

/**
 * Shape of the JSON returned by `/auth/userinfo`. Always contains the two
 * mandatory mode flags; OIDC claims are present only when authenticated.
 */
interface UserinfoResponse extends Partial<OidcClaims> {
  authenticated: boolean;
  oidcEnabled: boolean;
}

/** Internal probe result. `unknown` is used when the network request failed. */
interface ProbeResult {
  oidcEnabled: boolean | 'unknown';
  claims: OidcClaims | null;
}

/**
 * AuthService — OIDC + PKCE authentication via Apache mod_auth_openidc.
 *
 * Two mutually-exclusive modes, decided server-side and discovered by the
 * SPA through `/auth/userinfo`:
 *   - OIDC mode (`oidcEnabled === true`): the only authentication path is
 *     the G@IA prompt. The local email fallback is forbidden.
 *   - Fallback mode (`oidcEnabled === false`): no server-side OIDC, the SPA
 *     accepts an email-only local login (parity with `ng serve`).
 *
 * Strategy: probe the network first to discover the mode, then fall back
 * to the IndexedDB cache when offline. Cached email-only users are never
 * accepted in OIDC mode (defence in depth — the real enforcement is Apache).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly logger = inject(LoggerService);
  private readonly notificationService = inject(NotificationService);
  private readonly storageService = inject(StorageService);

  /** Currently authenticated user (null until resolved from cache or network). */
  readonly currentUser = signal<User | null>(null);

  /**
   * Server-discovered authentication mode.
   *   - `true`  → OIDC required, email fallback forbidden.
   *   - `false` → fallback mode, email login allowed.
   *
   * Defaults to `true` (strict) until the first successful probe so we never
   * accidentally show the email form before knowing the server contract.
   */
  readonly oidcEnabled = signal<boolean>(true);

  /** True once the first network probe has completed (success or failure). */
  readonly modeResolved = signal<boolean>(false);

  /** Convenience: true when the email fallback form may be displayed. */
  readonly emailFallbackAllowed = computed(() => this.modeResolved() && !this.oidcEnabled());

  /**
   * Initialise authentication.
   *
   * Probes `/auth/userinfo` to discover the mode and any active OIDC
   * session, then falls back to the IndexedDB cache. Must be called after
   * `StorageService.createDatabase()`.
   */
  async initialize(): Promise<void> {
    const probe = await this.probeUserinfo();

    // 1. Active OIDC session — authoritative path.
    if (probe.claims) {
      const user = await this.upsertUser(probe.claims);
      this.currentUser.set(user);
      return;
    }

    // 2. No active session — fall back to IndexedDB cache.
    const cached = await this.loadCachedUser();
    if (!cached) {
      return;
    }

    // 2a. In OIDC mode (or when mode is unknown), reject stale email-only
    // users that were created in fallback mode. Only previously-OIDC users
    // (those that have a `sub` claim) are accepted offline.
    if (this.oidcEnabled() && !cached.sub) {
      this.logger.warn(
        'AuthService: stale email-only cached user ignored because OIDC mode is required'
      );
      return;
    }

    this.currentUser.set(cached);
  }

  /**
   * Fetch OIDC claims from `/auth/userinfo` and upsert the user in IndexedDB.
   *
   * @returns The upserted `User`, or `null` if no session/claims were returned.
   */
  async refreshFromNetwork(): Promise<User | null> {
    const probe = await this.probeUserinfo();
    if (!probe.claims) {
      return null;
    }
    const user = await this.upsertUser(probe.claims);
    this.currentUser.set(user);
    return user;
  }

  /**
   * Probe `/auth/userinfo` to discover the auth mode and any active session.
   * Updates `oidcEnabled` and `modeResolved` signals as a side effect.
   */
  private async probeUserinfo(): Promise<ProbeResult> {
    let response: Response;
    try {
      response = await fetch(USERINFO_URL, { cache: 'no-store' });
    } catch (err) {
      this.logger.warn('AuthService: userinfo fetch error', err);
      this.modeResolved.set(true);
      return { oidcEnabled: 'unknown', claims: null };
    }

    if (response.status === 401) {
      // Legacy server contract — assume OIDC required.
      this.oidcEnabled.set(true);
      this.modeResolved.set(true);
      return { oidcEnabled: true, claims: null };
    }
    if (!response.ok) {
      this.logger.warn(`AuthService: userinfo request failed (HTTP ${response.status})`);
      this.modeResolved.set(true);
      return { oidcEnabled: 'unknown', claims: null };
    }

    let data: UserinfoResponse;
    try {
      data = (await response.json()) as UserinfoResponse;
    } catch (err) {
      this.logger.warn('AuthService: userinfo response is not valid JSON', err);
      this.modeResolved.set(true);
      return { oidcEnabled: 'unknown', claims: null };
    }

    const oidcEnabled = data.oidcEnabled === true;
    this.oidcEnabled.set(oidcEnabled);
    this.modeResolved.set(true);

    if (data.authenticated !== true) {
      return { oidcEnabled, claims: null };
    }
    if (typeof data.email !== 'string' || !data.email.trim()) {
      this.logger.warn('AuthService: userinfo response missing a valid email');
      return { oidcEnabled, claims: null };
    }
    const claims: OidcClaims = {
      email: data.email,
      sub: data.sub,
      given_name: data.given_name,
      family_name: data.family_name,
      roles: data.roles
    };
    return { oidcEnabled, claims };
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
   * Forbidden when OIDC mode is active: the only authentication path in
   * that mode is the G@IA prompt.
   *
   * @throws Error when called while `oidcEnabled() === true`.
   */
  async loginWithEmail(email: string): Promise<User> {
    if (this.oidcEnabled()) {
      this.notificationService.error(
        $localize`Email login is disabled because GAIA single sign-on is required.`
      );
      throw new Error('Email login is disabled in OIDC mode');
    }

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
   * signal was not yet visible when the guard evaluated. Honours the
   * current OIDC mode: stale email-only users are rejected when OIDC is
   * required.
   *
   * @returns `true` if a cached user was found and restored.
   */
  async tryRestoreFromCache(): Promise<boolean> {
    const cachedUser = await this.loadCachedUser();
    if (!cachedUser) {
      return false;
    }
    if (this.oidcEnabled() && !cachedUser.sub) {
      return false;
    }
    this.currentUser.set(cachedUser);
    return true;
  }

  private async loadCachedUser(): Promise<User | null> {
    const users = await this.storageService.db.users.toArray();
    return users.length > 0 ? users[0] : null;
  }
}
