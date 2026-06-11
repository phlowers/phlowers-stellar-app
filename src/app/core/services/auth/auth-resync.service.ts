import { Injectable } from '@angular/core';
import { LOGIN_URL } from '@services/auth/auth.constants';
import {
  AUTH_RESYNC_LAST_REDIRECT_AT_STORAGE_KEY,
  AUTH_RESYNC_REDIRECT_COOLDOWN_MS
} from '@services/auth/auth-resync.constantes';
import { isCooldownActive, isRedirectSuppressedPath, parseStoredTimestamp } from '@services/auth/auth-resync.helpers';

@Injectable({ providedIn: 'root' })
export class AuthResyncService {
  private redirectInFlight = false;

  /**
   * Tries to trigger an immediate OIDC login redirect after a proven server mismatch.
   * Returns `true` when a redirect was initiated.
   */
  triggerImmediateRedirect(): boolean {
    if (this.redirectInFlight) {
      return false;
    }

    if (globalThis.navigator?.onLine === false) {
      return false;
    }

    const pathname = this.getCurrentPathname();
    if (isRedirectSuppressedPath(pathname)) {
      return false;
    }

    const now = Date.now();
    const lastRedirectAt = this.readLastRedirectAt();
    if (isCooldownActive(lastRedirectAt, now, AUTH_RESYNC_REDIRECT_COOLDOWN_MS)) {
      return false;
    }

    this.redirectInFlight = true;
    this.writeLastRedirectAt(now);
    this.navigateToOidcLogin();
    return true;
  }

  /** Extracted for testability (jsdom location.assign is not configurable). */
  navigateToOidcLogin(): void {
    globalThis.location.assign(LOGIN_URL);
  }

  /** Extracted for testability. */
  getCurrentPathname(): string {
    return globalThis.location?.pathname ?? '/';
  }

  private readLastRedirectAt(): number {
    return parseStoredTimestamp(globalThis.sessionStorage.getItem(AUTH_RESYNC_LAST_REDIRECT_AT_STORAGE_KEY));
  }

  private writeLastRedirectAt(value: number): void {
    globalThis.sessionStorage.setItem(AUTH_RESYNC_LAST_REDIRECT_AT_STORAGE_KEY, String(value));
  }
}
