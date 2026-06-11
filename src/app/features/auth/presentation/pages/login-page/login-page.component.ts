/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '@services/auth/auth.service';
import { LOGIN_URL } from '@services/auth/auth.constants';

/**
 * Login page displayed when no OIDC session or cached user is available.
 *
 * Behaviour is driven by `AuthService.oidcEnabled` (discovered server-side
 * via `/auth/userinfo`):
 *   - OIDC mode → a top-level navigation to `/auth/login` is fired so
 *     Apache `mod_auth_openidc` redirects the browser to the G@IA prompt.
 *     The local email form is never rendered.
 *   - Fallback mode → the email form is rendered and the user can sign in
 *     with a local IndexedDB user (parity with `ng serve`).
 */
@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, InputTextModule, ButtonModule, MessageModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    })
  });

  readonly isSubmitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly isOnline = signal<boolean>(globalThis.navigator?.onLine !== false);

  /** Mirrors AuthService for template binding. */
  readonly modeResolved = this.authService.modeResolved;
  /** True when the local email fallback form may be displayed. */
  readonly showEmailFallback = computed(() => this.modeResolved() && !this.authService.oidcEnabled());
  /** True while we still wait for the server-side mode probe. */
  readonly isResolvingMode = computed(() => !this.modeResolved());
  /** True when OIDC is required and the browser can reach the server. */
  readonly showOidcRedirecting = computed(
    () => this.modeResolved() && this.authService.oidcEnabled() && this.isOnline()
  );
  /** True when OIDC is required but the browser is currently offline. */
  readonly showOfflineOidcWaiting = computed(
    () => this.modeResolved() && this.authService.oidcEnabled() && !this.isOnline()
  );

  constructor() {
    const handleOnline = () => this.isOnline.set(true);
    const handleOffline = () => this.isOnline.set(false);

    globalThis.addEventListener('online', handleOnline);
    globalThis.addEventListener('offline', handleOffline);

    this.destroyRef.onDestroy(() => {
      globalThis.removeEventListener('online', handleOnline);
      globalThis.removeEventListener('offline', handleOffline);
    });
  }

  /**
   * Whenever the resolved mode is OIDC, fire the G@IA prompt redirect.
   * Implemented as an effect so it triggers both on initial mount and if
   * the mode flips after a late probe response.
   */
  private readonly redirectEffect = effect(() => {
    if (this.showOidcRedirecting()) {
      this.redirectToOidcLogin();
    }
  });

  get emailControl(): FormControl<string> {
    return this.form.controls.email;
  }

  /**
   * Top-level navigation to the Apache `/auth/login` endpoint that triggers
   * the G@IA OIDC sign-in prompt. Extracted so it can be spied on in tests
   * (jsdom's `location.assign` is not configurable).
   */
  protected redirectToOidcLogin(): void {
    globalThis.location.assign(LOGIN_URL);
  }

  async onSubmit(): Promise<void> {
    // Defence in depth: the UI hides the form in OIDC mode but a malicious
    // submit must still be rejected client-side (and is rejected server-side
    // by AuthService.loginWithEmail).
    if (!this.showEmailFallback()) {
      return;
    }

    this.emailControl.setValue(this.emailControl.value.trim());

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    try {
      await this.authService.loginWithEmail(this.emailControl.value);
    } catch {
      this.submitError.set($localize`Login failed. Please try again.`);
      this.isSubmitting.set(false);
      return;
    }

    // Login succeeded — the user is now in IndexedDB and `currentUser` is set.
    // A failure of `router.navigate` (typically a lazy-chunk load error) must
    // NOT surface as "Login failed", because the user is actually authenticated.
    // In that case fall back to a full page reload so the freshly-cached user
    // is picked up cleanly by the auth guard.
    try {
      await this.router.navigate(['/']);
    } catch {
      this.reloadToHome();
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Force a full top-level navigation to the home page. Extracted so it can
   * be spied on in tests (jsdom's `location.assign` is not configurable).
   */
  protected reloadToHome(): void {
    globalThis.location.assign('/');
  }
}
