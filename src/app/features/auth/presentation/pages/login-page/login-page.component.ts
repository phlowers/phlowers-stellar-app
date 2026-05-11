/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from '@angular/core';
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
export class LoginPageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    })
  });

  readonly isSubmitting = signal(false);
  readonly submitError = signal<string | null>(null);

  /** Mirrors AuthService for template binding. */
  readonly modeResolved = this.authService.modeResolved;
  /** True when the local email fallback form may be displayed. */
  readonly showEmailFallback = computed(() => this.modeResolved() && !this.authService.oidcEnabled());
  /** True while we still wait for the server-side mode probe. */
  readonly isResolvingMode = computed(() => !this.modeResolved());

  /**
   * Whenever the resolved mode is OIDC, fire the G@IA prompt redirect.
   * Implemented as an effect so it triggers both on initial mount and if
   * the mode flips after a late probe response.
   */
  private readonly redirectEffect = effect(() => {
    if (this.modeResolved() && this.authService.oidcEnabled()) {
      this.redirectToOidcLogin();
    }
  });

  get emailControl(): FormControl<string> {
    return this.form.controls.email;
  }

  ngOnInit(): void {
    // No-op: the redirect effect above handles the OIDC navigation as soon
    // as the mode is resolved. Kept for API stability and future hooks.
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
      await this.router.navigate(['/']);
    } catch {
      this.submitError.set($localize`Login failed. Please try again.`);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
