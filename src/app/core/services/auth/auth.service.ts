/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { DestroyRef, computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { LoggerService } from '@services/logger/logger.service';
import { NotificationService } from '@services/notification/notification.service';
import { StorageService } from '@services/storage/storage.service';
import { User } from '@shared/domain';
import { OidcClaims } from '@services/auth/oidc-claims.interface';
import { USERINFO_URL } from '@services/auth/auth.constants';
import { AuthResyncService } from '@services/auth/auth-resync.service';
import { fromEvent } from 'rxjs';

/**
 * Shape of the JSON returned by `/auth/userinfo`. Always contains the two
 * mandatory mode flags; OIDC claims are present only when authenticated.
 */
interface UserinfoResponse extends Partial<OidcClaims> {
  authenticated: boolean;
  oidcEnabled: boolean;
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
  private static readonly SERVER_MISMATCH_STATUS_CODES = new Set([401, 403]);

  /**
   * Timeout (ms) for the `/auth/userinfo` probe so a slow or unreachable
   * server never blocks startup.
   *
   * MUST stay strictly greater than Apache's `OIDCHTTPTimeoutLong` (10s in
   * `httpd-oidc.conf.template`): a shorter client timeout races Apache's own
   * outgoing call to G@IA and aborts the request right as Apache might have
   * been about to answer. 13s leaves a ~3s margin.
   */
  private static readonly USERINFO_PROBE_TIMEOUT_MS = 13000;

  private readonly logger = inject(LoggerService);
  private readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);
  private readonly storageService = inject(StorageService);
  private readonly authResyncService = inject(AuthResyncService);
  private readonly destroyRef = inject(DestroyRef);
  private refreshOnReconnectInFlight = false;

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

  /** True when the server explicitly reported an auth/session mismatch while reachable. */
  readonly serverSessionInvalid = signal<boolean>(false);

  /** Convenience: true when the email fallback form may be displayed. */
  readonly emailFallbackAllowed = computed(() => this.modeResolved() && !this.oidcEnabled());

  constructor() {
    fromEvent(globalThis, 'online')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.handleBrowserReconnected();
      });
  }

  /**
   * Initialise authentication.
   *
   * Probes `/auth/userinfo` to discover the mode and any active OIDC
   * session, then falls back to the IndexedDB cache. Must be called after
   * `StorageService.createDatabase()`.
   */
  async initialize(): Promise<void> {
    const cached = await this.loadCachedUser();

    if (cached?.sub && !this.shouldForceServerResync()) {
      this.currentUser.set(cached);
      void this.refreshFromNetwork().catch((err) => {
        this.logger.warn('AuthService: background resync failed', err);
      });
      return;
    }

    // IMPORTANT: never await the network probe here. This method is called
    // from APP_INITIALIZER and Angular renders nothing until it resolves.
    // probeUserinfo() can take up to USERINFO_PROBE_TIMEOUT_MS (13s) on a
    // slow/unreachable server — that must never turn into a blank white
    // screen. The auth guard and the login page already tolerate the
    // transient "unresolved" state (IndexedDB fallback, `modeResolved`
    // signal), so resolving in the background is safe.
    void this.resolveModeAndUserFromNetwork(cached);
  }

  /**
   * Background counterpart of `initialize()` for the "no proven-OIDC cached
   * user" path: probes the server to discover the auth mode and any active
   * session, then falls back to the IndexedDB cache. Never awaited by the
   * caller so it cannot delay the app's first render.
   */
  private async resolveModeAndUserFromNetwork(cached: User | null): Promise<void> {
    const claims = await this.probeUserinfo();

    // 1. Active OIDC session — authoritative path.
    if (claims) {
      const user = await this.upsertUser(claims);
      this.currentUser.set(user);
      return;
    }

    // 2. No active session — fall back to IndexedDB cache.
    if (this.shouldForceServerResync()) {
      this.currentUser.set(null);
      return;
    }

    if (!cached) {
      return;
    }

    // 2a. In OIDC mode (or when mode is unknown), reject stale email-only
    // users that were created in fallback mode. Also clear `currentUser` in
    // case the auth guard optimistically restored the cached user while the
    // mode was still unresolved (see `tryRestoreFromCache`).
    if (this.oidcEnabled() && !cached.sub) {
      this.logger.warn('AuthService: stale email-only cached user ignored because OIDC mode is required');
      this.currentUser.set(null);
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
    const claims = await this.probeUserinfo();
    if (!claims) {
      // Background reconciliation of the offline-first fast path: a proven
      // server mismatch (401/403) is recorded via `serverSessionInvalid`
      // (see `probeUserinfo`), but the cache-first user is intentionally kept
      // visible so startup stays instant. Apache remains the authoritative
      // enforcement layer for any real protected request from this point on.
      return null;
    }
    const user = await this.upsertUser(claims);
    this.serverSessionInvalid.set(false);
    this.currentUser.set(user);
    return user;
  }

  /** Returns true when online and a previous server response proved the local session is stale. */
  shouldForceServerResync(): boolean {
    return this.serverSessionInvalid() && this.isBrowserOnline();
  }

  /**
   * Mark a server mismatch from an explicit HTTP status observed on a protected endpoint.
   * Safe to call with any HTTP status: only known mismatch statuses set the flag.
   * Transient backend errors (such as 501) are intentionally ignored as a no-op.
   */
  markServerMismatchFromStatus(status: number): void {
    if (AuthService.SERVER_MISMATCH_STATUS_CODES.has(status)) {
      this.serverSessionInvalid.set(true);
    }
  }

  /**
   * Probe `/auth/userinfo` to discover the auth mode and any active session.
   * Updates `oidcEnabled` and `modeResolved` signals as a side effect.
   *
   * @returns The OIDC claims when an authenticated session is present,
   *          otherwise `null` (anonymous, error, or fallback mode).
   */
  private async probeUserinfo(): Promise<OidcClaims | null> {
    let response: Response;
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(new DOMException('userinfo probe timeout', 'TimeoutError')),
      AuthService.USERINFO_PROBE_TIMEOUT_MS
    );
    try {
      response = await fetch(USERINFO_URL, { cache: 'no-store', signal: controller.signal });
    } catch (err) {
      // Includes AbortError on timeout: treated as a transient network issue,
      // never as a proven auth mismatch (which requires an explicit 401/403).
      this.logger.warn('AuthService: userinfo fetch error', err);
      this.modeResolved.set(true);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 401) {
      // Legacy server contract — assume OIDC required.
      this.oidcEnabled.set(true);
      this.markServerMismatchFromStatus(response.status);
      this.modeResolved.set(true);
      return null;
    }
    if (!response.ok) {
      this.logger.warn(`AuthService: userinfo request failed (HTTP ${response.status})`);
      this.markServerMismatchFromStatus(response.status);
      this.modeResolved.set(true);
      return null;
    }

    let data: UserinfoResponse;
    try {
      data = (await response.json()) as UserinfoResponse;
    } catch (err) {
      this.logger.warn('AuthService: userinfo response is not valid JSON', err);
      this.modeResolved.set(true);
      return null;
    }

    this.oidcEnabled.set(data.oidcEnabled === true);
    this.serverSessionInvalid.set(false);
    this.modeResolved.set(true);

    if (data.authenticated !== true) {
      return null;
    }
    if (typeof data.email !== 'string' || !data.email.trim()) {
      this.logger.warn('AuthService: userinfo response missing a valid email');
      return null;
    }
    return {
      email: data.email,
      sub: data.sub,
      given_name: data.given_name,
      family_name: data.family_name,
      roles: data.roles
    };
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
      this.notificationService.error(this.translocoService.translate('shared.auth-service.email-login-disabled'));
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
   * required — but only once the mode has actually been resolved by the
   * server probe. While the mode is still unknown, `oidcEnabled` holds its
   * strict default (`true`) and rejecting on it would race the in-flight
   * `/auth/userinfo` probe, kicking a valid fallback-mode user back to the
   * login page on every full reload. Restoring optimistically is safe:
   * Apache remains the authoritative enforcement layer, and
   * `resolveModeAndUserFromNetwork` re-evaluates once the probe lands.
   *
   * @returns `true` if a cached user was found and restored.
   */
  async tryRestoreFromCache(): Promise<boolean> {
    if (this.shouldForceServerResync()) {
      return false;
    }

    const cachedUser = await this.loadCachedUser();
    if (!cachedUser) {
      return false;
    }
    if (this.modeResolved() && this.oidcEnabled() && !cachedUser.sub) {
      return false;
    }
    this.currentUser.set(cachedUser);
    return true;
  }

  private async loadCachedUser(): Promise<User | null> {
    const users = await this.storageService.db.users.toArray();
    return users.length > 0 ? users[0] : null;
  }

  private isBrowserOnline(): boolean {
    return globalThis.navigator?.onLine !== false;
  }

  /**
   * Best-effort reconnect sync.
   *
   * When connectivity returns, silently probe `/auth/userinfo` to refresh claims.
   * Never raises UI errors and does nothing for anonymous first launches.
   * If the server session is still proven invalid after the resync attempt,
   * retries the OIDC login redirect (subject to `AuthResyncService`'s own
   * cooldown/suppressed-path guards) so a user who was offline when the
   * mismatch was first detected is not left stuck indefinitely.
   */
  private async handleBrowserReconnected(): Promise<void> {
    if (this.refreshOnReconnectInFlight) {
      return;
    }
    if (!this.currentUser() && !this.serverSessionInvalid()) {
      return;
    }

    this.refreshOnReconnectInFlight = true;
    try {
      await this.refreshFromNetwork();
    } catch (err) {
      this.logger.warn('AuthService: reconnect refresh failed', err);
    } finally {
      this.refreshOnReconnectInFlight = false;
    }

    if (this.shouldForceServerResync()) {
      this.authResyncService.triggerImmediateRedirect();
    }
  }
}
