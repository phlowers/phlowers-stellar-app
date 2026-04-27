/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '@services/auth/auth.service';

/** Login page displayed when no OIDC session or cached user is available. */
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

  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    })
  });

  readonly isSubmitting = signal(false);
  readonly submitError = signal<string | null>(null);

  get emailControl(): FormControl<string> {
    return this.form.controls.email;
  }

  async onSubmit(): Promise<void> {
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
